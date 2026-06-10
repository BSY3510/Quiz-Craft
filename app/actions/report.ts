'use server'

import { createClient } from '@/utils/supabase/server'

export async function submitReport(questionId: string, reason: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { success: false, error: '로그인이 필요한 기능입니다.' }

  const trimmed = reason.trim()
  if (!trimmed) {
    return { success: false, error: '신고 사유를 입력해 주세요.' }
  }
  if (trimmed.length < 5) {
    return { success: false, error: '신고 사유를 조금 더 자세히 작성해 주세요. (5자 이상)' }
  }
  if (trimmed.length > 500) {
    return { success: false, error: '신고 사유는 500자 이내로 작성해 주세요.' }
  }

  try {
    // 동일 문제에 대한 중복 신고(대기 중) 방지 — 스팸/도배 완화
    const { data: dup } = await supabase
      .from('reports')
      .select('id')
      .eq('user_id', user.id)
      .eq('question_id', questionId)
      .eq('status', 'pending')
      .limit(1)

    if (dup && dup.length > 0) {
      return { success: false, error: '이미 접수된 신고가 검토 중입니다.' }
    }

    const { error } = await supabase
      .from('reports')
      .insert({
        question_id: questionId,
        user_id: user.id,
        reason: trimmed,
        status: 'pending' // 기본 처리 상태: 대기 중
      })

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Report submission error:', error)
    return { success: false, error: '신고 접수 중 오류가 발생했습니다. 다시 시도해 주세요.' }
  }
}