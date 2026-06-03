import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function HomePage() {
  // 최신 규격에 맞춰 await 사용 [cite: 121]
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 이미 로그인된 사용자는 즉시 퀴즈 대시보드로 이동시킵니다.
  if (user) {
    redirect('/quiz')
  }

  // 로그인하지 않은 사용자에게 보여줄 서비스 소개 및 진입 화면
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-slate-50">
      <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-sm border border-slate-200 text-center">
        <div className="text-6xl mb-4">🧩</div>
        <h1 className="text-4xl font-black text-slate-800 mb-4">QuizCraft</h1>
        <p className="text-slate-600 mb-8 leading-relaxed">
          자투리 시간을 활용해<br />
          원하는 프로그래밍 분야를 퀴즈로 학습해보세요!
        </p>
        <Link 
          href="/login"
          className="block w-full p-4 font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
        >
          시작하기 / 로그인
        </Link>
      </div>
    </main>
  )
}