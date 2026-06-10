'use server'

import { createClient } from '@/utils/supabase/server'

// 서버 권위 채점(SEC-A/B/E/F): 클라이언트는 (questionId, selectedOptionId)만 보낸다.
// 정답 비교·기록·원자적 XP 적립·파밍 차단·KST 스트릭은 DB 함수 grade_and_award가 처리.
export async function submitAnswer(questionId: string, selectedOptionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: '로그인이 필요한 기능입니다.' }

  const { data, error } = await supabase.rpc('grade_and_award', {
    p_question_id: questionId,
    p_selected_option_id: selectedOptionId,
  })

  if (error || !data) {
    console.error('grade_and_award error:', error)
    return { error: '채점 처리 중 오류가 발생했습니다.' }
  }

  // data: { is_correct, answer_id, explanation, xp_awarded } (제출 후이므로 정답 노출 안전)
  return {
    isCorrect: Boolean(data.is_correct),
    answerId: String(data.answer_id),
    explanation: String(data.explanation ?? ''),
    xpAwarded: Number(data.xp_awarded ?? 0),
  }
}
