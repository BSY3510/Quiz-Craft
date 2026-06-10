'use client'

import { useState } from 'react'
import type { LeaderboardRow, WeeklyLeaderboardRow } from '@/types/db'

function rankIcon(rank: number) {
  switch (rank) {
    case 1: return '🥇'
    case 2: return '🥈'
    case 3: return '🥉'
    default: return <span className="text-slate-400 font-bold">{rank}</span>
  }
}

type Tab = 'weekly' | 'all'

export default function LeaderboardTabs({
  allTime,
  weekly,
}: {
  allTime: LeaderboardRow[]
  weekly: WeeklyLeaderboardRow[]
}) {
  const [tab, setTab] = useState<Tab>('weekly')

  const isWeekly = tab === 'weekly'
  const rows: Array<{ rank: number; masked_name: string; value: number; streak?: number }> = isWeekly
    ? weekly.map((e) => ({ rank: e.rank, masked_name: e.masked_name, value: e.weekly_xp }))
    : allTime.map((e) => ({ rank: e.rank, masked_name: e.masked_name, value: e.xp, streak: e.current_streak }))

  return (
    <>
      {/* 탭 */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
        {([
          ['weekly', '🗓️ 이번 주'],
          ['all', '🏆 전체'],
        ] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`py-2.5 rounded-lg text-sm font-bold transition-colors ${
              tab === key
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <section className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="divide-y divide-slate-100 dark:divide-slate-700">
          {rows.map((entry) => (
            <div
              key={entry.rank}
              className={`flex items-center p-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50 ${entry.rank <= 3 ? 'bg-amber-50/30 dark:bg-amber-900/10' : ''}`}
            >
              <div className="w-10 text-center text-xl flex-shrink-0">{rankIcon(entry.rank)}</div>

              <div className="flex-1 ml-4">
                <p className={`font-bold ${entry.rank <= 3 ? 'text-slate-800 dark:text-slate-100' : 'text-slate-700 dark:text-slate-200'}`}>
                  {entry.masked_name}
                </p>
                {!isWeekly && (entry.streak ?? 0) > 0 && (
                  <p className="text-xs font-medium text-orange-500 dark:text-orange-400 mt-0.5 flex items-center gap-1">
                    🔥 {entry.streak}일 연속 학습 중
                  </p>
                )}
              </div>

              <div className="text-right">
                <p className="text-lg font-black text-blue-600 dark:text-blue-400">
                  {entry.value.toLocaleString()}
                  <span className="text-sm font-medium text-blue-400 ml-1">XP</span>
                </p>
              </div>
            </div>
          ))}

          {rows.length === 0 && (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm">
              {isWeekly ? (
                <>이번 주 랭킹 데이터가 아직 없습니다.<br />문제를 풀고 첫 주간 랭커가 되어보세요!</>
              ) : (
                <>아직 랭킹 데이터가 없습니다.<br />첫 번째 랭커가 되어보세요!</>
              )}
            </div>
          )}
        </div>
      </section>
    </>
  )
}
