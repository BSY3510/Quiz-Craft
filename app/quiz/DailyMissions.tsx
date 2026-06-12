'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { useToast } from '@/app/components/Toast'
import type { DailyMissionRow } from '@/types/db'

const DIFF_LABEL: Record<string, string> = { easy: '쉬움', medium: '보통', hard: '어려움' }

function missionIcon(kind: string): string {
  if (kind === 'solve_category') return '💪'
  if (kind === 'solve_type') return '⭕'
  if (kind === 'solve_difficulty') return '🔥'
  return '🎯'
}

function missionLabel(m: DailyMissionRow, catName: (id: string) => string): string {
  switch (m.kind) {
    case 'solve_category':
      return `약점 분야 「${m.param ? catName(m.param) : ''}」 ${m.target}문제 풀기`
    case 'solve_type':
      return `${m.param === 'true-false' ? 'OX' : ''} ${m.target}문제 풀기`.trim()
    case 'solve_difficulty':
      return `${m.param ? DIFF_LABEL[m.param] ?? m.param : ''} 난이도 ${m.target}문제 풀기`
    default:
      return `오늘 ${m.target}문제 풀기`
  }
}

// 9-3 데일리 미션: 오늘(KST) 약점기반 미션 + 진행률 + 보상 수령.
export default function DailyMissions({ categories }: { categories: { id: string; name: string }[] }) {
  const supabase = createClient()
  const router = useRouter()
  const toast = useToast()
  const [missions, setMissions] = useState<DailyMissionRow[] | null>(null)
  const [claimingId, setClaimingId] = useState<string | null>(null)

  const catName = (id: string) => categories.find((c) => c.id === id)?.name ?? id.toUpperCase()

  useEffect(() => {
    let active = true
    supabase.rpc('get_or_create_today_missions').then(({ data }) => {
      if (active) setMissions((data as DailyMissionRow[]) ?? [])
    })
    return () => { active = false }
  }, [supabase])

  const claim = async (m: DailyMissionRow) => {
    setClaimingId(m.id)
    const { data, error } = await supabase.rpc('claim_mission_reward', { p_mission_id: m.id })
    setClaimingId(null)
    if (error) { toast.error('보상 수령 중 오류가 발생했습니다.'); return }
    const res = data as { ok: boolean; awarded?: number; reason?: string }
    if (!res?.ok) {
      if (res?.reason === 'already') {
        setMissions((prev) => prev?.map((x) => (x.id === m.id ? { ...x, claimed: true } : x)) ?? prev)
      } else {
        toast.error(res?.reason === 'incomplete' ? '아직 미션을 완료하지 않았어요.' : '보상을 받을 수 없습니다.')
      }
      return
    }
    setMissions((prev) => prev?.map((x) => (x.id === m.id ? { ...x, claimed: true } : x)) ?? prev)
    toast.success(`미션 완료! +${res.awarded} XP 🎉`)
    router.refresh() // 레벨/XP 배너 갱신
  }

  if (missions === null) {
    return (
      <section className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
        <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400">🗓️ 오늘의 미션</h2>
        <p className="text-sm text-slate-400 dark:text-slate-500 mt-3">불러오는 중...</p>
      </section>
    )
  }
  if (missions.length === 0) return null

  const allDone = missions.every((m) => m.claimed)

  return (
    <section className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400">🗓️ 오늘의 미션</h2>
        {allDone && <span className="text-xs font-bold text-green-600 dark:text-green-400">모두 완료! 🎉</span>}
      </div>

      <div className="space-y-3">
        {missions.map((m) => {
          const pct = m.target > 0 ? Math.min(100, Math.round((m.progress / m.target) * 100)) : 0
          const complete = m.progress >= m.target
          return (
            <div key={m.id} className={`p-3 rounded-xl border ${m.claimed ? 'bg-slate-50 border-slate-100 dark:bg-slate-900/40 dark:border-slate-700/50' : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700'}`}>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className={`text-sm font-bold ${m.claimed ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-700 dark:text-slate-200'}`}>
                  {missionIcon(m.kind)} {missionLabel(m, catName)}
                </span>
                <span className="shrink-0 text-xs font-bold text-amber-500 dark:text-amber-400">+{m.reward_xp} XP</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className={`h-full transition-all duration-500 ${complete ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${pct}%` }} />
                </div>
                <span className="shrink-0 text-xs font-bold text-slate-500 dark:text-slate-400 w-10 text-right">{Math.min(m.progress, m.target)}/{m.target}</span>
                {m.claimed ? (
                  <span className="shrink-0 text-xs font-bold text-green-600 dark:text-green-400 w-16 text-center">완료 ✓</span>
                ) : (
                  <button
                    onClick={() => claim(m)}
                    disabled={!complete || claimingId === m.id}
                    className="shrink-0 w-16 px-2 py-1.5 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed dark:disabled:bg-slate-700 dark:disabled:text-slate-500 transition-colors"
                  >
                    {claimingId === m.id ? '...' : '보상'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
