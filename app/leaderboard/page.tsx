export const dynamic = 'force-dynamic'

import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'

export default async function LeaderboardPage() {
  const supabase = await createClient()

  // 1. 경험치(XP) 기준 상위 20명 조회 
  const { data: leaderboard } = await supabase
    .from('profiles')
    .select('id, email, xp, current_streak')
    .eq('status', 'approved') 
    .order('xp', { ascending: false })
    .limit(20)

  // 2. 이메일 마스킹 (SEC-14: PII 노출 최소화)
  const maskEmail = (email: string) => {
    if (!email) return '익명 학습자'
    const [name] = email.split('@')
    if (name.length <= 2) return `${name}***`
    return `${name.substring(0, 2)}***`
  }

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return '🥇'
      case 1: return '🥈'
      case 2: return '🥉'
      default: return <span className="text-slate-400 font-bold">{index + 1}</span>
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center bg-slate-50 p-4 pt-8">
      <div className="w-full max-w-md space-y-6">
        
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-800">명예의 전당</h1>
          <Link href="/quiz" className="text-sm text-blue-600 font-medium hover:underline">
            퀴즈로 돌아가기
          </Link>
        </header>

        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white shadow-md">
          <h2 className="text-lg font-black mb-1">매일 꾸준히 학습하세요!</h2>
          <p className="text-blue-100 text-sm">
            문제를 맞히고 스트릭을 유지하면 더 높은 점수를 획득할 수 있습니다.
          </p>
        </div>

        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="divide-y divide-slate-100">
            {leaderboard?.map((user, index) => (
              <div 
                key={user.id} 
                className={`flex items-center p-4 transition-colors hover:bg-slate-50 ${index < 3 ? 'bg-amber-50/30' : ''}`}
              >
                <div className="w-10 text-center text-xl flex-shrink-0">
                  {getRankIcon(index)}
                </div>
                
                <div className="flex-1 ml-4">
                  <p className={`font-bold ${index < 3 ? 'text-slate-800' : 'text-slate-700'}`}>
                    {maskEmail(user.email)}
                  </p>
                  {user.current_streak > 0 && (
                    <p className="text-xs font-medium text-orange-500 mt-0.5 flex items-center gap-1">
                      🔥 {user.current_streak}일 연속 학습 중
                    </p>
                  )}
                </div>
                
                <div className="text-right">
                  <p className="text-lg font-black text-blue-600">
                    {user.xp.toLocaleString()}<span className="text-sm font-medium text-blue-400 ml-1">XP</span>
                  </p>
                </div>
              </div>
            ))}

            {leaderboard?.length === 0 && (
              <div className="p-8 text-center text-slate-500 text-sm">
                아직 랭킹 데이터가 없습니다.<br/>첫 번째 랭커가 되어보세요!
              </div>
            )}
          </div>
        </section>

      </div>
    </main>
  )
}