import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Next.js 15+ 환경에 맞춰 비동기(async) 함수로 변경되었습니다.
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch (error) {
            // Server Component 렌더링 중에는 쿠키를 설정할 수 없습니다.
            // 미들웨어(middleware.ts)에서 세션 쿠키 관리를 병행하고 있으므로 
            // 이곳에서 발생하는 에러는 안전하게 무시할 수 있습니다.
          }
        },
      },
    }
  )
}