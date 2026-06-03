'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addCategory(formData: FormData) {
  // ✅ await 추가됨
  const supabase = await createClient() 
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: '인증이 필요합니다.' }

  // 관리자 권한 검증
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return { error: '관리자 권한이 없습니다.' }
  }

  const id = formData.get('id') as string
  const name = formData.get('name') as string

  const { error } = await supabase
    .from('categories')
    .insert({
      id: id.toLowerCase().trim(),
      name: name.trim(),
      active: true
    })

  if (error) {
    return { error: '분야 추가 중 오류가 발생했습니다. (ID 중복 등)' }
  }

  revalidatePath('/admin-secret/categories')
  return { success: true }
}

export async function toggleCategoryStatus(categoryId: string, currentStatus: boolean) {
  // ✅ await 추가됨 (에러 발생 원인 해결)
  const supabase = await createClient() 
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '인증이 필요합니다.' }

  // 보안을 위한 관리자 권한 검증 추가
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return { error: '관리자 권한이 없습니다.' }
  }
  
  const { error } = await supabase
    .from('categories')
    .update({ active: !currentStatus })
    .eq('id', categoryId)

  if (error) {
    return { error: '상태 변경 중 오류가 발생했습니다.' }
  }

  revalidatePath('/admin-secret/categories')
  return { success: true }
}