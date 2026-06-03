import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  // 1. 응답 객체 초기화
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // 2. Supabase 클라이언트 생성 (최신 getAll / setAll 방식 적용)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  if (user && pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/quiz', request.url))
  }

  // 3. 관리자 경로 난독화 검증 및 라우팅 (SEC-11)
  const ADMIN_PREFIX = `/admin-${process.env.ADMIN_PATH_SUFFIX}`
  
  if (pathname.startsWith('/admin-')) {
    // 환경변수에 설정된 경로와 일치하지 않으면 메인으로 강제 이동
    if (!pathname.startsWith(ADMIN_PREFIX)) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    // 관리자 권한(Role) 검사
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'admin') {
        return NextResponse.redirect(new URL('/', request.url))
      }

      // ✅ 권한이 확인되면, 미들웨어에서 직접 실제 폴더(/admin-secret)로 연결(Rewrite)
      const newPath = pathname.replace(ADMIN_PREFIX, '/admin-secret')
      const rewriteUrl = new URL(newPath, request.url)
      const rewriteResponse = NextResponse.rewrite(rewriteUrl)

      // 미들웨어가 갱신한 세션 쿠키가 날아가지 않도록 복사하여 유지
      response.cookies.getAll().forEach(cookie => {
        rewriteResponse.cookies.set(cookie.name, cookie.value)
      })

      return rewriteResponse
    } else {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // 4. 보호된 라우트(승인 게이트) 검증 (SEC-05, SEC-06)
  const protectedRoutes = ['/quiz', '/stats', '/me']
  if (protectedRoutes.some(route => pathname.startsWith(route))) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('status')
      .eq('id', user.id)
      .single()

    // 상태가 'pending'인 사용자는 승인 대기 화면으로 이동
    if (profile?.status === 'pending') {
      return NextResponse.redirect(new URL('/pending', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * 모든 요청 경로와 일치시키되 다음은 제외:
     * - _next/static (정적 파일)
     * - _next/image (이미지 최적화 파일)
     * - favicon.ico (파비콘)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}