'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export type UpdateState = { error: string } | null

const MIN_PASSWORD_LENGTH = 8

export async function updatePassword(
  _prevState: UpdateState,
  formData: FormData
): Promise<UpdateState> {
  const password = formData.get('password') as string
  const confirm = formData.get('confirm') as string

  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return { error: `비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.` }
  }
  if (password !== confirm) {
    return { error: '두 비밀번호가 일치하지 않습니다.' }
  }

  const supabase = await createClient()

  // 재설정 링크로 생성된 세션이 있어야 비밀번호 변경이 가능하다.
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: '세션이 만료되었습니다. 비밀번호 재설정을 다시 요청해 주세요.' }
  }

  const { error } = await supabase.auth.updateUser({ password })
  if (error) {
    return { error: '비밀번호 변경 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.' }
  }

  // 변경 완료 후 메인으로 이동 (승인 상태에 따라 미들웨어가 적절히 라우팅)
  redirect('/')
}
