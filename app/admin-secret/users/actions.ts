'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateUserStatus(targetUserId: string, newStatus: 'approved' | 'rejected') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: '인증이 필요합니다.' }

  // 관리자 권한 재검증
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return { error: '관리자 권한이 없습니다.' }
  }

  // 대상 회원 상태 업데이트 (SEC-07)
  const { error } = await supabase
    .from('profiles')
    .update({ status: newStatus })
    .eq('id', targetUserId)

  if (error) {
    return { error: '상태 업데이트 중 오류가 발생했습니다.' }
  }

  revalidatePath('/admin-secret/users')
  return { success: true }
}