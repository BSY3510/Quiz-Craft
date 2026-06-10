'use client'

import { useMemo, useState } from 'react'
import { DifficultyBadge } from '@/app/components/ui'
import CodeBlock from '@/app/components/CodeBlock'
import BookmarkRemoveButton from './BookmarkRemoveButton'

export interface BookmarkItem {
  id: string
  category_id: string
  type: string
  question_text: string
  code_snippet: string | null
  options: { id: string; text: string }[]
  answer_id: string
  explanation: string
  difficulty: string
  bookmarked_at: string
}

type Sort = 'recent' | 'oldest' | 'category'

export default function BookmarksList({
  items,
  categoryNames,
}: {
  items: BookmarkItem[]
  categoryNames: Record<string, string>
}) {
  const [filterCat, setFilterCat] = useState('all')
  const [sort, setSort] = useState<Sort>('recent')

  const nameOf = (id: string) => categoryNames[id] || id

  // 북마크에 실제 존재하는 분야만 필터 옵션으로(이름순)
  const presentCats = useMemo(() => {
    const set = new Set(items.map((i) => i.category_id))
    return [...set].map((id) => ({ id, name: nameOf(id) })).sort((a, b) => a.name.localeCompare(b.name, 'ko'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, categoryNames])

  const view = useMemo(() => {
    const arr = filterCat === 'all' ? items : items.filter((i) => i.category_id === filterCat)
    const ts = (s: string) => new Date(s).getTime()
    return [...arr].sort((a, b) => {
      if (sort === 'recent') return ts(b.bookmarked_at) - ts(a.bookmarked_at)
      if (sort === 'oldest') return ts(a.bookmarked_at) - ts(b.bookmarked_at)
      const c = nameOf(a.category_id).localeCompare(nameOf(b.category_id), 'ko')
      return c !== 0 ? c : ts(b.bookmarked_at) - ts(a.bookmarked_at)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, filterCat, sort, categoryNames])

  if (items.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 p-12 text-center rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <span className="text-4xl">🔖</span>
        <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200 mt-4">북마크한 문제가 없어요</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">문제를 풀다가 다시 보고 싶은 문제를 북마크해 보세요.</p>
      </div>
    )
  }

  return (
    <>
      {/* 필터 · 정렬 */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex gap-3">
        <div className="flex-1">
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">분야</label>
          <select
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
            className="w-full p-2 border rounded-lg text-sm text-slate-800 dark:text-slate-100 dark:border-slate-600 dark:bg-slate-700"
          >
            <option value="all">전체 분야 ({items.length})</option>
            {presentCats.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">정렬</label>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="w-full p-2 border rounded-lg text-sm text-slate-800 dark:text-slate-100 dark:border-slate-600 dark:bg-slate-700"
          >
            <option value="recent">최근 북마크순</option>
            <option value="oldest">오래된 북마크순</option>
            <option value="category">분야순</option>
          </select>
        </div>
      </div>

      <p className="text-xs font-bold text-slate-400 dark:text-slate-500 px-1">{view.length}개 표시</p>

      <div className="space-y-6">
        {view.map((q) => {
          const answerOption = q.options.find((opt) => opt.id === q.answer_id)
          return (
            <div key={q.id} className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="flex gap-2 items-center mb-4 flex-wrap">
                <span className="px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 font-black text-xs rounded">{nameOf(q.category_id)}</span>
                <DifficultyBadge difficulty={q.difficulty} />
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  {new Date(q.bookmarked_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })} 저장
                </span>
                <div className="ml-auto">
                  <BookmarkRemoveButton questionId={q.id} />
                </div>
              </div>

              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">{q.question_text}</h3>

              {q.code_snippet && <CodeBlock code={q.code_snippet} className="mb-4" />}

              <div className="bg-green-50 border border-green-200 p-4 rounded-xl mb-4 dark:bg-green-900/20 dark:border-green-900/50">
                <p className="text-xs font-bold text-green-800 dark:text-green-300 mb-1">정답</p>
                <p className="font-medium text-green-900 dark:text-green-200">{answerOption?.text}</p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">해설</p>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{q.explanation}</p>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
