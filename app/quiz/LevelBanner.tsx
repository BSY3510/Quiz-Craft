'use client'

import { useEffect } from 'react'
import { useToast } from '@/app/components/Toast'
import { levelFromXp } from '@/app/lib/level'

const LEVEL_KEY = 'qc_last_level'

// 9-2 레벨 배너: 기존 XP·연속학습 배너를 레벨/진행률까지 보여주도록 대체.
// 레벨업 감지 → 토스트(localStorage 에 마지막 레벨 저장, 첫 방문엔 토스트 없음).
export default function LevelBanner({ xp, streak }: { xp: number; streak: number }) {
  const toast = useToast()
  const info = levelFromXp(xp)

  useEffect(() => {
    const prev = Number(localStorage.getItem(LEVEL_KEY))
    if (Number.isFinite(prev) && prev > 0 && info.level > prev) {
      toast.success(`🎉 레벨 ${info.level} 달성! (${info.title})`)
    }
    localStorage.setItem(LEVEL_KEY, String(info.level))
  }, [info.level, info.title, toast])

  return (
    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-5 text-white shadow-md">
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="text-blue-100 text-sm font-medium mb-0.5">내 레벨</p>
          <p className="text-2xl font-black flex items-center gap-2">
            Lv.{info.level}
            <span className="text-sm font-bold bg-white/20 px-2 py-0.5 rounded-full">{info.title}</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-blue-100 text-sm font-medium mb-0.5">연속 학습</p>
          <p className="text-2xl font-black flex items-center justify-end gap-1">
            🔥 {streak} <span className="text-base font-medium">일차</span>
          </p>
        </div>
      </div>

      {/* 레벨 진행률 바 */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs font-medium text-blue-100">
          <span>{xp} XP</span>
          <span>다음 레벨까지 {info.toNext} XP</span>
        </div>
        <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
          <div className="h-full bg-white transition-all duration-500" style={{ width: `${info.progressPct}%` }} />
        </div>
      </div>
    </div>
  )
}
