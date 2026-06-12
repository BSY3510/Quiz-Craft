export const dynamic = 'force-dynamic' // 캐시 무효화: 닉네임 변경 즉시 반영

import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { CategoryList } from './CategoryList'
import OnboardingTour from './OnboardingTour'
import LevelBanner from './LevelBanner'
import DailyMissions from './DailyMissions'

export default async function QuizDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // ✅ profile 객체에서 nickname과 role을 정상적으로 가져옵니다.
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, xp, current_streak, nickname')
    .eq('id', user.id)
    .single()

  // ✅ 닉네임이 설정되어 있다면 닉네임을, 없다면 이메일 앞자리를 사용합니다.
  const displayName = profile?.nickname || user.email?.split('@')[0] || '학습자'

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, icon, description')
    .eq('active', true)
    .order('created_at', { ascending: true })

  const adminPath = `/admin-${process.env.NEXT_PUBLIC_ADMIN_PATH_SUFFIX || process.env.ADMIN_PATH_SUFFIX || 'secret'}`

  return (
    <main className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-900 md:items-center">
      <div className="w-full max-w-md p-4 pt-8 space-y-6">

        {/* 헤더 및 유저 메뉴 */}
        <header className="flex items-start justify-between">
          <div>
            {/* ✅ 수정된 displayName 변수 적용 */}
            <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100">
              반갑습니다, {displayName}님! 👋
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">오늘도 지식을 쌓아볼까요?</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-2">
              {/* 관리자 여부 확인 후 버튼 렌더링 */}
              {profile?.role === 'admin' && (
                <Link href={adminPath} className="whitespace-nowrap px-3 py-1.5 bg-slate-800 text-white text-sm font-bold rounded-lg hover:bg-slate-900 transition-colors shadow-sm dark:bg-slate-700 dark:hover:bg-slate-600">
                  관리자 센터
                </Link>
              )}
              <Link href="/me" className="whitespace-nowrap px-3 py-1.5 bg-blue-100 text-blue-700 text-sm font-bold rounded-lg hover:bg-blue-200 transition-colors dark:bg-blue-900/40 dark:text-blue-300 dark:hover:bg-blue-900/60">
                마이페이지
              </Link>
            </div>
          </div>
        </header>

        {/* 온보딩 튜토리얼 (첫 방문 1회 자동 + 사용법 보기) */}
        <OnboardingTour />

        {/* 내 레벨·학습 현황 배너 (9-2) */}
        <LevelBanner xp={profile?.xp || 0} streak={profile?.current_streak || 0} />

        {/* 오늘의 미션 (9-3) */}
        <DailyMissions categories={categories ?? []} />

        {/* 리더보드·배지·북마크 진입 버튼 */}
        <div className="grid grid-cols-3 gap-3">
          <Link href="/leaderboard" className="flex flex-col items-center justify-center gap-1 w-full p-4 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors shadow-sm group dark:bg-amber-900/20 dark:border-amber-900 dark:hover:bg-amber-900/30">
            <span className="text-2xl group-hover:scale-110 transition-transform">🏆</span>
            <span className="text-xs font-bold text-amber-800 dark:text-amber-300">리더보드</span>
          </Link>
          <Link href="/badges" className="flex flex-col items-center justify-center gap-1 w-full p-4 bg-indigo-50 border border-indigo-200 rounded-xl hover:bg-indigo-100 transition-colors shadow-sm group dark:bg-indigo-900/20 dark:border-indigo-900 dark:hover:bg-indigo-900/30">
            <span className="text-2xl group-hover:scale-110 transition-transform">🎖️</span>
            <span className="text-xs font-bold text-indigo-800 dark:text-indigo-300">나의 배지</span>
          </Link>
          <Link href="/bookmarks" className="flex flex-col items-center justify-center gap-1 w-full p-4 bg-rose-50 border border-rose-200 rounded-xl hover:bg-rose-100 transition-colors shadow-sm group dark:bg-rose-900/20 dark:border-rose-900 dark:hover:bg-rose-900/30">
            <span className="text-2xl group-hover:scale-110 transition-transform">🔖</span>
            <span className="text-xs font-bold text-rose-800 dark:text-rose-300">북마크</span>
          </Link>
        </div>

        {/* 분야 선택 리스트 (검색 가능) */}
        <CategoryList categories={categories ?? []} />
        
      </div>
    </main>
  )
}