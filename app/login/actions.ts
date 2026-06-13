'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export type AuthState = { error: string } | null

// 약관 버전 — 동의 시점에 함께 기록해 두면 추후 약관 개정 시 재동의 대상 식별에 사용한다.
const TERMS_VERSION = '2026-06-11'
// Supabase 기본 정책과 맞춘 최소 비밀번호 길이
const MIN_PASSWORD_LENGTH = 8

export async function login(_prevState: AuthState, formData: FormData): Promise<AuthState> {
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

export async function signup(_prevState: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient()
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  // 필수 약관 동의 검증 (클라이언트 우회 방지를 위해 서버에서도 재검증)
  const agreedTerms = formData.get('agree_terms') === 'on'
  if (!agreedTerms) {
    return { error: '이용약관 및 개인정보 수집·이용에 동의해 주세요.' }
  }

  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return { error: `비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.` }
  }

  // 비밀번호 확인 일치 검증 (클라이언트 우회 방지를 위해 서버에서도 재검증)
  const confirm = formData.get('confirm') as string
  if (password !== confirm) {
    return { error: '비밀번호가 일치하지 않습니다.' }
  }

  // 가입 허용 이메일 도메인 제한 (관리자가 site_settings 에 화이트리스트를 지정한 경우만).
  // 빈 배열이면 제한 없음. 목록에 없는 도메인은 가입을 막고 다른 이메일을 안내한다.
  // ⚠️ 구글 OAuth 가입은 이 액션을 거치지 않으므로 적용되지 않는다.
  const { data: domainSetting } = await supabase
    .from('site_settings')
    .select('allowed_email_domains')
    .eq('id', 1)
    .single()
  const allowedDomains: string[] = Array.isArray(domainSetting?.allowed_email_domains)
    ? domainSetting.allowed_email_domains
    : []
  if (allowedDomains.length > 0) {
    const domain = (email?.split('@')[1] ?? '').trim().toLowerCase()
    const isAllowed = allowedDomains.some((d) => domain === String(d).trim().toLowerCase())
    if (!isAllowed) {
      return { error: `${allowedDomains.join(', ')} 이메일로만 가입할 수 있어요. 다른 이메일을 입력해 주세요.` }
    }
  }

  const marketingOptIn = formData.get('agree_marketing') === 'on'

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // 동의 시점·버전을 user_metadata에 기록 (별도 테이블/마이그레이션 불필요)
      data: {
        terms_agreed_at: new Date().toISOString(),
        terms_version: TERMS_VERSION,
        marketing_opt_in: marketingOptIn,
      },
    },
  })

  if (error) {
    return { error: '회원가입 처리 중 문제가 발생했습니다.' }
  }

  // 이메일 인증(Confirm email)이 켜져 있으면 세션이 생성되지 않는다.
  // → 인증 메일 확인을 안내. (계정 존재 여부를 노출하지 않도록 항상 동일 안내)
  if (!data.session) {
    redirect('/verify-email')
  }

  // 이메일 인증 없이 즉시 세션이 생긴 경우: SEC-05 승인 대기 안내로
  redirect('/pending')
}
