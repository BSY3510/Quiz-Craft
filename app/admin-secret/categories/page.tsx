'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { useAdminPath } from '../useAdminPath'
import { createCategory, toggleCategoryActive, updateCategory, deleteCategory, createGroup, updateGroup, deleteGroup } from './actions'
import { useToast } from '@/app/components/Toast'
import { useConfirm } from '@/app/components/Confirm'
import { Modal } from '@/app/components/Modal'
import CategoryBoardModal from './CategoryBoardModal'
import type { Category, CategoryGroup } from '@/types/db'

// 분야 아이콘 빠른 선택용 프리셋(프로그래밍/학습 분야 위주). 직접 입력도 가능.
const PRESET_ICONS = ['💡', '🟦', '🟨', '🐍', '☕', '🗄️', '🌐', '⚛️', '📱', '🔧', '🧮', '📊', '🔐', '🐳', '🦀', '🐘', '📦', '🧪', '🖥️', '⚙️', '📚', '🧩', '🚀', '🔥']

// 분야 통계 모달용 라벨/색상 (status·type·difficulty 표시 순서 고정)
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

interface CategoryStats {
  total: number
  status: Record<string, number>
  type: Record<string, number>
  difficulty: Record<string, number>
}

function tally(rows: { type: string; status: string; difficulty: string }[]) {
  const acc = (sel: (r: { type: string; status: string; difficulty: string }) => string) => {
    const m: Record<string, number> = {}
    for (const r of rows) { const k = sel(r) || '기타'; m[k] = (m[k] || 0) + 1 }
    return m
  }
  return {
    total: rows.length,
    status: acc((r) => r.status),
    type: acc((r) => r.type),
    difficulty: acc((r) => r.difficulty),
  }
}

export default function AdminCategoriesPage() {
  const supabase = createClient()
  const adminPath = useAdminPath()
  const toast = useToast()
  const confirm = useConfirm()

  const [categories, setCategories] = useState<Category[]>([])
  const [groups, setGroups] = useState<CategoryGroup[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // 그룹 관리 폼 + 인라인 편집
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupIcon, setNewGroupIcon] = useState('')
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [egName, setEgName] = useState('')
  const [egIcon, setEgIcon] = useState('')

  // 등록/수정 폼 상태 관리
  const [newId, setNewId] = useState('')
  const [newName, setNewName] = useState('')
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [search, setSearch] = useState('')

  // 카테고리 관리(분야 분류) 보드 모달
  const [boardOpen, setBoardOpen] = useState(false)

  // 분야 통계 모달 상태
  const [statsCategory, setStatsCategory] = useState<Category | null>(null)
  const [statsData, setStatsData] = useState<CategoryStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)

  // 검색 필터 (식별 ID 또는 분야명)
  const keyword = search.trim().toLowerCase()
  const filteredCategories = keyword
    ? categories.filter(c =>
        c.id.toLowerCase().includes(keyword) || (c.name || '').toLowerCase().includes(keyword))
    : categories

  // 분야·그룹 목록 불러오기
  const fetchCategories = async () => {
    setIsLoading(true)
    const [{ data: cats }, { data: grps }] = await Promise.all([
      supabase.from('categories').select('*').order('created_at', { ascending: true }),
      supabase.from('category_groups').select('*').order('sort_order'),
    ])
    if (cats) setCategories(cats)
    if (grps) setGroups(grps)
    setIsLoading(false)
  }

  useEffect(() => {
    fetchCategories()
  }, [supabase])

  // 그룹 추가/삭제
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newGroupName.trim()) return
    const res = await createGroup(newGroupName, newGroupIcon)
    if (res.error) { toast.error(res.error); return }
    toast.success('그룹이 추가되었습니다.')
    setNewGroupName(''); setNewGroupIcon('')
    fetchCategories()
  }

  const handleDeleteGroup = async (g: CategoryGroup) => {
    const ok = await confirm({
      title: '그룹 삭제',
      message: `「${g.name}」 그룹을 삭제할까요?\n이 그룹에 속한 분야는 삭제되지 않고 '미분류(기타)'로 이동합니다.`,
      confirmText: '삭제',
      danger: true,
    })
    if (!ok) return
    const res = await deleteGroup(g.id)
    if (res.error) { toast.error(res.error); return }
    toast.success('그룹이 삭제되었습니다.')
    fetchCategories()
  }

  const handleRenameGroup = async (g: CategoryGroup, name: string, icon: string) => {
    const res = await updateGroup(g.id, name, icon, g.sort_order)
    if (res.error) { toast.error(res.error); return }
    toast.success('그룹이 수정되었습니다.')
    fetchCategories()
  }

  const groupName = (id: string | null) => (id ? groups.find((g) => g.id === id)?.name ?? null : null)

  // 1. 신규 분야 등록
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newId.trim() || !newName.trim()) return

    const res = await createCategory(newId, newName)
    if (!res.error) {
      toast.success('새로운 분야가 등록되었습니다.')
      setNewId('')
      setNewName('')
      fetchCategories()
    } else {
      toast.error(`등록 실패: ${res.error}`)
    }
  }

  // 2. 분야 활성/비활성 토글
  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    const res = await toggleCategoryActive(id, currentStatus)
    if (!res.error) {
      setCategories(categories.map(c => c.id === id ? { ...c, active: !currentStatus } : c))
    } else {
      toast.error(res.error)
    }
  }

  // 3. 분야명 수정 저장
  const handleSaveEdit = async () => {
    if (!editingCategory || !editingCategory.name.trim()) return

    const res = await updateCategory(editingCategory.id, {
      name: editingCategory.name,
      prompt: editingCategory.prompt || '',
      icon: editingCategory.icon || '',
      description: editingCategory.description || '',
      ai_name: editingCategory.ai_name || '',
      group_id: editingCategory.group_id || null,
    })
    if (!res.error) {
      toast.success('분야 정보가 수정되었습니다.')
      setEditingCategory(null)
      fetchCategories()
    } else {
      toast.error(`수정 중 오류가 발생했습니다: ${res.error}`)
    }
  }

  // 4. 분야 완전 삭제
  const handleDeleteCategory = async (id: string) => {
    const ok = await confirm({
      title: '분야 삭제',
      message: `정말로 [${id}] 분야를 완전히 삭제할까요?\n삭제 시 해당 분야 정보가 사라집니다.`,
      confirmText: '삭제',
      danger: true,
    })
    if (!ok) return

    const res = await deleteCategory(id)
    if (!res.error) {
      toast.success('분야가 성공적으로 삭제되었습니다.')
      fetchCategories()
    } else {
      toast.error(`삭제 실패: ${res.error}`)
    }
  }

  // 5. 분야 통계 보기 — 해당 분야 문제만 조회해 클라이언트에서 집계(상태/유형/난이도)
  const handleOpenStats = async (category: Category) => {
    setStatsCategory(category)
    setStatsData(null)
    setStatsLoading(true)
    const { data, error } = await supabase
      .from('questions')
      .select('type, status, difficulty')
      .eq('category_id', category.id)
    if (error) {
      toast.error('통계를 불러오지 못했습니다.')
      setStatsLoading(false)
      return
    }
    setStatsData(tally((data ?? []) as { type: string; status: string; difficulty: string }[]))
    setStatsLoading(false)
  }

  // 통계 한 그룹(상태/유형/난이도) 렌더 — 라벨·카운트·비율 막대. meta 외 값은 '기타'로 합산.
  const renderStatGroup = (
    title: string,
    meta: { key: string; label: string; color: string }[],
    counts: Record<string, number>,
    total: number
  ) => {
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

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6 relative">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100">📚 퀴즈 분야 관리</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">사용자들이 풀이할 학습 분야(카테고리)를 추가, 수정, 삭제합니다.</p>
          </div>
          <Link href={adminPath} className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline">
            ← 관리자 센터로
          </Link>
        </header>

        {/* 신규 등록 폼 */}
        <section className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">✨ 신규 분야 생성</h2>
          <form onSubmit={handleCreateCategory} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="분야 식별 ID (예: nextjs, sql)"
              value={newId}
              onChange={(e) => setNewId(e.target.value)}
              className="flex-1 p-3 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 rounded-lg text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <input
              type="text"
              placeholder="표시용 이름 (예: Next.js, SQL 데이터베이스)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1 p-3 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 rounded-lg text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <button type="submit" className="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 text-sm transition-colors whitespace-nowrap">
              + 분야 추가
            </button>
          </form>
        </section>

        {/* 상위 그룹 관리 (7번) */}
        <section className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300">🗂️ 상위 그룹 관리 <span className="font-normal text-slate-400 dark:text-slate-500">(분야를 묶어 사용자 화면에 섹션으로 노출)</span></h2>
            <button onClick={() => setBoardOpen(true)} className="shrink-0 px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 whitespace-nowrap">🗂️ 카테고리 관리 · AI 분류</button>
          </div>
          <form onSubmit={handleCreateGroup} className="flex gap-2">
            <input value={newGroupIcon} onChange={(e) => setNewGroupIcon(e.target.value)} placeholder="🗂️" className="w-16 text-center p-2.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500" />
            <input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="그룹명 (예: 프로그래밍)" className="flex-1 p-2.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500" />
            <button type="submit" className="px-4 py-2.5 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-900 text-sm whitespace-nowrap dark:bg-slate-700 dark:hover:bg-slate-600">+ 그룹</button>
          </form>
          {groups.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {groups.map((g) =>
                editingGroupId === g.id ? (
                  <div key={g.id} className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900/50 rounded-lg p-1 border border-blue-300 dark:border-blue-700">
                    <input value={egIcon} onChange={(e) => setEgIcon(e.target.value)} className="w-10 text-center p-1.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 rounded text-sm text-slate-800 dark:text-slate-100" />
                    <input value={egName} onChange={(e) => setEgName(e.target.value)} className="w-28 p-1.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 rounded text-sm text-slate-800 dark:text-slate-100" />
                    <button onClick={() => { handleRenameGroup(g, egName, egIcon); setEditingGroupId(null) }} className="px-2 py-1 bg-blue-600 text-white text-xs font-bold rounded">저장</button>
                    <button onClick={() => setEditingGroupId(null)} className="px-2 py-1 text-slate-500 text-xs font-bold">취소</button>
                  </div>
                ) : (
                  <div key={g.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg">
                    <span>{g.icon || '🗂️'}</span>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{g.name}</span>
                    <span className="text-xs text-slate-400 dark:text-slate-500">({categories.filter((c) => c.group_id === g.id).length})</span>
                    <button onClick={() => { setEditingGroupId(g.id); setEgName(g.name); setEgIcon(g.icon || '') }} className="ml-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" title="수정">✏️</button>
                    <button onClick={() => handleDeleteGroup(g)} className="text-xs text-slate-400 hover:text-red-500" title="삭제">🗑️</button>
                  </div>
                )
              )}
            </div>
          )}
        </section>

        {/* 분야 검색 */}
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 분야 검색 (ID 또는 이름)"
            className="w-full p-3 pl-4 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          />
          {keyword && (
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400 dark:text-slate-500">{filteredCategories.length}개</span>
          )}
        </div>

        {/* 분야 리스트 테이블 */}
        <section className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400 font-bold">분야 목록을 불러오는 중...</div>
          ) : categories.length === 0 ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400">등록된 분야가 없습니다.</div>
          ) : filteredCategories.length === 0 ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400">&apos;{search}&apos; 검색 결과가 없습니다.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="p-4 font-bold">식별 ID</th>
                    <th className="p-4 font-bold">분야명 (표시 이름)</th>
                    <th className="p-4 font-bold">노출 상태</th>
                    <th className="p-4 font-bold text-right">관리 액션</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-slate-800 dark:text-slate-200">
                  {filteredCategories.map(category => (
                    <tr key={category.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="p-4 font-mono text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">{category.id}</td>
                      <td className="p-4 font-bold">
                        <span className="mr-2">{category.icon || '💡'}</span>
                        {category.name}
                        {groupName(category.group_id) && (
                          <span className="ml-2 px-2 py-0.5 text-xs font-bold rounded-full bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300">{groupName(category.group_id)}</span>
                        )}
                      </td>
                      <td className="p-4">
                        <button 
                          onClick={() => handleToggleActive(category.id, category.active)}
                          className={`px-3 py-1 text-xs font-bold rounded-full transition-colors ${category.active ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-300' : 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300'}`}
                        >
                          {category.active ? '● 노출 활성화' : '○ 숨김 비활성화'}
                        </button>
                      </td>
                      <td className="p-4 text-right space-x-2 whitespace-nowrap">
                        <button
                          onClick={() => handleOpenStats(category)}
                          className="px-2.5 py-1.5 bg-blue-50 text-blue-600 text-xs font-bold rounded hover:bg-blue-100 border border-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-900/50 dark:hover:bg-blue-900/50"
                        >
                          📊 통계
                        </button>
                        <button
                          onClick={() => setEditingCategory({ ...category })}
                          className="px-2.5 py-1.5 bg-slate-100 text-slate-600 text-xs font-bold rounded hover:bg-slate-200 border border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-600"
                        >
                          ✏️ 수정
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(category.id)}
                          className="px-2.5 py-1.5 bg-red-50 text-red-600 text-xs font-bold rounded hover:bg-red-100 border border-red-100 dark:bg-red-900/30 dark:text-red-400 dark:border-red-900/50 dark:hover:bg-red-900/50"
                        >
                          🗑️ 영구 삭제
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* 카테고리 관리(분야 분류) 보드 모달 + AI 자동 분류 */}
      <CategoryBoardModal
        open={boardOpen}
        onClose={() => setBoardOpen(false)}
        categories={categories}
        groups={groups}
        onChanged={fetchCategories}
      />

      {/* 분야 정보 수정 모달 */}
      <Modal open={!!editingCategory} onClose={() => setEditingCategory(null)} className="max-w-sm" labelledBy="cat-edit-title">
        {editingCategory && (
          <div className="space-y-4">
            <h2 id="cat-edit-title" className="text-lg font-black text-slate-800 dark:text-slate-100">📚 분야 정보 수정</h2>
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 mb-1">분야 ID (변경 불가)</label>
              <input type="text" value={editingCategory.id} disabled className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-lg font-mono text-sm text-slate-400 uppercase dark:bg-slate-900 dark:border-slate-700 dark:text-slate-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">표시 이름 <span className="font-normal text-slate-400 dark:text-slate-500">(사용자 화면에 보이는 짧은 이름)</span></label>
              <input
                type="text"
                value={editingCategory.name}
                onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                placeholder="예: 홍길동"
                className="w-full p-3 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 rounded-lg text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">부제(설명) <span className="font-normal text-slate-400 dark:text-slate-500">(선택 · 카드 부제로 표시)</span></label>
              <input
                type="text"
                value={editingCategory.description || ''}
                onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
                placeholder="예: 1990년대 발라드 가수"
                className="w-full p-3 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">AI용 이름 <span className="font-normal text-slate-400 dark:text-slate-500">(선택 · 화면에 안 보임 · 비우면 표시 이름 사용)</span></label>
              <input
                type="text"
                value={editingCategory.ai_name || ''}
                onChange={(e) => setEditingCategory({ ...editingCategory, ai_name: e.target.value })}
                placeholder="예: 홍길동(1990년대 발라드 가수) — 동명이인 구분용"
                className="w-full p-3 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">출제 프롬프트의 <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded font-mono">{'{{category}}'}</code> 치환에 사용됩니다. 동명이인·중의어 분야의 정확도를 위해 사용.</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">상위 그룹 <span className="font-normal text-slate-400 dark:text-slate-500">(선택 · 비우면 미분류)</span></label>
              <select
                value={editingCategory.group_id || ''}
                onChange={(e) => setEditingCategory({ ...editingCategory, group_id: e.target.value || null })}
                className="w-full p-3 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-100"
              >
                <option value="">미분류</option>
                {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">분야 아이콘 <span className="font-normal text-slate-400 dark:text-slate-500">(선택 · 비우면 기본 💡)</span></label>
              <div className="flex items-center gap-2">
                <div className="w-12 h-12 shrink-0 flex items-center justify-center text-2xl bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
                  {editingCategory.icon || '💡'}
                </div>
                <input
                  type="text"
                  value={editingCategory.icon || ''}
                  onChange={(e) => setEditingCategory({ ...editingCategory, icon: e.target.value })}
                  placeholder="이모지 직접 입력"
                  className="flex-1 p-2.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setEditingCategory({ ...editingCategory, icon: '' })}
                  className="shrink-0 px-3 py-2.5 text-xs font-bold rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                >
                  기본값
                </button>
              </div>
              <div className="grid grid-cols-8 gap-1.5 mt-2">
                {PRESET_ICONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setEditingCategory({ ...editingCategory, icon: emoji })}
                    className={`aspect-square flex items-center justify-center text-lg rounded-lg border transition-colors ${
                      editingCategory.icon === emoji
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                        : 'border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">분야별 출제 가이드 <span className="font-normal text-slate-400 dark:text-slate-500">(선택)</span></label>
              <textarea
                value={editingCategory.prompt || ''}
                onChange={(e) => setEditingCategory({ ...editingCategory, prompt: e.target.value })}
                rows={4}
                placeholder={'이 분야에 특화된 출제 지시를 적어주세요.\n예: 최신 LTS 기준, 컬렉션·제네릭·스트림 위주. 너무 지엽적인 문법은 제외.'}
                className="w-full p-3 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 rounded-lg text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">마스터 프롬프트의 <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded font-mono">{'{{category_guide}}'}</code> 자리에 삽입됩니다. 비워두면 마스터만 사용.</p>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={handleSaveEdit} className="flex-1 p-3 bg-blue-600 text-white font-bold rounded-xl text-sm hover:bg-blue-700">변경 저장</button>
              <button onClick={() => setEditingCategory(null)} className="flex-1 p-3 bg-slate-100 text-slate-700 font-bold rounded-xl text-sm hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600">취소</button>
            </div>
          </div>
        )}
      </Modal>

      {/* 분야 통계 모달 */}
      <Modal open={!!statsCategory} onClose={() => setStatsCategory(null)} className="max-w-md" labelledBy="cat-stats-title">
        {statsCategory && (
          <div className="space-y-5">
            <div>
              <h2 id="cat-stats-title" className="text-lg font-black text-slate-800 dark:text-slate-100">
                📊 {statsCategory.icon || '💡'} {statsCategory.name} 통계
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 font-mono uppercase">{statsCategory.id}</p>
            </div>

            {statsLoading ? (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400 font-bold">집계 중...</div>
            ) : !statsData ? (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400">통계를 불러오지 못했습니다.</div>
            ) : statsData.total === 0 ? (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400">이 분야에는 등록된 문제가 없습니다.</div>
            ) : (
              <>
                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 text-center">
                  <p className="text-3xl font-black text-slate-800 dark:text-slate-100">{statsData.total}</p>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">총 문제 수</p>
                </div>
                {renderStatGroup('상태별', STATUS_META, statsData.status, statsData.total)}
                {renderStatGroup('유형별', TYPE_META, statsData.type, statsData.total)}
                {renderStatGroup('난이도별', DIFF_META, statsData.difficulty, statsData.total)}
              </>
            )}

            <button onClick={() => setStatsCategory(null)} className="w-full p-3 bg-slate-100 text-slate-700 font-bold rounded-xl text-sm hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600">닫기</button>
          </div>
        )}
      </Modal>
    </main>
  )
}