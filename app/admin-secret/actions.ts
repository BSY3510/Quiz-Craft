'use server'

import { createClient } from '@/utils/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { revalidatePath } from 'next/cache'

// 1. AI 문제 초안 생성 서버 액션 (오류 감지 및 안전한 실패 처리 포함)
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
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    const modelName = process.env.GEMINI_MODEL_VERSION || 'gemini-2.5-flash'
    
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: { responseMimeType: 'application/json' }
    })

    const systemPrompt = `
      당신은 프로그래밍 퀴즈 출제자입니다.
      분야: ${categoryId}
      출제 문항 수: ${count}개

      반드시 아래 JSON 배열 형식으로만 응답하세요.
      [
        {
          "category_id": "${categoryId}",
          "type": "multiple-choice",
          "question_text": "문제 내용",
          "code_snippet": "필요시 코드 작성, 없으면 null",
          "options": [
            { "id": "1", "text": "보기1" },
            { "id": "2", "text": "보기2" },
            { "id": "3", "text": "보기3" },
            { "id": "4", "text": "보기4" }
          ],
          "answer_id": "정답의 id값",
          "explanation": "해설 내용"
        }
      ]
    `

    const result = await model.generateContent(systemPrompt)
    const responseText = result.response.text()
    const generatedQuestions = JSON.parse(responseText)

    return { success: true, data: generatedQuestions }
  } catch (error: any) {
    console.error('Gemini API Error:', error)

    const errorMessage = error.message?.toLowerCase() || ''
    const status = error.status || error.response?.status

    // 1. 토큰 한도 초과 또는 요청 빈도 초과 에러 (HTTP 429)
    if (status === 429 || errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
      return { 
        success: false, 
        error: '🚨 무료 토큰 한도를 초과했거나 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.' 
      }
    }

    // 2. 모델 이름 오류 또는 권한 오류 (HTTP 404, 403)
    if (status === 404 || errorMessage.includes('not found')) {
      return { 
        success: false, 
        error: '🚨 설정된 AI 모델(버전)을 찾을 수 없습니다. 환경변수(GEMINI_MODEL_VERSION)를 확인해 주세요.' 
      }
    }

    // 3. 기타 알 수 없는 구글 서버 오류 및 JSON 파싱 오류
    return { 
      success: false, 
      error: `문제 생성 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}` 
    }
  }
}

// 2. 검수 완료된 문제 DB 등록 서버 액션
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