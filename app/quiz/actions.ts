'use server'

import { createClient } from '@/utils/supabase/server'

// 1번: 즐겨찾기 분야 저장(전체 배열을 받아 교체). profiles.favorite_categories 는
// 컬럼 GRANT + RLS(본인 행)로 보호됨.
export async function setFavoriteCategories(ids: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다.' }

  const clean = Array.isArray(ids) ? [...new Set(ids.filter((x) => typeof x === 'string'))].slice(0, 200) : []

  const { error } = await supabase
    .from('profiles')
    .update({ favorite_categories: clean })
    .eq('id', user.id)

  if (error) return { error: '즐겨찾기 저장 중 오류가 발생했습니다.' }
  return { success: true }
}

// 4번: 분야 신청 제출. 사용자가 작성, 관리자 승인 시 분야로 승격.
export async function submitCategoryRequest(input: {
  name: string
  description?: string
  groupId?: string | null
  reason?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다.' }

  const name = input.name?.trim()
  const description = input.description?.trim() || null
  if (!name) return { error: '분야명을 입력해 주세요.' }
  if (!description) return { error: '분야 설명을 입력해 주세요.' }

  const { error } = await supabase.from('category_requests').insert({
    user_id: user.id,
    name,
    description,
    group_id: input.groupId || null,
    reason: input.reason?.trim() || null,
    status: 'pending',
  })

  if (error) return { error: '신청 접수 중 오류가 발생했습니다.' }
  return { success: true }
}
