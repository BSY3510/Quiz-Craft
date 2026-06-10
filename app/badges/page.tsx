export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { BADGES, badgeProgress, type BadgeStats } from './badges'

interface AttemptRow {
  is_correct: boolean
  questions: { category_id: string } | null
}

export default async function BadgesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 본인 프로필(xp/스트릭) + 풀이 기록(정답 집계용) 조회
  const [{ data: profile }, { data: attemptsData }] = await Promise.all([
    supabase.from('profiles').select('xp, current_streak').eq('id', user.id).single(),
    supabase.from('attempts').select('is_correct, questions ( category_id )').eq('user_id', user.id),
  ])

  const attempts = (attemptsData as unknown as AttemptRow[]) || []
  const totalSolved = attempts.length
  const totalCorrect = attempts.filter((a) => a.is_correct).length
  const accuracy = totalSolved === 0 ? 0 : Math.round((totalCorrect / totalSolved) * 100)

  const perCat: Record<string, number> = {}
  const playedCats = new Set<string>()
  for (const a of attempts) {
    const cat = a.questions?.category_id
    if (!cat) continue
    playedCats.add(cat)
    if (a.is_correct) perCat[cat] = (perCat[cat] || 0) + 1
  }
  const maxCategoryCorrect = Object.values(perCat).reduce((m, v) => Math.max(m, v), 0)

  const stats: BadgeStats = {
    xp: profile?.xp ?? 0,
    streak: profile?.current_streak ?? 0,
    totalSolved,
    totalCorrect,
    accuracy,
    categoriesPlayed: playedCats.size,
    maxCategoryCorrect,
  }

  const evaluated = BADGES.map((b) => ({ def: b, prog: badgeProgress(b, stats) }))
  const earnedCount = evaluated.filter((e) => e.prog.earned).length

  return (
    <main className="flex min-h-screen flex-col items-center bg-slate-50 dark:bg-slate-900 p-4 pt-8">
      <div className="w-full max-w-md space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">🎖️ 나의 배지</h1>
          <Link href="/quiz" className="text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline">
            퀴즈로 돌아가기
          </Link>
        </header>

        {/* 요약 */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 text-white shadow-md">
          <p className="text-indigo-100 text-sm font-medium">획득한 배지</p>
          <p className="text-3xl font-black mt-1">
            {earnedCount}
            <span className="text-lg font-bold text-indigo-200"> / {BADGES.length}</span>
          </p>
        </div>

        {/* 배지 그리드 */}
        <section className="grid grid-cols-2 gap-3">
          {evaluated.map(({ def, prog }) => (
            <div
              key={def.key}
              className={`rounded-xl border p-4 flex flex-col items-center text-center transition-colors ${
                prog.earned
                  ? 'bg-white dark:bg-slate-800 border-indigo-200 dark:border-indigo-900/60 shadow-sm'
                  : 'bg-slate-100/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
              }`}
            >
              <div className={`text-4xl ${prog.earned ? '' : 'grayscale opacity-40'}`}>{def.icon}</div>
              <p className={`mt-2 text-sm font-bold ${prog.earned ? 'text-slate-800 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'}`}>
                {def.title}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 leading-tight">{def.desc}</p>

              {prog.earned ? (
                <span className="mt-2 px-2 py-0.5 text-[11px] font-bold rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                  ✓ 획득
                </span>
              ) : (
                <div className="w-full mt-2">
                  <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-400 dark:bg-indigo-500" style={{ width: `${prog.pct}%` }} />
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                    {Math.min(prog.value, def.target).toLocaleString()} / {def.target.toLocaleString()} {def.unit}
                  </p>
                </div>
              )}
            </div>
          ))}
        </section>
      </div>
    </main>
  )
}
