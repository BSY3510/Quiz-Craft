'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/app/components/Toast'
import { setMonthlyGoal } from './actions'

// 9-1 월간 목표 카드: '이번 달 N문제' 목표 설정 + 진행률.
export default function MonthlyGoalCard({ goal, solved }: { goal: number | null; solved: number }) {
  const router = useRouter()
  const toast = useToast()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(String(goal ?? 50))
  const [saving, setSaving] = useState(false)

  const pct = goal && goal > 0 ? Math.min(100, Math.round((solved / goal) * 100)) : 0
  const done = goal != null && solved >= goal

  const save = async (next: number | null) => {
    setSaving(true)
    const res = await setMonthlyGoal(next)
    setSaving(false)
    if (res.error) { toast.error(res.error); return }
    setEditing(false)
    toast.success(next === null ? '목표를 해제했어요.' : '이번 달 목표를 설정했어요.')
    router.refresh()
  }

  return (
    <section className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400">🎯 이번 달 목표</h2>
        {goal != null && !editing && (
          <button onClick={() => { setValue(String(goal)); setEditing(true) }} className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">수정</button>
        )}
      </div>

      {goal == null && !editing ? (
        <div className="text-center py-2">
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">이번 달 학습 목표를 정해 동기를 높여보세요.</p>
          <button onClick={() => { setValue('50'); setEditing(true) }} className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors">목표 설정하기</button>
        </div>
      ) : editing ? (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 flex-1">
            <input
              type="number"
              min={1}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-24 p-2.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-slate-500 dark:text-slate-400">문제</span>
          </div>
          <button onClick={() => save(Number(value))} disabled={saving} className="px-3 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50">저장</button>
          {goal != null && (
            <button onClick={() => save(null)} disabled={saving} className="px-3 py-2 bg-slate-100 text-slate-600 text-sm font-bold rounded-lg hover:bg-slate-200 disabled:opacity-50 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600">해제</button>
          )}
          <button onClick={() => setEditing(false)} disabled={saving} className="px-3 py-2 text-slate-400 text-sm font-bold hover:underline">취소</button>
        </div>
      ) : (
        <div>
          <div className="flex items-end justify-between mb-2">
            <p className="text-2xl font-black text-slate-800 dark:text-slate-100">
              {solved}<span className="text-base text-slate-400"> / {goal}문제</span>
            </p>
            <span className={`text-sm font-black ${done ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'}`}>
              {done ? '달성! 🎉' : `${pct}%`}
            </span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div className={`h-full transition-all duration-500 ${done ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}
    </section>
  )
}
