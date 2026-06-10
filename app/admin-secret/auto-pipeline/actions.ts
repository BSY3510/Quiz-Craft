'use server'

import { createClient } from '@/utils/supabase/server'
import { checkAdmin } from '@/utils/auth'
import { normalizeAndValidate } from '../questionSchema'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { revalidatePath } from 'next/cache'

export async function runAutoPipeline(categoryId: string, count: number) {
  const c = await checkAdmin()
  if (!c.ok) return { error: c.error }

  const supabase = await createClient()

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL_VERSION || 'gemini-2.5-flash',
    generationConfig: { responseMimeType: 'application/json' }
  })

  // 자가 검증(Self-Validation)을 강제하는 프롬프트 적용
  const systemPrompt = `
  당신은 프로그래밍 퀴즈 출제자이자 엄격한 검수자입니다.
  분야: ${categoryId}
  출제 문항 수: ${count}개

  [필수 검증 로직]
  1. 문제를 출제한 후, 정답이 기술적으로 완벽히 정확한지 스스로 교차 검증하세요.
  2. 선택지 중에 복수 정답이나 논란의 여지가 있는 내용이 있다면 즉시 파기하고 다시 만드세요.
  3. 해설(explanation)은 정답인 이유와 오답인 이유를 명확히 포함해야 합니다.

  반드시 아래 JSON 배열 형식으로만 응답하세요.
  [
    {
      "type": "multiple-choice",
      "question": "문제 내용",
      "codeSnippet": "필요시 코드 작성, 없으면 null",
      "options": [
        { "id": "1", "text": "보기1" },
        { "id": "2", "text": "보기2" }
      ],
      "answerId": "정답의 id값",
      "explanation": "해설 내용"
    }
  ]
  `

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