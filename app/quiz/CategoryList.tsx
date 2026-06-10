'use client'

import { useState } from 'react'
import Link from 'next/link'

interface CategoryItem {
  id: string
  name: string
  icon: string | null
}

const FALLBACK_ICONS: Record<string, string> = { java: '☕', spring: '🍃', python: '🐍', react: '⚛️' }
function iconFor(c: CategoryItem) {
  return c.icon || FALLBACK_ICONS[c.id] || '💡'
}

export function CategoryList({ categories }: { categories: CategoryItem[] }) {
  const [search, setSearch] = useState('')
  const keyword = search.trim().toLowerCase()
  const filtered = keyword
    ? categories.filter(
        (c) => c.id.toLowerCase().includes(keyword) || c.name.toLowerCase().includes(keyword)
      )
    : categories

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">학습 분야 선택</h2>

      {/* 분야 검색 */}
      {categories.length > 0 && (
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 분야 검색"
          className="w-full p-3 pl-4 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
        />
      )}

      {categories.length === 0 ? (
        <div className="p-8 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          현재 활성화된 학습 분야가 없습니다.
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-8 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          &apos;{search}&apos; 검색 결과가 없습니다.
        </div>
      ) : (
        filtered.map((category) => (
          <div key={category.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-5 flex items-center gap-4 border-b border-slate-100 dark:border-slate-700">
              <div className="text-4xl bg-slate-50 dark:bg-slate-700 p-3 rounded-lg">{iconFor(category)}</div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{category.name}</h2>
                <p className="text-sm text-slate-400 dark:text-slate-500 uppercase">{category.id}</p>
              </div>
            </div>
            <div className="flex bg-slate-50 dark:bg-slate-900/50 divide-x divide-slate-200 dark:divide-slate-700">
              <Link href={`/quiz/${category.id}`} className="flex-1 p-3 text-center text-sm font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                ▶️ 문제 풀기
              </Link>
              <Link href={`/review/${category.id}`} className="flex-1 p-3 text-center text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                📝 오답 노트
              </Link>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
