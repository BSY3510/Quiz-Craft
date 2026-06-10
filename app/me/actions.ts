'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

// 닉네임 변경(화이트리스트 컬럼만). profiles update가 nickname 컬럼으로 제한되므로
// role/status/xp는 건드릴 수 없다(SEC-C).
export async function updateNickname(nickname: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: '로그인이 필요합니다.' }

  const trimmed = nickname.trim()
  if (!trimmed) return { error: '닉네임을 입력해 주세요.' }

  const { error } = await supabase
    .from('profiles')
    .update({ nickname: trimmed })
    .eq('id', user.id)

  if (error) return { error: '닉네임 변경 중 오류가 발생했습니다.' }
  return { success: true }
}

export async function deactivateAccount() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: '로그인이 필요합니다.' }

  // status는 일반 사용자 update에서 회수되므로(SEC-C) 정의자 함수로 본인 계정만 비활성화.
  const { error } = await supabase.rpc('deactivate_my_account')

  if (error) return { error: '탈퇴 처리 중 오류가 발생했습니다.' }

  // 로그아웃 후 메인으로 이동
  await supabase.auth.signOut()
  redirect('/')
}
