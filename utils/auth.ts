// 공용 인증·인가 헬퍼 (Phase 0 스캐폴드 — 아직 페이지/액션에 연결 전)
//
// Next.js 16 권장 패턴(Data Access Layer)을 따른다:
//   - 인가 로직을 한 곳에 모아 데이터 소스에 가깝게 검증한다.
//   - React `cache()`로 같은 렌더/요청 패스 내 중복 호출을 메모이즈한다.
// 참고: node_modules/next/dist/docs/01-app/02-guides/authentication.md (#creating-a-data-access-layer-dal)
//
// TODO(Phase 1): `server-only` 패키지 설치 후 최상단에 `import 'server-only'` 추가.
//   현재는 `next/headers`(cookies)를 쓰는 createClient에 의존하므로 클라이언트에서 import 시
//   자연히 에러가 나 사실상 서버 전용이지만, 명시적 가드를 위해 추가 권장.
//
// 사용 패턴(Phase 1에서 연결):
//   - 서버 컴포넌트/페이지: 실패 시 redirect 하는 requireUser()/requireAdmin() 사용.
//   - 서버 액션({ error } 반환 스타일): 비-redirect 헬퍼 getCurrentUser()/checkAdmin() 사용.

import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import type { User } from '@supabase/supabase-js'

export type AdminContext = { user: User; role: string }

/**
 * 현재 로그인 사용자를 반환하거나, 없으면 /login으로 redirect.
 * 서버 컴포넌트·페이지에서 사용.
 */
export const requireUser = cache(async (): Promise<User> => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return user
})

/**
 * 관리자 권한을 강제한다. 미인증이면 /login, 비관리자면 /로 redirect.
 * 관리자 전용 서버 컴포넌트·페이지에서 사용.
 */
export const requireAdmin = cache(async (): Promise<AdminContext> => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/')
  return { user, role: profile.role as string }
})

/**
 * 현재 사용자 반환(없으면 null). redirect 하지 않는다.
 * { error } 를 반환해야 하는 서버 액션에서 사용.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user ?? null
})

/**
 * 관리자 여부를 검사해 결과 객체로 반환(redirect 하지 않음).
 * 서버 액션에서 `const c = await checkAdmin(); if (!c.ok) return { error: c.error }` 형태로 사용.
 */
export const checkAdmin = cache(async (): Promise<
  | { ok: true; user: User; role: string }
  | { ok: false; error: string }
> => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: '인증이 필요합니다.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') return { ok: false, error: '관리자 권한이 없습니다.' }
  return { ok: true, user, role: profile.role as string }
})
