'use server'

import { createClient } from '@/utils/supabase/server'

export async function submitReport(questionId: string, reason: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { success: false, error: '로그인이 필요한 기능입니다.' }

  if (!reason.trim()) {
    return { success: false, error: '신고 사유를 입력해 주세요.' }
  }

  try {
    const { error } = await supabase
      .from('reports')
      .insert({
        question_id: questionId,
        user_id: user.id,
        reason: reason.trim(),
        status: 'pending' // 기본 처리 상태: 대기 중
      })

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Report submission error:', error)
    return { success: false, error: '신고 접수 중 오류가 발생했습니다. 다시 시도해 주세요.' }
  }
}