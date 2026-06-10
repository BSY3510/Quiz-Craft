import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function AdminHomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/')

  const adminPath = `/admin-${process.env.NEXT_PUBLIC_ADMIN_PATH_SUFFIX || process.env.ADMIN_PATH_SUFFIX || 'secret'}`

  // KPI 집계 (병렬). RLS상 관리자가 전체를 볼 수 있다.
  const [members, pending, questions, reportsPending] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('questions').select('*', { count: 'exact', head: true }),
    supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
  ])

  const KPIS = [
    { label: '총 회원', value: members.count ?? 0, href: `${adminPath}/users`, highlight: false },
    { label: '승인 대기', value: pending.count ?? 0, href: `${adminPath}/users`, highlight: (pending.count ?? 0) > 0 },
    { label: '총 문제', value: questions.count ?? 0, href: `${adminPath}/dashboard`, highlight: false },
    { label: '신고 대기', value: reportsPending.count ?? 0, href: `${adminPath}/reports`, highlight: (reportsPending.count ?? 0) > 0 },
  ]

  const ADMIN_MENUS = [
    { name: '📝 문제 관리', path: `${adminPath}/dashboard`, desc: '문제 목록·검색·수정·오답률' },
    { name: '✍️ AI 출제 (검수)', path: `${adminPath}/generate`, desc: 'AI 초안 생성 후 검수 등록' },
    { name: '🤖 AI 자동 출제', path: `${adminPath}/auto-pipeline`, desc: '대량 자동 출제 파이프라인' },
    { name: '⚙️ AI 프롬프트', path: `${adminPath}/prompt`, desc: '출제 프롬프트·분야 가이드' },
    { name: '📚 분야 관리', path: `${adminPath}/categories`, desc: '학습 분야 추가·수정·삭제' },
    { name: '👥 회원 관리', path: `${adminPath}/users`, desc: '가입 승인·계정 상태 관리' },
    { name: '🚨 신고 처리', path: `${adminPath}/reports`, desc: '오류 신고 확인·정정' },
    { name: '🛠️ 사이트 설정', path: `${adminPath}/settings`, desc: '구글 로그인 등 전역 설정' },
  ]

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
      <div className="max-w-4xl mx-auto space-y-8">

        <header className="flex justify-between items-end border-b border-slate-200 dark:border-slate-700 pb-6">
          <div>
            <h1 className="text-3xl font-black text-slate-800 dark:text-slate-100">관리자 센터</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2">서비스 현황 요약 및 운영 관리</p>
          </div>
          <Link href="/quiz" className="text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors bg-white px-4 py-2 rounded-lg border border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:text-slate-100">
            사용자 화면 가기
          </Link>
        </header>

        {/* KPI 요약 */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {KPIS.map((k) => (
            <Link
              key={k.label}
              href={k.href}
              className={`p-5 rounded-xl border transition-all hover:shadow-md ${
                k.highlight
                  ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-900/50'
                  : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700'
              }`}
            >
              <p className={`text-3xl font-black ${k.highlight ? 'text-amber-600 dark:text-amber-400' : 'text-slate-800 dark:text-slate-100'}`}>
                {k.value.toLocaleString()}
              </p>
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-1">{k.label}</p>
            </Link>
          ))}
        </section>

        {/* 바로가기 */}
        <section>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">바로가기</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ADMIN_MENUS.map(menu => (
              <Link key={menu.path} href={menu.path} className="bg-white p-5 rounded-xl border border-slate-200 hover:border-blue-500 hover:shadow-md transition-all group dark:bg-slate-800 dark:border-slate-700 dark:hover:border-blue-500">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{menu.name}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{menu.desc}</p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
