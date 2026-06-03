'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateReportStatus(reportId: string, newStatus: 'resolved' | 'dismissed') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: '인증이 필요합니다.' }

  // 관리자 권한 검증 (SEC-09)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return { error: '관리자 권한이 없습니다.' }
  }

  const { error } = await supabase
    .from('reports')
    .update({ status: newStatus })
    .eq('id', reportId)

  if (error) {
    return { error: '상태 업데이트 중 오류가 발생했습니다.' }
  }

  revalidatePath('/admin-secret/reports')
  return { success: true }
}