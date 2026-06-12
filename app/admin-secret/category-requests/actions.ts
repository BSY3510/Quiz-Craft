'use server'

import { createClient } from '@/utils/supabase/server'
import { checkAdmin } from '@/utils/auth'
import { revalidatePath } from 'next/cache'

// 4번: 분야 신청 승인 → categories 생성(active) + 신청 상태 approved.
export async function approveCategoryRequest(
  requestId: string,
  fields: { id: string; name: string; description?: string | null; groupId?: string | null; prompt?: string | null }
) {
  const c = await checkAdmin()
  if (!c.ok) return { error: c.error }

  const cleanId = fields.id.toLowerCase().trim()
  const cleanName = fields.name.trim()
  if (!cleanId || !cleanName) return { error: '식별 ID와 분야명을 입력해 주세요.' }

  const supabase = await createClient()
  // 1) 분야 생성(자동 출제 대상에도 자연 편입 — active=true)
  const { error: insErr } = await supabase.from('categories').insert({
    id: cleanId,
    name: cleanName,
    active: true,
    description: fields.description?.trim() || null,
    group_id: fields.groupId || null,
    prompt: fields.prompt?.trim() || null,
  })
  if (insErr) return { error: '분야 생성 실패: 식별 ID 중복 등 오류가 발생했습니다.' }

  // 2) 신청 승인 처리
  const { error: updErr } = await supabase
    .from('category_requests')
    .update({ status: 'approved' })
    .eq('id', requestId)
  if (updErr) return { error: '분야는 생성됐으나 신청 상태 갱신에 실패했습니다.' }

  revalidatePath('/quiz')
  revalidatePath('/admin-secret')
  return { success: true }
}

// 신청 반려(사유 회신용 메모 저장).
export async function rejectCategoryRequest(requestId: string, note: string) {
  const c = await checkAdmin()
  if (!c.ok) return { error: c.error }

  const supabase = await createClient()
  const { error } = await supabase
    .from('category_requests')
    .update({ status: 'rejected', admin_note: note?.trim() || null })
    .eq('id', requestId)
  if (error) return { error: '반려 처리 중 오류가 발생했습니다.' }

  revalidatePath('/admin-secret')
  return { success: true }
}
