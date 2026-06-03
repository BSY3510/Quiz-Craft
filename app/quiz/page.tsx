export const dynamic = 'force-dynamic' // 캐시 무효화: 닉네임 변경 즉시 반영

import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

const getIconForCategory = (categoryId: string) => {
  const icons: Record<string, string> = { java: '☕', spring: '🍃', python: '🐍', react: '⚛️' }
  return icons[categoryId] || '💡'
}

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
    .select('id, name')
    .eq('active', true)
    .order('created_at', { ascending: true })

  const adminPath = `/admin-${process.env.NEXT_PUBLIC_ADMIN_PATH_SUFFIX || process.env.ADMIN_PATH_SUFFIX || 'secret'}`

  return (
    <main className="flex min-h-screen flex-col bg-slate-50 md:items-center">
      <div className="w-full max-w-md p-4 pt-8 space-y-6">
        
        {/* 헤더 및 유저 메뉴 */}
        <header className="flex items-start justify-between">
          <div>
            {/* ✅ 수정된 displayName 변수 적용 */}
            <h1 className="text-2xl font-black text-slate-800">
              반갑습니다, {displayName}님! 👋
            </h1>
            <p className="text-slate-500 mt-1">오늘도 지식을 쌓아볼까요?</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-2">
              {/* 관리자 여부 확인 후 버튼 렌더링 */}
              {profile?.role === 'admin' && (
                <Link href={adminPath} className="whitespace-nowrap px-3 py-1.5 bg-slate-800 text-white text-sm font-bold rounded-lg hover:bg-slate-900 transition-colors shadow-sm">
                  관리자 센터
                </Link>
              )}
              <Link href="/me" className="whitespace-nowrap px-3 py-1.5 bg-blue-100 text-blue-700 text-sm font-bold rounded-lg hover:bg-blue-200 transition-colors">
                마이페이지
              </Link>
            </div>
          </div>
        </header>

        {/* 내 학습 현황 배너 */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-5 text-white shadow-md flex justify-between items-center">
          <div>
            <p className="text-blue-100 text-sm font-medium mb-1">내 학습 현황</p>
            <p className="text-2xl font-black">{profile?.xp || 0} <span className="text-base font-medium">XP</span></p>
          </div>
          <div className="text-right flex flex-col items-end">
            <p className="text-blue-100 text-sm font-medium mb-1">연속 학습</p>
            <p className="text-2xl font-black flex items-center gap-1">
              🔥 {profile?.current_streak || 0} <span className="text-base font-medium">일차</span>
            </p>
          </div>
        </div>

        {/* 리더보드 (명예의 전당) 진입 버튼 */}
        <Link href="/leaderboard" className="flex items-center justify-center gap-2 w-full p-4 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors shadow-sm group">
          <span className="text-2xl group-hover:scale-110 transition-transform">🏆</span>
          <span className="font-bold text-amber-800">명예의 전당 (리더보드) 확인하기</span>
        </Link>

        {/* 분야 선택 리스트 */}
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-bold text-slate-800">학습 분야 선택</h2>
          {categories?.length === 0 ? (
            <div className="p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
              현재 활성화된 학습 분야가 없습니다.
            </div>
          ) : (
            categories?.map((category) => (
              <div key={category.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-5 flex items-center gap-4 border-b border-slate-100">
                  <div className="text-4xl bg-slate-50 p-3 rounded-lg">
                    {getIconForCategory(category.id)}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-slate-800">{category.name}</h2>
                    <p className="text-sm text-slate-400 uppercase">{category.id}</p>
                  </div>
                </div>
                <div className="flex bg-slate-50 divide-x divide-slate-200">
                  <Link href={`/quiz/${category.id}`} className="flex-1 p-3 text-center text-sm font-bold text-blue-600 hover:bg-blue-50 transition-colors">
                    ▶️ 문제 풀기
                  </Link>
                  <Link href={`/review/${category.id}`} className="flex-1 p-3 text-center text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors">
                    📝 오답 노트
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
        
      </div>
    </main>
  )
}