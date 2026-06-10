'use server'

import { createClient } from '@/utils/supabase/server'
import { checkAdmin } from '@/utils/auth'
import { buildPrompt, normalizeList, normalizeAndValidate } from './questionSchema'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { revalidatePath } from 'next/cache'

// 1. AI 문제 초안 생성 서버 액션 (DB 연동 동적 프롬프트 적용)
export async function generateQuizDraft(formData: FormData) {
  const c = await checkAdmin()
  if (!c.ok) return { success: false, error: c.error }

  const supabase = await createClient()
  const categoryId = formData.get('category') as string
  const count = parseInt(formData.get('count') as string, 10) || 3

  try {
    // ✅ DB에서 저장된 시스템 프롬프트 불러오기
    const { data: settings } = await supabase
      .from('site_settings')
      .select('system_prompt')
      .eq('id', 1)
      .single()

    if (!settings || !settings.system_prompt) {
      return { success: false, error: '시스템 프롬프트가 설정되지 않았습니다. 관리자 페이지에서 프롬프트를 설정해주세요.' }
    }

    // ✅ 분야 이름·가이드 조회 후 마스터 프롬프트에 치환({{category}}/{{count}}/{{category_guide}})
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
    const modelName = process.env.GEMINI_MODEL_VERSION || 'gemini-2.5-flash'
    
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: { responseMimeType: 'application/json' }
    })

    const result = await model.generateContent(systemPrompt)
    const responseText = result.response.text()
    // ✅ snake_case/camelCase 어느 컨벤션이든 DB 컬럼 형태로 정규화(BUG-4)
    const generatedQuestions = normalizeList(JSON.parse(responseText))

    // 선택한 분야를 함께 반환해 저장 시 일괄 적용
    return { success: true, data: generatedQuestions, category: categoryId }
  } catch (error: unknown) {
    console.error('Gemini API Error:', error)

    const err = error as { message?: string; status?: number; response?: { status?: number } }
    const errorMessage = err.message?.toLowerCase() || ''
    const status = err.status || err.response?.status

    if (status === 429 || errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
      return { success: false, error: '🚨 무료 토큰 한도를 초과했거나 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.' }
    }

    if (status === 404 || errorMessage.includes('not found')) {
      return { success: false, error: '🚨 설정된 AI 모델(버전)을 찾을 수 없습니다. 환경변수를 확인해 주세요.' }
    }

    return { success: false, error: `문제 생성 중 오류가 발생했습니다: ${err.message || '알 수 없는 JSON 포맷 오류'}` }
  }
}

// 2. 검수 완료된 문제 DB 등록 서버 액션 (정규화·검증 + 분야 일괄 적용, BUG-4)
export async function saveReviewedQuestions(category: string, questions: unknown[]) {
  const c = await checkAdmin()
  if (!c.ok) return { success: false, error: c.error }

  if (!category) return { success: false, error: '분야가 지정되지 않았습니다.' }

  const checked = normalizeAndValidate(questions)
  if (!checked.ok) return { success: false, error: checked.error }

  try {
    const supabase = await createClient()
    const insertData = checked.questions.map((q) => ({
      category_id: category,
      type: q.type,
      question_text: q.question_text,
      code_snippet: q.code_snippet,
      options: q.options,
      answer_id: q.answer_id,
      explanation: q.explanation,
      status: 'active',
    }))

    const { error } = await supabase.from('questions').insert(insertData)

    if (error) throw error
    revalidatePath('/quiz')

    return { success: true }
  } catch (error: unknown) {
    console.error('Save to DB Error:', error)
    return { success: false, error: 'DB 등록 중 오류가 발생했습니다.' }
  }
}

// 3. 문제 수정 (대시보드/신고 화면 공용)
export async function updateQuestion(
  id: string,
  fields: { question_text: string; options: unknown; answer_id: string; explanation: string }
) {
  const c = await checkAdmin()
  if (!c.ok) return { error: c.error }

  const supabase = await createClient()
  const { error } = await supabase
    .from('questions')
    .update({
      question_text: fields.question_text,
      options: fields.options,
      answer_id: fields.answer_id,
      explanation: fields.explanation,
    })
    .eq('id', id)

  if (error) return { error: '문제 수정 중 오류가 발생했습니다.' }
  revalidatePath('/quiz')
  return { success: true }
}

// 4. 구글 로그인 토글 (site_settings)
export async function setGoogleLogin(enabled: boolean) {
  const c = await checkAdmin()
  if (!c.ok) return { error: c.error }

  const supabase = await createClient()
  const { error } = await supabase
    .from('site_settings')
    .update({ google_login_enabled: enabled })
    .eq('id', 1)

  if (error) return { error: '설정 변경 중 오류가 발생했습니다.' }
  return { success: true }
}

// 5. AI 시스템 프롬프트 저장 (site_settings)
export async function setSystemPrompt(prompt: string) {
  const c = await checkAdmin()
  if (!c.ok) return { error: c.error }

  const supabase = await createClient()
  const { error } = await supabase
    .from('site_settings')
    .update({ system_prompt: prompt })
    .eq('id', 1)

  if (error) return { error: '프롬프트 저장 중 오류가 발생했습니다.' }
  return { success: true }
}