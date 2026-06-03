import { createClient } from '@/utils/supabase/server'
import { login, signup } from './actions'

export default async function LoginPage() {
  const supabase = await createClient()
  
  // 관리자 설정에서 구글 로그인 활성화 여부 불러오기
  const { data: settings } = await supabase.from('site_settings').select('google_login_enabled').eq('id', 1).single()
  const isGoogleEnabled = settings?.google_login_enabled || false

  // ✅ TypeScript 에러(반환 타입 불일치)를 해결하기 위한 래퍼(Wrapper) 함수
  const handleLogin = async (formData: FormData) => {
    'use server'
    await login(formData)
  }

  const handleSignup = async (formData: FormData) => {
    'use server'
    await signup(formData)
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-sm bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">QuizCraft</h1>
          <p className="text-slate-500 text-sm mt-2 font-medium">자투리 시간, 성장을 위한 퀴즈</p>
        </div>

        <div className="space-y-6">
          <div className="flex flex-col gap-3">
            {isGoogleEnabled ? (
              <form action="/auth/google" method="post">
                <button className="w-full flex items-center justify-center gap-3 p-4 bg-white text-slate-700 font-bold rounded-xl border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Google로 계속하기
                </button>
              </form>
            ) : (
              <button disabled className="w-full flex items-center justify-center gap-3 p-4 bg-slate-100 text-slate-400 font-bold rounded-xl cursor-not-allowed border border-slate-200">
                Google 로그인 (현재 비활성화됨)
              </button>
            )}
          </div>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-bold">또는 이메일로</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          <form className="space-y-4">
            <div>
              <label className="sr-only" htmlFor="email">이메일</label>
              <input id="email" name="email" type="email" placeholder="이메일 주소" required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-800" />
            </div>
            <div>
              <label className="sr-only" htmlFor="password">비밀번호</label>
              <input id="password" name="password" type="password" placeholder="비밀번호" required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-800" />
            </div>
            
            <div className="flex gap-3 pt-2">
              {/* ✅ 래퍼 함수(handleLogin, handleSignup)를 연결 */}
              <button formAction={handleLogin} className="flex-1 p-4 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition-colors shadow-sm">
                로그인
              </button>
              <button formAction={handleSignup} className="flex-1 p-4 bg-white text-slate-700 font-bold rounded-xl border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-sm">
                가입하기
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  )
}