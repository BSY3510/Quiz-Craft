'use client'

import { useState } from 'react'
import { Modal } from '@/app/components/Modal'
import { type CategoryItem, type GroupItem, iconFor, groupIntoSections, matchCategory } from './categoryShared'

// 내 분야 담기(피커) 모달. 카테고리별 그룹 + 검색 + 체크박스로 즐겨찾기를 즉시 토글한다.
export default function CategoryPickerModal({
  open,
  onClose,
  categories,
  groups,
  favSet,
  onToggle,
  onRequest,
}: {
  open: boolean
  onClose: () => void
  categories: CategoryItem[]
  groups: GroupItem[]
  favSet: Set<string>
  onToggle: (id: string) => void
  onRequest: () => void
}) {
  const [search, setSearch] = useState('')
  // 카테고리(그룹) 섹션 접기/펼치기. 기본 펼침(빈 Set = 모두 펼침).
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const toggleCollapsed = (key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }

  const kw = search.trim().toLowerCase()
  const visible = categories.filter((c) => matchCategory(c, kw, groups))
  const sections = groupIntoSections(visible, groups)

  const renderRow = (category: CategoryItem) => (
    <label
      key={category.id}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50"
    >
      <input
        type="checkbox"
        checked={favSet.has(category.id)}
        onChange={() => onToggle(category.id)}
        className="shrink-0 w-4 h-4 accent-blue-600"
      />
      <span className="text-xl shrink-0">{iconFor(category)}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{category.name}</span>
        {category.description && (
          <span className="block text-xs text-slate-500 dark:text-slate-400 truncate">{category.description}</span>
        )}
      </span>
    </label>
  )

  return (
    <Modal open={open} onClose={onClose} className="max-w-lg" labelledBy="picker-title">
      <div className="space-y-4">
        <div>
          <h2 id="picker-title" className="text-lg font-black text-slate-800 dark:text-slate-100">내 분야 담기</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            체크한 분야가 내 분야 목록에 바로 반영됩니다.
            {favSet.size > 0 && <span className="font-bold text-blue-600 dark:text-blue-400"> {favSet.size}개 담음</span>}
          </p>
        </div>

        {categories.length === 0 ? (
          <p className="text-center text-sm text-slate-400 dark:text-slate-500 py-8">현재 활성화된 학습 분야가 없습니다.</p>
        ) : (
          <>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="🔍 분야·카테고리 검색"
              className="w-full p-3 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="max-h-[55vh] overflow-y-auto -mx-1 px-1 space-y-3">
              {visible.length === 0 ? (
                <p className="text-center text-sm text-slate-400 dark:text-slate-500 py-8">&apos;{search}&apos; 검색 결과가 없습니다.</p>
              ) : (
                sections.map((sec) => {
                  // 검색 중에는 접힘 상태를 무시하고 항상 펼친다(매칭 결과가 숨지 않도록).
                  const isCollapsed = !!sec.label && !kw && collapsed.has(sec.key)
                  return (
                    <div key={sec.key}>
                      {sec.label && (
                        <button
                          type="button"
                          onClick={() => toggleCollapsed(sec.key)}
                          aria-expanded={!isCollapsed}
                          className="w-full flex items-center gap-1.5 px-1 mb-1 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                        >
                          <span className="w-3 shrink-0 text-[10px]">{isCollapsed ? '▸' : '▾'}</span>
                          {sec.icon && <span>{sec.icon}</span>}
                          <span>{sec.label}</span>
                          <span className="font-normal text-slate-400 dark:text-slate-500">({sec.items.length})</span>
                        </button>
                      )}
                      {!isCollapsed && <div className="space-y-0.5">{sec.items.map(renderRow)}</div>}
                    </div>
                  )
                })
              )}
            </div>
          </>
        )}

        <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
          <button
            onClick={() => { onClose(); onRequest() }}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline text-left"
          >
            찾는 분야가 없나요? 분야 신청 →
          </button>
          <button
            onClick={onClose}
            className="shrink-0 px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-sm hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
          >
            완료
          </button>
        </div>
      </div>
    </Modal>
  )
}
