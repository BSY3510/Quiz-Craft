'use server'

import { createClient } from '@/utils/supabase/server'
import { checkAdmin } from '@/utils/auth'
import { buildPrompt, normalizeAndValidate } from '../questionSchema'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { revalidatePath } from 'next/cache'

export async function runAutoPipeline(categoryId: string, count: number) {
  const c = await checkAdmin()
  if (!c.ok) return { error: c.error }

  const supabase = await createClient()

  // ✅ 반자동과 동일한 마스터 프롬프트 + 분야 가이드 사용(경로 통일)
  const { data: settings } = await supabase
    .from('site_settings')
    .select('system_prompt')
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
    model: process.env.GEMINI_MODEL_VERSION || 'gemini-2.5-flash',
    generationConfig: { responseMimeType: 'application/json' }
  })

  try {
    const result = await model.generateContent(systemPrompt)
    const responseText = result.response.text()

    // ✅ 정규화·검증(BUG-4): 무효한 문제는 DB 오염 없이 거부
    const checked = normalizeAndValidate(JSON.parse(responseText))
    if (!checked.ok) {
      return { error: `생성 결과 검증 실패: ${checked.error}` }
    }

    const insertData = checked.questions.map((q) => ({
      category_id: categoryId,
      type: q.type,
      question_text: q.question_text,
      code_snippet: q.code_snippet,
      options: q.options,
      answer_id: q.answer_id,
      explanation: q.explanation,
      status: 'active', // 사람의 검수 없이 즉시 활성화 (검증 큐는 Phase 8)
    }))

    const { error } = await supabase.from('questions').insert(insertData)

    if (error) throw error

    revalidatePath('/quiz')
    return { success: true, insertedCount: insertData.length }
  } catch (error) {
    console.error('Auto Pipeline Error:', error)
    return { error: '자동화 파이프라인 실행 중 오류가 발생했습니다.' }
  }
}