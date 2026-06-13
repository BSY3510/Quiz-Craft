'use client'

import { Badge, statusTone, DifficultyBadge } from '@/app/components/ui'
import type { AdminQuestionRow } from '@/types/db'

export type DashQuestion = AdminQuestionRow & { errorRate: number; totalAttempts: number }

// 문제 관리 테이블(프레젠테이셔널). 데이터·선택상태는 부모가 보유하고, 동작은 콜백으로 위임한다.
export default function QuestionTable({
  questions,
  isLoading,
  selectedIds,
  allPageSelected,
  onToggleSelect,
  onToggleSelectPage,
  onEdit,
  onSetStatus,
  onDelete,
}: {
  questions: DashQuestion[]
  isLoading: boolean
  selectedIds: Set<string>
  allPageSelected: boolean
  onToggleSelect: (id: string) => void
  onToggleSelectPage: () => void
  onEdit: (q: DashQuestion) => void
  onSetStatus: (id: string, status: 'active' | 'archived') => void
  onDelete: (q: DashQuestion) => void
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
      {isLoading ? (
        <div className="p-8 text-center text-slate-500 dark:text-slate-400">데이터 집계 중...</div>
      ) : questions.length === 0 ? (
        <div className="p-8 text-center text-slate-500 dark:text-slate-400">조건에 부합하는 문제가 존재하지 않습니다.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
              <tr>
                <th className="p-4 w-10">
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    onChange={onToggleSelectPage}
                    aria-label="현재 페이지 전체 선택"
                    className="w-4 h-4 accent-blue-600 cursor-pointer"
                  />
                </th>
                <th className="p-4">분야</th>
                <th className="p-4">난이도</th>
                <th className="p-4 w-1/2">문제 내용 (클릭하여 전체 수정)</th>
                <th className="p-4">오답률</th>
                <th className="p-4">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-slate-800 dark:text-slate-200">
              {questions.map(q => (
                <tr key={q.id} className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer ${selectedIds.has(q.id) ? 'bg-blue-50/60 dark:bg-blue-900/10' : ''}`} onClick={() => onEdit(q)}>
                  <td className="p-4" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(q.id)}
                      onChange={() => onToggleSelect(q.id)}
                      aria-label="문제 선택"
                      className="w-4 h-4 accent-blue-600 cursor-pointer"
                    />
                  </td>
                  <td className="p-4 font-bold text-blue-600 dark:text-blue-400 uppercase">{q.category_id}</td>
                  <td className="p-4"><DifficultyBadge difficulty={q.difficulty} /></td>
                  <td className="p-4">{q.question_text} ✏️</td>
                  <td className="p-4">
                    <span className={`font-bold ${q.errorRate > 50 ? 'text-red-500 dark:text-red-400' : 'text-slate-600 dark:text-slate-300'}`}>{q.errorRate.toFixed(1)}%</span>
                    <span className="text-xs text-slate-400 dark:text-slate-500 block">총 {q.totalAttempts}회 풀이</span>
                  </td>
                  <td className="p-4" onClick={(e) => e.stopPropagation()}>
                    <Badge tone={statusTone(q.status)}>{q.status}</Badge>
                    {q.status === 'pending_review' && (
                      <div className="flex gap-1 mt-2">
                        <button onClick={() => onSetStatus(q.id, 'active')} className="px-2 py-1 bg-green-50 text-green-700 text-xs font-bold rounded border border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-900/50">✓ 승인</button>
                        <button onClick={() => onSetStatus(q.id, 'archived')} className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded border border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600">✕ 반려</button>
                      </div>
                    )}
                    {q.status === 'active' && (
                      <div className="flex gap-1 mt-2">
                        <button onClick={() => onSetStatus(q.id, 'archived')} className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded border border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600">📦 보관</button>
                      </div>
                    )}
                    {q.status === 'archived' && (
                      <div className="flex gap-1 mt-2">
                        <button onClick={() => onSetStatus(q.id, 'active')} className="px-2 py-1 bg-green-50 text-green-700 text-xs font-bold rounded border border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-900/50">↩ 복원</button>
                        <button onClick={() => onDelete(q)} className="px-2 py-1 bg-red-50 text-red-700 text-xs font-bold rounded border border-red-200 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:border-red-900/50">🗑 삭제</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
