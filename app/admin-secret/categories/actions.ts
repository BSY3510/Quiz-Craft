'use server'

import { createClient } from '@/utils/supabase/server'
import { checkAdmin } from '@/utils/auth'
import { revalidatePath } from 'next/cache'

// 분야 생성
export async function createCategory(id: string, name: string) {
  const c = await checkAdmin()
  if (!c.ok) return { error: c.error }

  const cleanId = id.toLowerCase().trim()
  const cleanName = name.trim()
  if (!cleanId || !cleanName) return { error: '식별 ID와 분야명을 입력해 주세요.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('categories')
    .insert({ id: cleanId, name: cleanName, active: true })

  if (error) return { error: '분야 추가 중 오류가 발생했습니다. (ID 중복 등)' }
  revalidatePath('/quiz')
  return { success: true }
}

// 분야 활성/비활성 토글
export async function toggleCategoryActive(id: string, currentActive: boolean) {
  const c = await checkAdmin()
  if (!c.ok) return { error: c.error }

  const supabase = await createClient()
  const { error } = await supabase
    .from('categories')
    .update({ active: !currentActive })
    .eq('id', id)

  if (error) return { error: '상태 변경 중 오류가 발생했습니다.' }
  revalidatePath('/quiz')
  return { success: true }
}

// 분야 정보 수정 (분야명 + 분야별 출제 가이드 프롬프트 + 아이콘)
export async function updateCategory(id: string, name: string, prompt: string, icon?: string | null) {
  const c = await checkAdmin()
  if (!c.ok) return { error: c.error }

  const cleanName = name.trim()
  if (!cleanName) return { error: '분야명을 입력해 주세요.' }

  // 아이콘은 이모지 1~2자 정도만 의도 — 과도한 입력은 잘라낸다(빈 값이면 null=폴백)
  const cleanIcon = (icon ?? '').trim().slice(0, 8) || null

  const supabase = await createClient()
  const { error } = await supabase
    .from('categories')
    .update({ name: cleanName, prompt: prompt?.trim() || null, icon: cleanIcon })
    .eq('id', id)

  if (error) return { error: '수정 중 오류가 발생했습니다.' }
  revalidatePath('/quiz')
  return { success: true }
}

// 분야 삭제
export async function deleteCategory(id: string) {
  const c = await checkAdmin()
  if (!c.ok) return { error: c.error }

  const supabase = await createClient()
  const { error } = await supabase.from('categories').delete().eq('id', id)

  if (error) return { error: '삭제 실패: 데이터베이스 제약 조건 또는 오류가 발생했습니다.' }
  revalidatePath('/quiz')
  return { success: true }
}
