'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useToast } from '@/app/components/Toast'
import { setFavoriteCategories } from './actions'
import { type CategoryItem, type GroupItem, iconFor, matchCategory } from './categoryShared'
import CategoryPickerModal from './CategoryPickerModal'
import CategoryRequestModal from './CategoryRequestModal'

export function CategoryList({
  categories,
  groups,
  favorites,
}: {
  categories: CategoryItem[]
  groups: GroupItem[]
  favorites: string[]
}) {
  const toast = useToast()
  const [search, setSearch] = useState('') // 내 분야 검색
  // 내 분야: 배열 순서 = 사용자 지정 표시 순서. 멤버십 확인용 Set은 파생.
  const [fav, setFav] = useState<string[]>(() => favorites)
  const favSet = new Set(fav)

  const [pickerOpen, setPickerOpen] = useState(false)
  const [reqOpen, setReqOpen] = useState(false)

  // 메인: 내 분야(즐겨찾기)만 — fav 배열 순서대로 평면 표시
  const keyword = search.trim().toLowerCase()
  const byId = new Map(categories.map((c) => [c.id, c]))
  const myCategories = fav.map((id) => byId.get(id)).filter(Boolean) as CategoryItem[]
  const myVisible = myCategories.filter((c) => matchCategory(c, keyword, groups))

  // 즐겨찾기 추가(맨 뒤)/해제. 배열 순서 보존.
  const toggleFavorite = async (id: string) => {
    const prev = fav
    const next = fav.includes(id) ? fav.filter((x) => x !== id) : [...fav, id]
    setFav(next)
    const res = await setFavoriteCategories(next)
    if (res.error) {
      setFav(prev) // 롤백
      toast.error(res.error)
    }
  }

  // 내 분야 순서 이동(-1=위, +1=아래). 이웃과 자리 교환 후 저장.
  const moveFavorite = async (id: string, dir: -1 | 1) => {
    const idx = fav.indexOf(id)
    const target = idx + dir
    if (idx < 0 || target < 0 || target >= fav.length) return
    const prev = fav
    const next = [...fav]
    ;[next[idx], next[target]] = [next[target], next[idx]]
    setFav(next)
    const res = await setFavoriteCategories(next)
    if (res.error) {
      setFav(prev) // 롤백
      toast.error(res.error)
    }
  }

  // 메인 분야 카드(담기/빼기는 '내 분야 담기' 피커에서 관리). showReorder=true 면 순서 이동 ▲▼ 노출.
  const renderCard = (category: CategoryItem, showReorder: boolean) => {
    const fIdx = fav.indexOf(category.id)
    const isFirst = fIdx <= 0
    const isLast = fIdx === fav.length - 1
    // 섹션 헤더가 없는 평면 목록이므로, 어떤 카테고리(그룹)인지 카드에 표시한다(미분류는 생략).
    const grp = category.group_id ? groups.find((g) => g.id === category.group_id) : null
    return (
    <div key={category.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="p-5 flex items-center gap-4 border-b border-slate-100 dark:border-slate-700">
        <div className="text-4xl bg-slate-50 dark:bg-slate-700 p-3 rounded-lg">{iconFor(category)}</div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 truncate">{category.name}</h2>
          {category.description && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 truncate">{category.description}</p>
          )}
          {grp && (
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1 truncate">
              <span>{grp.icon || '🗂️'}</span>{grp.name}
            </p>
          )}
        </div>
        {showReorder && (
          <div className="shrink-0 flex flex-col gap-1">
            <button
              onClick={() => moveFavorite(category.id, -1)}
              disabled={isFirst}
              aria-label="위로 이동"
              className="w-7 h-7 flex items-center justify-center text-xs rounded-lg border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ▲
            </button>
            <button
              onClick={() => moveFavorite(category.id, 1)}
              disabled={isLast}
              aria-label="아래로 이동"
              className="w-7 h-7 flex items-center justify-center text-xs rounded-lg border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ▼
            </button>
          </div>
        )}
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
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
          내 분야 {favSet.size > 0 && <span className="text-sm font-normal text-slate-400 dark:text-slate-500">({favSet.size})</span>}
        </h2>
        <button
          onClick={() => setPickerOpen(true)}
          className="px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          + 내 분야 담기
        </button>
      </div>

      {/* 내 분야 검색 (담은 분야가 있을 때만) */}
      {myCategories.length > 0 && (
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 내 분야·카테고리 검색"
          className="w-full p-3 pl-4 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
        />
      )}

      {categories.length === 0 ? (
        <div className="p-8 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          현재 활성화된 학습 분야가 없습니다.
        </div>
      ) : myCategories.length === 0 ? (
        // 빈 상태 + 담기 CTA
        <div className="p-8 text-center bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <p className="text-4xl mb-3">📚</p>
          <p className="font-bold text-slate-700 dark:text-slate-200">아직 담은 분야가 없어요</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-4">관심 있는 분야를 담아 나만의 학습 목록을 만들어 보세요.</p>
          <button
            onClick={() => setPickerOpen(true)}
            className="px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl text-sm hover:bg-blue-700 transition-colors"
          >
            분야 담으러 가기
          </button>
        </div>
      ) : myVisible.length === 0 ? (
        <div className="p-8 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          &apos;{search}&apos; 검색 결과가 없습니다.
        </div>
      ) : (
        // 내 분야: 사용자 지정 순서대로 평면 표시. 검색 중이 아닐 때만 ▲▼ 순서 이동 노출.
        <div className="flex flex-col gap-3">
          {myVisible.map((c) => renderCard(c, !keyword))}
        </div>
      )}

      <CategoryPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        categories={categories}
        groups={groups}
        favSet={favSet}
        onToggle={toggleFavorite}
        onRequest={() => setReqOpen(true)}
      />

      <CategoryRequestModal open={reqOpen} groups={groups} onClose={() => setReqOpen(false)} />
    </div>
  )
}
