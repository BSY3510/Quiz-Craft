'use server'

import { createClient } from '@/utils/supabase/server'
import { checkAdmin } from '@/utils/auth'
import { revalidatePath } from 'next/cache'

const ALLOWED = ['pending', 'resolved', 'dismissed']

export async function updateReportStatus(reportId: string, newStatus: string) {
  const c = await checkAdmin()
  if (!c.ok) return { error: c.error }

  if (!ALLOWED.includes(newStatus)) return { error: '잘못된 상태값입니다.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('reports')
    .update({ status: newStatus })
    .eq('id', reportId)

  if (error) return { error: '상태 업데이트 중 오류가 발생했습니다.' }

  revalidatePath('/admin-secret/reports')
  return { success: true }
}
