export const dynamic = 'force-dynamic'

import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'

export default async function LeaderboardPage() {
  const supabase = await createClient()

  // ✅ profiles 전체 조회(PII) 대신 정의자 함수로 안전 컬럼만(마스킹된 이름·xp·스트릭).
  //    SEC-H 차단 + 닉네임 마스킹(B)이 함수 안에서 처리된다.
  const { data: leaderboard } = await supabase.rpc('get_leaderboard')

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return '🥇'
      case 2: return '🥈'
      case 3: return '🥉'
      default: return <span className="text-slate-400 font-bold">{rank}</span>
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center bg-slate-50 dark:bg-slate-900 p-4 pt-8">
      <div className="w-full max-w-md space-y-6">

        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">명예의 전당</h1>
          <Link href="/quiz" className="text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline">
            퀴즈로 돌아가기
          </Link>
        </header>

        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white shadow-md">
          <h2 className="text-lg font-black mb-1">매일 꾸준히 학습하세요!</h2>
          <p className="text-blue-100 text-sm">
            문제를 맞히고 스트릭을 유지하면 더 높은 점수를 획득할 수 있습니다.
          </p>
        </div>

        <section className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {leaderboard?.map((entry: { rank: number; masked_name: string; xp: number; current_streak: number }) => (
              <div
                key={entry.rank}
                className={`flex items-center p-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50 ${entry.rank <= 3 ? 'bg-amber-50/30 dark:bg-amber-900/10' : ''}`}
              >
                <div className="w-10 text-center text-xl flex-shrink-0">
                  {getRankIcon(entry.rank)}
                </div>

                <div className="flex-1 ml-4">
                  <p className={`font-bold ${entry.rank <= 3 ? 'text-slate-800 dark:text-slate-100' : 'text-slate-700 dark:text-slate-200'}`}>
                    {entry.masked_name}
                  </p>
                  {entry.current_streak > 0 && (
                    <p className="text-xs font-medium text-orange-500 dark:text-orange-400 mt-0.5 flex items-center gap-1">
                      🔥 {entry.current_streak}일 연속 학습 중
                    </p>
                  )}
                </div>

                <div className="text-right">
                  <p className="text-lg font-black text-blue-600 dark:text-blue-400">
                    {entry.xp.toLocaleString()}<span className="text-sm font-medium text-blue-400 ml-1">XP</span>
                  </p>
                </div>
              </div>
            ))}

            {leaderboard?.length === 0 && (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm">
                아직 랭킹 데이터가 없습니다.<br/>첫 번째 랭커가 되어보세요!
              </div>
            )}
          </div>
        </section>

      </div>
    </main>
  )
}