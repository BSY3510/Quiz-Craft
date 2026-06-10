'use server'

import { createClient } from '@/utils/supabase/server'
import { checkAdmin } from '@/utils/auth'
import { buildPrompt, normalizeAndValidate, buildValidationPrompt, parseValidation, parseJsonLoose } from '../questionSchema'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { revalidatePath } from 'next/cache'

export async function runAutoPipeline(categoryId: string, count: number) {
  const c = await checkAdmin()
  if (!c.ok) return { error: c.error }

  const supabase = await createClient()

  // ✅ 반자동과 동일한 마스터 프롬프트 + 분야 가이드 + 모델 사용(경로 통일)
  const { data: settings } = await supabase
    .from('site_settings')
    .select('system_prompt, gemini_model')
    .eq('id', 1)
    .single()

  if (!settings?.system_prompt) {
    return { error: '시스템 프롬프트가 설정되지 않았습니다. 프롬프트 관리에서 설정해주세요.' }
  }

  const { data: cat } = await supabase
    .from('categories')
    .select('name, prompt')
    .eq('id', categoryId)
    .single()

  const systemPrompt = buildPrompt(settings.system_prompt, {
    categoryName: cat?.name || categoryId,
    count,
    guide: cat?.prompt || '',
  })

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  const model = genAI.getGenerativeModel({
    model: settings.gemini_model || process.env.GEMINI_MODEL_VERSION || 'gemini-3.1-flash-lite',
    generationConfig: { responseMimeType: 'application/json' }
  })

  try {
    const result = await model.generateContent(systemPrompt)
    const responseText = result.response.text()

    // ✅ 1차: 구조 정규화·검증(BUG-4) — 무효 형식은 DB 오염 없이 거부
    const checked = normalizeAndValidate(parseJsonLoose(responseText))
    if (!checked.ok) {
      return { error: `생성 결과 검증 실패: ${checked.error}` }
    }

    // ✅ 2차: 독립 AI 호출로 내용 검수(정답 정확성·복수정답·명확성).
    //    실패 시 안전하게 전부 검증 큐(pending_review)로 보낸다.
    let validFlags: boolean[]
    try {
      const valResult = await model.generateContent(buildValidationPrompt(checked.questions))
      validFlags = parseValidation(parseJsonLoose(valResult.response.text()), checked.questions.length)
    } catch (e) {
      console.error('AI validation failed:', e)
      validFlags = new Array(checked.questions.length).fill(false)
    }

    const insertData = checked.questions.map((q, i) => ({
      category_id: categoryId,
      type: q.type,
      question_text: q.question_text,
      code_snippet: q.code_snippet,
      options: q.options,
      answer_id: q.answer_id,
      explanation: q.explanation,
      // ✅ AI 검증 통과분은 즉시 노출(active), 그 외는 검증 큐(pending_review)로 보류
      status: validFlags[i] ? 'active' : 'pending_review',
    }))

    const { error } = await supabase.from('questions').insert(insertData)

    if (error) throw error

    revalidatePath('/quiz')
    revalidatePath('/admin-secret')

    const approvedCount = validFlags.filter(Boolean).length
    const queuedCount = insertData.length - approvedCount
    return { success: true, insertedCount: insertData.length, approvedCount, queuedCount }
  } catch (error) {
    console.error('Auto Pipeline Error:', error)
    return { error: '자동화 파이프라인 실행 중 오류가 발생했습니다.' }
  }
}