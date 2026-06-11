'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export type ResetState = { error: string } | { sent: true } | null
export type VerifyState = { error: string } | null

// 1단계: 재설정 코드(OTP) 메일 발송 요청
export async function requestPasswordReset(
  _prevState: ResetState,
  formData: FormData
): Promise<ResetState> {
  const email = formData.get('email') as string

  if (!email) {
    return { error: '이메일 주소를 입력해 주세요.' }
  }

  const supabase = await createClient()
  // 복구 메일 발송. 이메일 템플릿에 {{ .Token }}(6자리 코드)가 포함되어 있어야 한다.
  await supabase.auth.resetPasswordForEmail(email)

  // SEC-03 일관성: 계정 존재 여부를 노출하지 않도록 항상 동일한 성공 응답을 반환한다.
  return { sent: true }
}

// 2단계: 메일로 받은 6자리 코드 검증 → 임시 세션 생성 후 새 비밀번호 화면으로 이동
export async function verifyResetCode(
  _prevState: VerifyState,
  formData: FormData
): Promise<VerifyState> {
  const email = formData.get('email') as string
  const token = ((formData.get('token') as string) ?? '').replace(/\s/g, '')

  if (!email || !token) {
    return { error: '인증 코드를 입력해 주세요.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({ email, token, type: 'recovery' })

  if (error) {
    return { error: '인증 코드가 올바르지 않거나 만료되었습니다. 다시 확인해 주세요.' }
  }

  // 코드 검증 성공 → 세션이 생성되었으므로 새 비밀번호 설정 화면으로 이동
  redirect('/reset-password/update')
}
