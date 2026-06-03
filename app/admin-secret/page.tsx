import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import AdminQuizGenerator from './AdminQuizGenerator'

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    redirect('/')
  }

  // ✅ 동적 관리자 경로 생성 (미들웨어 차단 방지용 핵심 코드)
  const adminPath = `/admin-${process.env.ADMIN_PATH_SUFFIX}`

  // 관리자 메뉴 목록 (하드코딩된 경로 대신 adminPath 변수 사용)
  const ADMIN_MENUS = [
    { name: '📊 운영 대시보드', path: `${adminPath}/dashboard`, desc: '전체 지표 요약' },
    { name: '👥 회원 가입 승인', path: `${adminPath}/users`, desc: '신규 사용자 승인 및 관리' },
    { name: '🚨 신고 내역 처리', path: `${adminPath}/reports`, desc: '사용자 접수 오류 확인' },
    { name: '📚 퀴즈 분야 관리', path: `${adminPath}/categories`, desc: '분야 추가 및 비활성화' },
    { name: '🤖 AI 완전 자동화', path: `${adminPath}/auto-pipeline`, desc: 'AI 대량 출제 파이프라인' },
  ]

  // ✅ 잃어버렸던 임시 토큰 데이터 부활 (추후 DB 연동 가능)
  const tokenStats = { used: 12500, limit: 1000000, remaining: 987500 }
  const isTokenDepleted = tokenStats.remaining < 1000

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* 헤더 영역 */}
        <header className="flex justify-between items-end border-b border-slate-200 pb-6">
          <div>
            <h1 className="text-3xl font-black text-slate-800">관리자 센터</h1>
            <p className="text-slate-500 mt-2">콘텐츠 출제 및 운영 관리</p>
          </div>
          
          <div className="flex items-end gap-4">
            {/* ✅ 토큰 잔량 UI 복구 */}
            <div className="text-right bg-white p-3 rounded-lg shadow-sm border border-slate-200 hidden sm:block">
              <p className="text-xs font-bold text-slate-400">이번 달 토큰 잔량</p>
              <p className={`text-lg font-black ${isTokenDepleted ? 'text-red-600' : 'text-blue-600'}`}>
                {tokenStats.remaining.toLocaleString()} <span className="text-sm font-medium text-slate-500">/ 1M</span>
              </p>
            </div>
            
            <Link href="/quiz" className="text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors bg-white px-4 py-2 rounded-lg border border-slate-200 h-fit mb-1">
              사용자 화면 가기
            </Link>
          </div>
        </header>

        {/* 네비게이션 메뉴 그리드 */}
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-4">바로가기</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ADMIN_MENUS.map(menu => (
              <Link 
                key={menu.path} 
                href={menu.path}
                className="bg-white p-5 rounded-xl border border-slate-200 hover:border-blue-500 hover:shadow-md transition-all group"
              >
                <h3 className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{menu.name}</h3>
                <p className="text-sm text-slate-500 mt-1">{menu.desc}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* AI 수동 문제 생성 컴포넌트 탑재 */}
        <section className="pt-8 border-t border-slate-200">
          <AdminQuizGenerator />
        </section>
      </div>
    </main>
  )
}