'use client'

import { useState } from 'react'
import { Modal } from '@/app/components/Modal'
import { useToast } from '@/app/components/Toast'
import { setCategoryGroup, setCategoriesGroup, classifyCategoriesWithAI, applyClassification } from './actions'
import type { Category, CategoryGroup } from '@/types/db'

type Change = {
  category_id: string
  icon: string
  name: string
  fromName: string
  toName: string
  isNew: boolean
  group_name: string // applyClassification 에 보낼 원본(빈 문자열=미분류)
}

export default function CategoryBoardModal({
  open,
  onClose,
  categories,
  groups,
  onChanged,
}: {
  open: boolean
  onClose: () => void
  categories: Category[]
  groups: CategoryGroup[]
  onChanged: () => void
}) {
  const toast = useToast()

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [bulkTarget, setBulkTarget] = useState('') // '' = 미분류
  const [aiLoading, setAiLoading] = useState(false)
  const [applying, setApplying] = useState(false)
  const [proposal, setProposal] = useState<Change[] | null>(null)
  // 신규 카테고리명 인라인 수정값. 키=AI 제안 원본명(소문자), 값=관리자가 다듬은 이름.
  const [newNameEdits, setNewNameEdits] = useState<Record<string, string>>({})

  const groupsSorted = [...groups].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, 'ko'))
  const groupIdSet = new Set(groups.map((g) => g.id))
  const groupNameOf = (gid: string) => groups.find((g) => g.id === gid)?.name
  const curGroupName = (c: Category) => (c.group_id && groupIdSet.has(c.group_id) ? groupNameOf(c.group_id)! : '미분류')

  const unassigned = categories.filter((c) => !c.group_id || !groupIdSet.has(c.group_id))
  const sections = [
    ...groupsSorted.map((g) => ({ key: g.id, label: g.name, icon: g.icon, items: categories.filter((c) => c.group_id === g.id) })),
    ...(unassigned.length ? [{ key: '__none__', label: '미분류', icon: '📦', items: unassigned }] : []),
  ]

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  const toggleCollapsed = (key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }

  const handleMove = async (id: string, groupId: string | null) => {
    const res = await setCategoryGroup(id, groupId)
    if (res.error) return toast.error(res.error)
    onChanged()
  }

  const handleBulkMove = async () => {
    const ids = [...selectedIds]
    const res = await setCategoriesGroup(ids, bulkTarget || null)
    if (res.error) return toast.error(res.error)
    toast.success(`${res.count}개 분야를 이동했어요.`)
    setSelectedIds(new Set())
    onChanged()
  }

  const handleClassify = async () => {
    setAiLoading(true)
    const res = await classifyCategoriesWithAI()
    setAiLoading(false)
    if (res.error) return toast.error(res.error)

    const existingByLower = new Map(groups.map((g) => [g.name.trim().toLowerCase(), g]))
    const changes: Change[] = []
    for (const a of res.assignments ?? []) {
      const cat = categories.find((c) => c.id === a.category_id)
      if (!cat) continue
      const gn = a.group_name.trim()
      const curId = cat.group_id && groupIdSet.has(cat.group_id) ? cat.group_id : null
      const existing = gn ? existingByLower.get(gn.toLowerCase()) : undefined
      if (existing) {
        if (curId === existing.id) continue // 이미 같은 그룹 → 변경 아님
        changes.push({ category_id: cat.id, icon: cat.icon || '💡', name: cat.name, fromName: curGroupName(cat), toName: existing.name, isNew: false, group_name: existing.name })
      } else if (gn) {
        changes.push({ category_id: cat.id, icon: cat.icon || '💡', name: cat.name, fromName: curGroupName(cat), toName: gn, isNew: true, group_name: gn })
      } else if (curId) {
        // 미분류로 강등(현재 그룹이 있을 때만 변경)
        changes.push({ category_id: cat.id, icon: cat.icon || '💡', name: cat.name, fromName: curGroupName(cat), toName: '미분류', isNew: false, group_name: '' })
      }
    }

    if (changes.length === 0) {
      toast.success('이미 적절히 분류되어 있어요. 변경 제안이 없습니다.')
      return
    }
    // 신규 카테고리명을 그룹(원본명) 단위로 초기화 → 적용 전 수정 가능
    const edits: Record<string, string> = {}
    for (const ch of changes) {
      if (!ch.isNew) continue
      const k = ch.group_name.toLowerCase()
      if (!(k in edits)) edits[k] = ch.group_name
    }
    setNewNameEdits(edits)
    setProposal(changes)
  }

  const backToBoard = () => { setProposal(null); setNewNameEdits({}) }

  const handleApply = async () => {
    if (!proposal) return
    // 신규 항목은 관리자가 다듬은 이름으로, 나머지는 원래 대상 그대로 적용
    const assignments = proposal.map((p) => ({
      category_id: p.category_id,
      group_name: p.isNew ? (newNameEdits[p.group_name.toLowerCase()] ?? p.group_name).trim() : p.group_name,
    }))
    setApplying(true)
    const res = await applyClassification(assignments)
    setApplying(false)
    if (res.error) return toast.error(res.error)
    toast.success(`${res.moved}개 분야를 분류했어요${res.created ? ` (새 카테고리 ${res.created}개 생성)` : ''}.`)
    setProposal(null)
    setNewNameEdits({})
    setSelectedIds(new Set())
    onChanged()
  }

  const close = () => { setProposal(null); setNewNameEdits({}); setSelectedIds(new Set()); onClose() }

  // 신규 카테고리명 수정 관련 파생값
  const existingLower = new Set(groups.map((g) => g.name.trim().toLowerCase()))
  const newKeys = Object.keys(newNameEdits) // AI 제안 원본명(소문자)
  const hasEmptyNew = newKeys.some((k) => !newNameEdits[k].trim())
  const displayTo = (p: Change) => (p.isNew ? (newNameEdits[p.group_name.toLowerCase()]?.trim() || '(미입력)') : p.toName)
  const newGroupCount = proposal
    ? new Set(newKeys.map((k) => newNameEdits[k].trim().toLowerCase()).filter((v) => v && !existingLower.has(v))).size
    : 0

  return (
    <Modal open={open} onClose={close} className="max-w-2xl" labelledBy="board-title">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="board-title" className="text-lg font-black text-slate-800 dark:text-slate-100">🗂️ 카테고리 관리</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">분야를 상위 카테고리로 옮기거나, AI로 한 번에 분류합니다.</p>
          </div>
          {!proposal && (
            <button
              onClick={handleClassify}
              disabled={aiLoading || categories.length === 0}
              className="shrink-0 px-3 py-2 text-xs font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {aiLoading ? '분석 중…' : '✨ AI 자동 분류'}
            </button>
          )}
        </div>

        {proposal ? (
          // ── AI 분류 제안 미리보기(승인 전 DB 미반영) ──
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                AI 제안 <span className="text-indigo-600 dark:text-indigo-400">{proposal.length}건 변경</span>
                {newGroupCount > 0 && <span className="ml-1 font-normal text-slate-400 dark:text-slate-500">· 새 카테고리 {newGroupCount}개</span>}
              </p>
              <button onClick={backToBoard} className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">← 보드로</button>
            </div>

            {/* 신규 카테고리명 인라인 수정 (그룹 단위 — 같은 이름의 분야들에 함께 반영) */}
            {newKeys.length > 0 && (
              <div className="space-y-2 rounded-lg border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-900/10 p-3">
                <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300">✏️ 새 카테고리명 (적용 전 수정 가능)</p>
                {newKeys.map((k) => (
                  <input
                    key={k}
                    value={newNameEdits[k]}
                    onChange={(e) => setNewNameEdits((prev) => ({ ...prev, [k]: e.target.value }))}
                    placeholder="카테고리명을 입력하세요"
                    className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                ))}
                <p className="text-[11px] text-slate-400 dark:text-slate-500">기존 카테고리명과 같게 입력하면 그 카테고리로 합쳐집니다.</p>
                {hasEmptyNew && <p className="text-[11px] font-bold text-red-500">새 카테고리명을 비울 수 없습니다.</p>}
              </div>
            )}

            <div className="max-h-[50vh] overflow-y-auto space-y-1 border border-slate-200 dark:border-slate-700 rounded-lg p-2">
              {proposal.map((p) => (
                <div key={p.category_id} className="flex items-center gap-2 px-2 py-1.5 text-sm">
                  <span className="text-lg shrink-0">{p.icon}</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100 truncate min-w-0 flex-1">{p.name}</span>
                  <span className="shrink-0 flex items-center gap-1.5 text-xs">
                    <span className="text-slate-400 dark:text-slate-500">{p.fromName}</span>
                    <span className="text-slate-300 dark:text-slate-600">→</span>
                    <span className="font-bold text-slate-700 dark:text-slate-200">{displayTo(p)}</span>
                    {p.isNew && <span className="px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 font-bold">신규</span>}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={handleApply} disabled={applying || hasEmptyNew} className="flex-1 p-3 bg-indigo-600 text-white font-bold rounded-xl text-sm hover:bg-indigo-700 disabled:opacity-50">
                {applying ? '적용 중…' : `이대로 적용 (${proposal.length}건)`}
              </button>
              <button onClick={backToBoard} className="flex-1 p-3 bg-slate-100 text-slate-700 font-bold rounded-xl text-sm hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600">취소</button>
            </div>
          </div>
        ) : (
          <>
            {/* 일괄 이동 바 */}
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/50">
                <span className="text-xs font-bold text-blue-700 dark:text-blue-300 shrink-0">{selectedIds.size}개 선택</span>
                <select value={bulkTarget} onChange={(e) => setBulkTarget(e.target.value)} className="flex-1 min-w-0 p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-100">
                  <option value="">미분류</option>
                  {groupsSorted.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
                <button onClick={handleBulkMove} className="shrink-0 px-3 py-2 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700">이동</button>
                <button onClick={() => setSelectedIds(new Set())} className="shrink-0 px-2 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-200">해제</button>
              </div>
            )}

            {/* 카테고리별 분야 보드 */}
            {categories.length === 0 ? (
              <p className="text-center text-sm text-slate-400 dark:text-slate-500 py-8">등록된 분야가 없습니다.</p>
            ) : (
              <div className="max-h-[55vh] overflow-y-auto space-y-3 -mx-1 px-1">
                {sections.map((sec) => {
                  const isCollapsed = collapsed.has(sec.key)
                  return (
                    <div key={sec.key} className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                      <button
                        type="button"
                        onClick={() => toggleCollapsed(sec.key)}
                        aria-expanded={!isCollapsed}
                        className="w-full flex items-center gap-1.5 px-3 py-2 bg-slate-50 dark:bg-slate-900/50 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <span className="w-3 shrink-0 text-[10px] text-slate-400">{isCollapsed ? '▸' : '▾'}</span>
                        {sec.icon && <span>{sec.icon}</span>}
                        <span>{sec.label}</span>
                        <span className="font-normal text-slate-400 dark:text-slate-500">({sec.items.length})</span>
                      </button>
                      {!isCollapsed && (
                        <div className="divide-y divide-slate-100 dark:divide-slate-700">
                          {sec.items.length === 0 ? (
                            <p className="px-3 py-2.5 text-xs text-slate-400 dark:text-slate-500">이 카테고리에 속한 분야가 없습니다.</p>
                          ) : (
                            sec.items.map((c) => (
                              <div key={c.id} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/40">
                                <input
                                  type="checkbox"
                                  checked={selectedIds.has(c.id)}
                                  onChange={() => toggleSelect(c.id)}
                                  className="shrink-0 w-4 h-4 accent-blue-600"
                                />
                                <span className="text-lg shrink-0">{c.icon || '💡'}</span>
                                <span className="flex-1 min-w-0">
                                  <span className="block text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{c.name}</span>
                                  <span className="block text-[11px] font-mono uppercase text-slate-400 dark:text-slate-500 truncate">{c.id}</span>
                                </span>
                                <select
                                  value={c.group_id || ''}
                                  onChange={(e) => handleMove(c.id, e.target.value || null)}
                                  className="shrink-0 max-w-[40%] p-1.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-200"
                                >
                                  <option value="">미분류</option>
                                  {groupsSorted.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                                </select>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            <button onClick={close} className="w-full p-3 bg-slate-100 text-slate-700 font-bold rounded-xl text-sm hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600">닫기</button>
          </>
        )}
      </div>
    </Modal>
  )
}
