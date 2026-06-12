'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { useAdminPath } from '../useAdminPath'
import { setQuestionStatus, setQuestionsStatus, deleteQuestion, deleteQuestions } from '../actions'
import { useToast } from '@/app/components/Toast'
import { useConfirm } from '@/app/components/Confirm'
import { Pagination } from '@/app/components/Pagination'
import { Badge, statusTone, DifficultyBadge } from '@/app/components/ui'
import QuestionEditModal from '../QuestionEditModal'
import type { AdminQuestionRow, Category } from '@/types/db'

type DashQuestion = AdminQuestionRow & { errorRate: number; totalAttempts: number }

export default function AdminDashboardStatsPage() {
  const supabase = createClient()
  const adminPath = useAdminPath()
  const toast = useToast()
  const confirm = useConfirm()

  const [questions, setQuestions] = useState<DashQuestion[]>([])
  const [categories, setCategories] = useState<Pick<Category, 'id' | 'name'>[]>([])
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all')
  const [search, setSearch] = useState<string>('')
  const [sortType, setSortType] = useState<string>('recent')
  const [isLoading, setIsLoading] = useState(true)

  // 모달 관리 상태
  const [editingQuestion, setEditingQuestion] = useState<DashQuestion | null>(null)

  // 일괄 작업용 선택 상태 (선택된 문제 id 집합)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // ✅ 페이지네이션 전용 로컬 상태 추가
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  useEffect(() => {
    async function fetchData() {
      const { data: cats } = await supabase.from('categories').select('id, name')
      if (cats) setCategories(cats)

      // ✅ 정답(answer_id)/해설은 일반 권한에서 회수되므로 관리자 정의자 함수로 조회.
      //    함수가 문제 + 풀이 통계(total/correct)를 함께 반환한다.
      const { data: qData } = await supabase.rpc('get_questions_admin')

      if (qData) {
        const enrichedQuestions: DashQuestion[] = (qData as AdminQuestionRow[]).map((q) => {
          const totalAttempts = Number(q.total_attempts) || 0
          const correctAttempts = Number(q.correct_attempts) || 0
          const errorRate = totalAttempts === 0 ? 0 : ((totalAttempts - correctAttempts) / totalAttempts) * 100
          return { ...q, errorRate, totalAttempts }
        })
        setQuestions(enrichedQuestions)
      }
      setIsLoading(false)
    }
    fetchData()
  }, [supabase])

  // 검증 큐: 승인(active) / 반려(archived)
  const handleSetStatus = async (id: string, status: 'active' | 'archived') => {
    const res = await setQuestionStatus(id, status)
    if (res.error) { toast.error(res.error); return }
    setQuestions(questions.map(q => q.id === id ? { ...q, status } : q))
    toast.success(status === 'active' ? '승인되어 노출됩니다.' : '반려되어 보관 처리되었습니다.')
  }

  // 검증 대기 일괄 승인 (현재 분야 필터에 해당하는 검증대기 전체)
  const handleApproveAll = async () => {
    const targets = questions.filter(
      (q) => q.status === 'pending_review' && (filterCategory === 'all' || q.category_id === filterCategory)
    )
    if (!targets.length) return
    const ids = targets.map((q) => q.id)
    const res = await setQuestionsStatus(ids, 'active')
    if (res.error) { toast.error(res.error); return }
    setQuestions(questions.map(q => ids.includes(q.id) ? { ...q, status: 'active' } : q))
    toast.success(`${ids.length}건을 일괄 승인했습니다.`)
  }

  // 단건 영구 삭제 (보관 상태에서만 노출). 확인 모달 필수.
  const handleDelete = async (q: DashQuestion) => {
    const ok = await confirm({
      title: '문제 영구 삭제',
      message: `이 문제를 데이터베이스에서 영구 삭제할까요?\n되돌릴 수 없습니다. (풀이 기록은 보존됩니다)\n\n"${q.question_text.slice(0, 40)}${q.question_text.length > 40 ? '…' : ''}"`,
      confirmText: '영구 삭제',
      danger: true,
    })
    if (!ok) return
    const res = await deleteQuestion(q.id)
    if (res.error) { toast.error(res.error); return }
    setQuestions(prev => prev.filter(x => x.id !== q.id))
    setSelectedIds(prev => { const next = new Set(prev); next.delete(q.id); return next })
    toast.success('문제를 영구 삭제했습니다.')
  }

  // 선택 항목 일괄 상태 변경 (보관/복원)
  const handleBulkStatus = async (status: 'active' | 'archived') => {
    const ids = [...selectedIds]
    if (!ids.length) return
    const res = await setQuestionsStatus(ids, status)
    if (res.error) { toast.error(res.error); return }
    setQuestions(questions.map(q => selectedIds.has(q.id) ? { ...q, status } : q))
    setSelectedIds(new Set())
    toast.success(`${ids.length}건을 ${status === 'active' ? '복원' : '보관'}했습니다.`)
  }

  // 선택 항목 일괄 영구 삭제. 보관(archived) 상태인 항목만 삭제되며, 나머지는 안내한다.
  const handleBulkDelete = async () => {
    const targets = questions.filter(q => selectedIds.has(q.id) && q.status === 'archived')
    const skipped = selectedIds.size - targets.length
    if (!targets.length) {
      toast.error('보관(archived) 상태의 문제만 영구 삭제할 수 있습니다.')
      return
    }
    const ok = await confirm({
      title: '선택 항목 영구 삭제',
      message: `보관 상태 ${targets.length}건을 영구 삭제할까요?${skipped > 0 ? `\n(보관 상태가 아닌 ${skipped}건은 제외됩니다)` : ''}\n되돌릴 수 없습니다. (풀이 기록은 보존됩니다)`,
      confirmText: '영구 삭제',
      danger: true,
    })
    if (!ok) return
    const ids = targets.map(q => q.id)
    const res = await deleteQuestions(ids)
    if (res.error) { toast.error(res.error); return }
    const deleted = new Set(ids)
    setQuestions(prev => prev.filter(q => !deleted.has(q.id)))
    setSelectedIds(new Set())
    toast.success(`${res.count ?? ids.length}건을 영구 삭제했습니다.${skipped > 0 ? ` (${skipped}건 제외)` : ''}`)
  }

  // 필터링 및 정렬 파이프라인
  const keyword = search.trim().toLowerCase()
  const filteredAndSorted = questions
    .filter(q => filterCategory === 'all' || q.category_id === filterCategory)
    .filter(q => filterStatus === 'all' || q.status === filterStatus)
    .filter(q => filterDifficulty === 'all' || q.difficulty === filterDifficulty)
    .filter(q => !keyword || q.question_text.toLowerCase().includes(keyword) || (q.category_id || '').toLowerCase().includes(keyword))
    .sort((a, b) => {
      if (sortType === 'recent') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      if (sortType === 'errorRate') return b.errorRate - a.errorRate
      if (sortType === 'type') return a.type.localeCompare(b.type)
      return 0
    })

  // ✅ 정렬 및 필터링 처리가 끝난 최종 배열을 페이지 크기 단위로 조각내기
  const totalPages = Math.ceil(filteredAndSorted.length / itemsPerPage)
  const paginatedQuestions = filteredAndSorted.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
  const pendingCount = questions.filter(q => q.status === 'pending_review').length

  // 현재 페이지 행들의 일괄 선택 상태 (전체선택 체크박스 제어용)
  const pageIds = paginatedQuestions.map(q => q.id)
  const allPageSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.has(id))

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  const toggleSelectPage = () => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (allPageSelected) pageIds.forEach(id => next.delete(id))
      else pageIds.forEach(id => next.add(id))
      return next
    })
  }

  // 선택 항목 중 보관 상태 개수 (일괄 삭제 가능 건수 안내용)
  const selectedArchivedCount = questions.filter(q => selectedIds.has(q.id) && q.status === 'archived').length

  // 필터/정렬 변경 시 1페이지로 리셋하는 핸들러 (effect 대신 이벤트에서 처리)
  const onFilterCategory = (v: string) => { setFilterCategory(v); setCurrentPage(1) }
  const onFilterStatus = (v: string) => { setFilterStatus(v); setCurrentPage(1) }
  const onFilterDifficulty = (v: string) => { setFilterDifficulty(v); setCurrentPage(1) }
  const onSearch = (v: string) => { setSearch(v); setCurrentPage(1) }
  const onSortType = (v: string) => { setSortType(v); setCurrentPage(1) }
  const onItemsPerPage = (v: number) => { setItemsPerPage(v); setCurrentPage(1) }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6 relative">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100">📝 문제 관리</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">등록된 문제를 검색·수정하고, AI 생성분을 검증·승인합니다.</p>
          </div>
          <Link href={adminPath} className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline">← 관리자 메인</Link>
        </header>

        {/* 검증 대기 안내 + 일괄 승인 */}
        {pendingCount > 0 && (
          <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/50 rounded-xl p-4">
            <button onClick={() => onFilterStatus('pending_review')} className="flex-1 text-left">
              <span className="font-bold text-amber-800 dark:text-amber-300">🕒 검증 대기 {pendingCount}건</span>
              <span className="text-sm text-amber-700 dark:text-amber-400 ml-2">클릭해 모아보기</span>
            </button>
            <button
              onClick={handleApproveAll}
              className="whitespace-nowrap px-3 py-2 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-700 transition-colors"
            >
              ✓ 전체 승인
            </button>
          </div>
        )}

        {/* 문제 검색 */}
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="🔍 문제 내용·분야 검색"
            className="w-full p-3 pl-4 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          />
          {keyword && (
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400 dark:text-slate-500">{filteredAndSorted.length}개</span>
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex gap-4">
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">분야 필터</label>
            <select value={filterCategory} onChange={(e) => onFilterCategory(e.target.value)} className="w-full p-2 border rounded-lg text-sm text-slate-800 dark:border-slate-600 dark:bg-slate-700">
              <option value="all">전체 분야</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">상태 필터</label>
            <select value={filterStatus} onChange={(e) => onFilterStatus(e.target.value)} className="w-full p-2 border rounded-lg text-sm text-slate-800 dark:border-slate-600 dark:bg-slate-700">
              <option value="all">전체 상태</option>
              <option value="active">활성(노출)</option>
              <option value="pending_review">검증 대기</option>
              <option value="archived">보관(반려)</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">난이도 필터</label>
            <select value={filterDifficulty} onChange={(e) => onFilterDifficulty(e.target.value)} className="w-full p-2 border rounded-lg text-sm text-slate-800 dark:border-slate-600 dark:bg-slate-700">
              <option value="all">전체 난이도</option>
              <option value="easy">쉬움</option>
              <option value="medium">보통</option>
              <option value="hard">어려움</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">정렬 방식</label>
            <select value={sortType} onChange={(e) => onSortType(e.target.value)} className="w-full p-2 border rounded-lg text-sm text-slate-800 dark:border-slate-600 dark:bg-slate-700">
              <option value="recent">최신 등록순</option>
              <option value="errorRate">🔥 오답률 높은 순</option>
              <option value="type">문제 종류순</option>
            </select>
          </div>
        </div>

        {/* 일괄 작업 바 (선택된 항목이 있을 때만) */}
        {selectedIds.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/50 rounded-xl p-3">
            <span className="font-bold text-blue-800 dark:text-blue-300 text-sm mr-1">{selectedIds.size}건 선택됨</span>
            <button onClick={() => handleBulkStatus('archived')} className="px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600">📦 보관</button>
            <button onClick={() => handleBulkStatus('active')} className="px-3 py-1.5 bg-green-50 text-green-700 text-xs font-bold rounded-lg border border-green-200 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 dark:border-green-900/50">↩ 복원(노출)</button>
            <button
              onClick={handleBulkDelete}
              disabled={selectedArchivedCount === 0}
              className="px-3 py-1.5 bg-red-50 text-red-700 text-xs font-bold rounded-lg border border-red-200 hover:bg-red-100 disabled:opacity-40 disabled:cursor-not-allowed dark:bg-red-900/30 dark:text-red-400 dark:border-red-900/50"
            >
              🗑 영구 삭제{selectedArchivedCount > 0 ? ` (${selectedArchivedCount})` : ''}
            </button>
            <button onClick={() => setSelectedIds(new Set())} className="ml-auto px-3 py-1.5 text-slate-500 dark:text-slate-400 text-xs font-bold hover:underline">선택 해제</button>
          </div>
        )}

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400">데이터 집계 중...</div>
          ) : paginatedQuestions.length === 0 ? (
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
                        onChange={toggleSelectPage}
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
                  {/* ✅ paginatedQuestions를 순회 출력 */}
                  {paginatedQuestions.map(q => (
                    <tr key={q.id} className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer ${selectedIds.has(q.id) ? 'bg-blue-50/60 dark:bg-blue-900/10' : ''}`} onClick={() => setEditingQuestion({...q})}>
                      <td className="p-4" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(q.id)}
                          onChange={() => toggleSelect(q.id)}
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
                            <button onClick={() => handleSetStatus(q.id, 'active')} className="px-2 py-1 bg-green-50 text-green-700 text-xs font-bold rounded border border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-900/50">✓ 승인</button>
                            <button onClick={() => handleSetStatus(q.id, 'archived')} className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded border border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600">✕ 반려</button>
                          </div>
                        )}
                        {q.status === 'active' && (
                          <div className="flex gap-1 mt-2">
                            <button onClick={() => handleSetStatus(q.id, 'archived')} className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded border border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600">📦 보관</button>
                          </div>
                        )}
                        {q.status === 'archived' && (
                          <div className="flex gap-1 mt-2">
                            <button onClick={() => handleSetStatus(q.id, 'active')} className="px-2 py-1 bg-green-50 text-green-700 text-xs font-bold rounded border border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-900/50">↩ 복원</button>
                            <button onClick={() => handleDelete(q)} className="px-2 py-1 bg-red-50 text-red-700 text-xs font-bold rounded border border-red-200 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:border-red-900/50">🗑 삭제</button>
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

        {/* 페이지 크기 선택 + 페이지네이션 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <span>총 {filteredAndSorted.length}개</span>
            <span className="text-slate-300 dark:text-slate-600">·</span>
            <label className="flex items-center gap-1">
              페이지당
              <select
                value={itemsPerPage}
                onChange={(e) => onItemsPerPage(Number(e.target.value))}
                className="p-1.5 border rounded-lg text-sm text-slate-800 dark:text-slate-100 dark:border-slate-600 dark:bg-slate-700"
              >
                {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}개</option>)}
              </select>
            </label>
          </div>
          <Pagination page={currentPage} totalPages={totalPages} onChange={setCurrentPage} />
        </div>
      </div>

      {/* 문제 수정 모달 (공용 컴포넌트) */}
      <QuestionEditModal
        question={editingQuestion}
        onClose={() => setEditingQuestion(null)}
        onSaved={(id, fields) => setQuestions(questions.map(q => q.id === id ? { ...q, ...fields } : q))}
      />
    </main>
  )
}