import { createClient } from '@/utils/supabase/server'
import LoginForm from './LoginForm'

export default async function LoginPage() {
  const supabase = await createClient()

  // 관리자 설정에서 구글 로그인 활성화 여부 불러오기
  const { data: settings } = await supabase.from('site_settings').select('google_login_enabled').eq('id', 1).single()
  const isGoogleEnabled = settings?.google_login_enabled || false

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-sm bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">QuizCraft</h1>
          <p className="text-slate-500 text-sm mt-2 font-medium">자투리 시간, 성장을 위한 퀴즈</p>
        </div>

        <LoginForm isGoogleEnabled={isGoogleEnabled} />
      </div>
    </main>
  )
}
