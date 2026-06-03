'use server'

import { createClient } from '@/utils/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { revalidatePath } from 'next/cache'

// 1. AI 문제 초안 생성 서버 액션 (DB 연동 동적 프롬프트 적용)
export async function generateQuizDraft(formData: FormData) {
  const supabase = await createClient() 
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { success: false, error: '인증이 필요합니다.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return { success: false, error: '관리자 권한이 없습니다.' }
  }

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

    // ✅ 사용자가 정의한 {{category}}와 {{count}} 변수 치환
    const systemPrompt = settings.system_prompt
      .replace(/{{category}}/g, categoryId)
      .replace(/{{count}}/g, count.toString())

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    const modelName = process.env.GEMINI_MODEL_VERSION || 'gemini-2.5-flash'
    
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: { responseMimeType: 'application/json' }
    })

    const result = await model.generateContent(systemPrompt)
    const responseText = result.response.text()
    const generatedQuestions = JSON.parse(responseText)

    return { success: true, data: generatedQuestions }
  } catch (error: any) {
    console.error('Gemini API Error:', error)

    const errorMessage = error.message?.toLowerCase() || ''
    const status = error.status || error.response?.status

    if (status === 429 || errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
      return { success: false, error: '🚨 무료 토큰 한도를 초과했거나 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.' }
    }

    if (status === 404 || errorMessage.includes('not found')) {
      return { success: false, error: '🚨 설정된 AI 모델(버전)을 찾을 수 없습니다. 환경변수를 확인해 주세요.' }
    }

    return { success: false, error: `문제 생성 중 오류가 발생했습니다: ${error.message || '알 수 없는 JSON 포맷 오류'}` }
  }
}

// 2. 검수 완료된 문제 DB 등록 서버 액션 (수정 없음)
export async function saveReviewedQuestions(questions: any[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { success: false, error: '인증이 필요합니다.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return { success: false, error: '관리자 권한이 없습니다.' }
  }

  try {
    const insertData = questions.map((q: any) => ({
      category_id: q.category_id,
      type: q.type || 'multiple-choice',
      question_text: q.question_text,
      code_snippet: q.code_snippet,
      options: q.options,
      answer_id: q.answer_id,
      explanation: q.explanation,
      status: 'active'
    }))

    const { error } = await supabase.from('questions').insert(insertData)

    if (error) throw error
    revalidatePath('/quiz') 
    
    return { success: true }
  } catch (error: any) {
    console.error('Save to DB Error:', error)
    return { success: false, error: 'DB 등록 중 오류가 발생했습니다.' }
  }
}