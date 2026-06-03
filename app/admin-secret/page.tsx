import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import AdminQuizGenerator from './AdminQuizGenerator'

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/')

  const adminPath = `/admin-${process.env.NEXT_PUBLIC_ADMIN_PATH_SUFFIX || process.env.ADMIN_PATH_SUFFIX || 'secret'}`

  // ✅ 프롬프트 관리 메뉴 추가
  const ADMIN_MENUS = [
    { name: '📊 운영 대시보드', path: `${adminPath}/dashboard`, desc: '전체 지표 요약 및 문제 관리' },
    { name: '👥 통합 회원 관리', path: `${adminPath}/users`, desc: '가입 승인 및 전체 회원 상태 관리' },
    { name: '🚨 신고 내역 처리', path: `${adminPath}/reports`, desc: '사용자 접수 오류 확인 및 정정' },
    { name: '📚 퀴즈 분야 관리', path: `${adminPath}/categories`, desc: '학습 분야 추가, 수정, 삭제' },
    { name: '🤖 AI 완전 자동화', path: `${adminPath}/auto-pipeline`, desc: 'AI 대량 출제 파이프라인' },
    { name: '⚙️ 프롬프트 관리', path: `${adminPath}/prompt`, desc: 'AI 문제 출제 프롬프트 자유 수정' },
  ]

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <header className="flex justify-between items-end border-b border-slate-200 pb-6">
          <div>
            <h1 className="text-3xl font-black text-slate-800">관리자 센터</h1>
            <p className="text-slate-500 mt-2">콘텐츠 출제 및 운영 관리</p>
          </div>
          <Link href="/quiz" className="text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors bg-white px-4 py-2 rounded-lg border border-slate-200">
            사용자 화면 가기
          </Link>
        </header>

        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-4">바로가기</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ADMIN_MENUS.map(menu => (
              <Link key={menu.path} href={menu.path} className="bg-white p-5 rounded-xl border border-slate-200 hover:border-blue-500 hover:shadow-md transition-all group">
                <h3 className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{menu.name}</h3>
                <p className="text-sm text-slate-500 mt-1">{menu.desc}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="pt-8 border-t border-slate-200">
          <AdminQuizGenerator />
        </section>
      </div>
    </main>
  )
}