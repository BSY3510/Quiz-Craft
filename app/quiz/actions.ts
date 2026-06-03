'use server'

import { createClient } from '@/utils/supabase/server'

export async function saveAttempt(questionId: string, selectedOptionId: string, isCorrect: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: '로그인이 필요한 기능입니다.' }

  // 1. 기존 풀이 이력 확인 (처음 푸는 문제인지, 다시 푸는 문제인지 검사)
  const { data: previousAttempts } = await supabase
    .from('attempts')
    .select('id')
    .eq('user_id', user.id)
    .eq('question_id', questionId)
    .limit(1)

  const isRetry = previousAttempts && previousAttempts.length > 0

  // 2. 새로운 Attempt 기록 저장
  const { error: attemptError } = await supabase
    .from('attempts')
    .insert({
      user_id: user.id,
      question_id: questionId,
      selected_option_id: selectedOptionId,
      is_correct: isCorrect,
    })

  if (attemptError) return { error: '풀이 기록 저장 실패' }

  // 3. 정답일 경우 게이미피케이션(XP 및 스트릭) 업데이트 처리 [cite: 239, 240]
  if (isCorrect) {
    const today = new Date().toISOString().split('T')[0] 

    const { data: profile } = await supabase
      .from('profiles')
      .select('xp, current_streak, last_active_date')
      .eq('id', user.id)
      .single()

    if (profile) {
      let newStreak = profile.current_streak
      
      // ✅ 요구사항 반영: 새로운 문제는 10 XP, 다시 푸는 문제는 5 XP 부여
      let newXp = profile.xp + (isRetry ? 5 : 10)

      if (profile.last_active_date !== today) {
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayStr = yesterday.toISOString().split('T')[0]

        if (profile.last_active_date === yesterdayStr) {
          newStreak += 1
          // 스트릭 보너스 추가
          newXp += Math.min(newStreak * 2, 20) 
        } else {
          newStreak = 1
        }
      }

      await supabase
        .from('profiles')
        .update({
          xp: newXp,
          current_streak: newStreak,
          last_active_date: today
        })
        .eq('id', user.id)
    }
  }

  return { success: true }
}