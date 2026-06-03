'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export async function deactivateAccount() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: '로그인이 필요합니다.' }

  // 1. 프로필 상태를 'suspended'(또는 'deleted')로 변경하여 서비스 접근 차단
  const { error } = await supabase
    .from('profiles')
    .update({ status: 'suspended' })
    .eq('id', user.id)

  if (error) return { error: '탈퇴 처리 중 오류가 발생했습니다.' }

  // 2. 로그아웃 처리
  await supabase.auth.signOut()
  
  // 3. 메인 화면으로 이동
  redirect('/')
}