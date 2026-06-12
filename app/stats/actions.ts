'use server'

import { createClient } from '@/utils/supabase/server'

// 9-1 월간 목표 설정/해제. profiles.monthly_goal 은 컬럼 GRANT + RLS(본인 행)로 보호됨.
export async function setMonthlyGoal(goal: number | null) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다.' }

  const clean =
    goal === null ? null : Math.min(100000, Math.max(1, Math.floor(Number(goal)) || 0)) || null

  const { error } = await supabase
    .from('profiles')
    .update({ monthly_goal: clean })
    .eq('id', user.id)

  if (error) return { error: '목표 저장 중 오류가 발생했습니다.' }
  return { success: true }
}
