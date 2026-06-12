'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Modal } from '@/app/components/Modal'
import { useToast } from '@/app/components/Toast'
import { setFavoriteCategories, submitCategoryRequest } from './actions'

interface CategoryItem {
  id: string
  name: string
  icon: string | null
  description: string | null
  group_id: string | null
}
interface GroupItem {
  id: string
  name: string
  icon: string | null
  sort_order: number
}

const FALLBACK_ICONS: Record<string, string> = { java: '☕', spring: '🍃', python: '🐍', react: '⚛️' }
function iconFor(c: CategoryItem) {
  return c.icon || FALLBACK_ICONS[c.id] || '💡'
}

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
  const [search, setSearch] = useState('')
  const [mode, setMode] = useState<'all' | 'mine'>('all')
  const [favSet, setFavSet] = useState<Set<string>>(() => new Set(favorites))

  // 신청 모달
  const [reqOpen, setReqOpen] = useState(false)
  const [reqName, setReqName] = useState('')
  const [reqDesc, setReqDesc] = useState('')
  const [reqGroup, setReqGroup] = useState('')
  const [reqReason, setReqReason] = useState('')
  const [reqSaving, setReqSaving] = useState(false)

  const keyword = search.trim().toLowerCase()
  const hasGroups = groups.length > 0

  const visible = categories
    .filter((c) => (mode === 'mine' ? favSet.has(c.id) : true))
    .filter((c) => !keyword || c.id.toLowerCase().includes(keyword) || c.name.toLowerCase().includes(keyword))

  // 그룹 섹션 구성 (sort_order → 이름순, 미분류는 마지막 '기타')
  const groupsSorted = [...groups].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, 'ko'))
  const groupIds = new Set(groups.map((g) => g.id))
  const sections = hasGroups
    ? [
        ...groupsSorted.map((g) => ({ key: g.id, label: g.name, icon: g.icon, items: visible.filter((c) => c.group_id === g.id) })),
        { key: '__none__', label: '기타', icon: '📦', items: visible.filter((c) => !c.group_id || !groupIds.has(c.group_id)) },
      ].filter((s) => s.items.length > 0)
    : [{ key: '__all__', label: '', icon: null, items: visible }]

  const toggleFavorite = async (id: string) => {
    const next = new Set(favSet)
    if (next.has(id)) next.delete(id); else next.add(id)
    setFavSet(next)
    const res = await setFavoriteCategories([...next])
    if (res.error) {
      setFavSet(favSet) // 롤백
      toast.error(res.error)
    }
  }

  const submitRequest = async () => {
    setReqSaving(true)
    const res = await submitCategoryRequest({ name: reqName, description: reqDesc, groupId: reqGroup || null, reason: reqReason })
    setReqSaving(false)
    if (res.error) { toast.error(res.error); return }
    toast.success('분야 신청이 접수되었습니다. 관리자 검토 후 반영됩니다.')
    setReqOpen(false)
    setReqName(''); setReqDesc(''); setReqGroup(''); setReqReason('')
  }

  const renderCard = (category: CategoryItem) => (
    <div key={category.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="p-5 flex items-center gap-4 border-b border-slate-100 dark:border-slate-700">
        <div className="text-4xl bg-slate-50 dark:bg-slate-700 p-3 rounded-lg">{iconFor(category)}</div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 truncate">{category.name}</h2>
          {category.description && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 truncate">{category.description}</p>
          )}
          <p className="text-xs text-slate-400 dark:text-slate-500 uppercase mt-0.5">{category.id}</p>
        </div>
        <button
          onClick={() => toggleFavorite(category.id)}
          title={favSet.has(category.id) ? '즐겨찾기 해제' : '내 분야로 추가'}
          aria-pressed={favSet.has(category.id)}
          className="shrink-0 text-2xl leading-none p-1 transition-transform hover:scale-110"
        >
          {favSet.has(category.id) ? '⭐' : '☆'}
        </button>
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">학습 분야 선택</h2>
        <button onClick={() => setReqOpen(true)} className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">+ 분야 신청</button>
      </div>

      {/* 전체 / 내 분야 토글 */}
      <div className="flex gap-1.5">
        {(['all', 'mine'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
              mode === m
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700'
            }`}
          >
            {m === 'all' ? '전체' : `내 분야 (${favSet.size})`}
          </button>
        ))}
      </div>

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
      ) : mode === 'mine' && favSet.size === 0 ? (
        <div className="p-8 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          아직 즐겨찾기한 분야가 없습니다. 카드의 ☆를 눌러 내 분야로 모아보세요.
        </div>
      ) : visible.length === 0 ? (
        <div className="p-8 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          &apos;{search}&apos; 검색 결과가 없습니다.
        </div>
      ) : (
        sections.map((sec) => (
          <div key={sec.key} className="flex flex-col gap-3">
            {sec.label && (
              <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1.5">
                {sec.icon && <span>{sec.icon}</span>}{sec.label}
                <span className="text-xs font-normal text-slate-400 dark:text-slate-500">({sec.items.length})</span>
              </h3>
            )}
            {sec.items.map(renderCard)}
          </div>
        ))
      )}

      {/* 분야 신청 모달 */}
      <Modal open={reqOpen} onClose={() => setReqOpen(false)} className="max-w-md" labelledBy="req-title">
        <div className="space-y-4">
          <div>
            <h2 id="req-title" className="text-lg font-black text-slate-800 dark:text-slate-100">분야 신청</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">원하는 학습 분야를 신청하면 관리자 검토 후 추가됩니다.</p>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">분야명 <span className="text-red-500">*</span></label>
            <input value={reqName} onChange={(e) => setReqName(e.target.value)} placeholder="예: Kubernetes" className="w-full p-3 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">분야 설명 <span className="text-red-500">*</span></label>
            <input value={reqDesc} onChange={(e) => setReqDesc(e.target.value)} placeholder="무엇을 다루는 분야인지 한 줄로" className="w-full p-3 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          {groups.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">상위 카테고리 <span className="font-normal text-slate-400">(선택)</span></label>
              <select value={reqGroup} onChange={(e) => setReqGroup(e.target.value)} className="w-full p-3 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-100">
                <option value="">선택 안 함</option>
                {groupsSorted.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">신청 사유·예시 주제 <span className="font-normal text-slate-400">(선택)</span></label>
            <textarea value={reqReason} onChange={(e) => setReqReason(e.target.value)} rows={3} placeholder="예: 컨테이너 오케스트레이션 학습용. 파드/서비스/디플로이먼트 위주." className="w-full p-3 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={submitRequest} disabled={reqSaving || !reqName.trim() || !reqDesc.trim()} className="flex-1 p-3 bg-blue-600 text-white font-bold rounded-xl text-sm hover:bg-blue-700 disabled:opacity-50">{reqSaving ? '접수 중...' : '신청하기'}</button>
            <button onClick={() => setReqOpen(false)} className="flex-1 p-3 bg-slate-100 text-slate-700 font-bold rounded-xl text-sm hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600">취소</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
