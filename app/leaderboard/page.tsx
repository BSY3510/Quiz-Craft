export const dynamic = 'force-dynamic'

import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import LeaderboardTabs from './LeaderboardTabs'
import type { LeaderboardRow, WeeklyLeaderboardRow } from '@/types/db'

export default async function LeaderboardPage() {
  const supabase = await createClient()

  // ✅ profiles 전체 조회(PII) 대신 정의자 함수로 안전 컬럼만(마스킹된 이름·xp·스트릭).
  //    SEC-H 차단 + 닉네임 마스킹(B)이 함수 안에서 처리된다. 전체/주간 둘 다 조회.
  const [{ data: allTime }, { data: weekly }] = await Promise.all([
    supabase.rpc('get_leaderboard'),
    supabase.rpc('get_weekly_leaderboard'),
  ])

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
            주간 랭킹은 매주 초기화됩니다. 이번 주 1등에 도전해 보세요!
          </p>
        </div>

        <LeaderboardTabs
          allTime={(allTime ?? []) as LeaderboardRow[]}
          weekly={(weekly ?? []) as WeeklyLeaderboardRow[]}
        />

      </div>
    </main>
  )
}