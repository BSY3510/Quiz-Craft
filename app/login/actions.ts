'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  
  if (error) {
    // SEC-03: 계정 존재 여부를 노출하지 않는 일반화된 에러 메시지 반환
    return { error: '이메일 또는 비밀번호를 확인해주세요.' }
  }
  
  redirect('/')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signUp({ email, password })
  
  if (error) {
    return { error: '회원가입 처리 중 문제가 발생했습니다.' }
  }
  
  // SEC-05: 신규 가입자는 'pending' 상태이므로 승인 대기 안내 페이지로 리다이렉트
  redirect('/pending')
}