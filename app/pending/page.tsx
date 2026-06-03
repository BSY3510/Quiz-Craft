import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

// 로그아웃 처리를 위한 서버 액션
async function signOut() {
  'use server'
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export default async function PendingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 승인 상태 재확인 (혹시 이미 승인되었다면 메인/퀴즈로 이동)
  const { data: profile } = await supabase
    .from('profiles')
    .select('status')
    .eq('id', user.id)
    .single()

  if (profile?.status === 'approved') {
    redirect('/quiz')
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-slate-50">
      <div className="w-full max-w-sm p-8 bg-white rounded-xl shadow-sm border border-slate-100 text-center">
        <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">승인 대기 중입니다</h1>
        <p className="text-slate-600 mb-6 text-sm">
          관리자의 가입 승인 후 퀴즈 서비스를 이용하실 수 있습니다.<br />
          조금만 기다려 주세요!
        </p>
        <form action={signOut}>
          <button 
            type="submit"
            className="text-slate-500 text-sm underline hover:text-slate-700"
          >
            다른 계정으로 로그인하기
          </button>
        </form>
      </div>
    </main>
  )
}