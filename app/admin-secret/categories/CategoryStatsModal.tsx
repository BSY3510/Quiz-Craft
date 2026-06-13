'use client'

import { Modal } from '@/app/components/Modal'
import type { Category } from '@/types/db'

export interface CategoryStats {
  total: number
  status: Record<string, number>
  type: Record<string, number>
  difficulty: Record<string, number>
}

// 분야 통계 라벨/색상 (status·type·difficulty 표시 순서 고정)
const STATUS_META: { key: string; label: string; color: string }[] = [
  { key: 'active', label: '활성(노출)', color: 'bg-green-500' },
  { key: 'pending_review', label: '검증 대기', color: 'bg-amber-500' },
  { key: 'archived', label: '보관', color: 'bg-slate-400' },
]
const TYPE_META: { key: string; label: string; color: string }[] = [
  { key: 'multiple-choice', label: '객관식', color: 'bg-blue-500' },
  { key: 'true-false', label: 'OX', color: 'bg-indigo-500' },
]
const DIFF_META: { key: string; label: string; color: string }[] = [
  { key: 'easy', label: '쉬움', color: 'bg-emerald-500' },
  { key: 'medium', label: '보통', color: 'bg-amber-500' },
  { key: 'hard', label: '어려움', color: 'bg-rose-500' },
]

// 통계 한 그룹(상태/유형/난이도) 렌더 — 라벨·카운트·비율 막대. meta 외 값은 '기타'로 합산.
function renderStatGroup(
  title: string,
  meta: { key: string; label: string; color: string }[],
  counts: Record<string, number>,
  total: number
) {
  const known = meta.reduce((s, m) => s + (counts[m.key] || 0), 0)
  const other = total - known
  const rows = [
    ...meta.map((m) => ({ label: m.label, color: m.color, n: counts[m.key] || 0 })),
    ...(other > 0 ? [{ label: '기타', color: 'bg-slate-300 dark:bg-slate-600', n: other }] : []),
  ]
  return (
    <div>
      <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">{title}</h3>
      <div className="space-y-1.5">
        {rows.map((r) => {
          const pct = total > 0 ? Math.round((r.n / total) * 100) : 0
          return (
            <div key={r.label} className="flex items-center gap-2 text-sm">
              <span className="w-16 shrink-0 text-slate-600 dark:text-slate-300">{r.label}</span>
              <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className={`h-full ${r.color}`} style={{ width: `${pct}%` }} />
              </div>
              <span className="w-14 shrink-0 text-right font-bold text-slate-700 dark:text-slate-200">{r.n}<span className="text-xs font-normal text-slate-400 dark:text-slate-500"> ({pct}%)</span></span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// 분야 통계 모달. 집계 데이터는 부모가 조회·전달한다.
export default function CategoryStatsModal({
  category,
  data,
  loading,
  onClose,
}: {
  category: Category | null
  data: CategoryStats | null
  loading: boolean
  onClose: () => void
}) {
  return (
    <Modal open={!!category} onClose={onClose} className="max-w-md" labelledBy="cat-stats-title">
      {category && (
        <div className="space-y-5">
          <div>
            <h2 id="cat-stats-title" className="text-lg font-black text-slate-800 dark:text-slate-100">
              📊 {category.icon || '💡'} {category.name} 통계
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 font-mono uppercase">{category.id}</p>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400 font-bold">집계 중...</div>
          ) : !data ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400">통계를 불러오지 못했습니다.</div>
          ) : data.total === 0 ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400">이 분야에는 등록된 문제가 없습니다.</div>
          ) : (
            <>
              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 text-center">
                <p className="text-3xl font-black text-slate-800 dark:text-slate-100">{data.total}</p>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">총 문제 수</p>
              </div>
              {renderStatGroup('상태별', STATUS_META, data.status, data.total)}
              {renderStatGroup('유형별', TYPE_META, data.type, data.total)}
              {renderStatGroup('난이도별', DIFF_META, data.difficulty, data.total)}
            </>
          )}

          <button onClick={onClose} className="w-full p-3 bg-slate-100 text-slate-700 font-bold rounded-xl text-sm hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600">닫기</button>
        </div>
      )}
    </Modal>
  )
}
