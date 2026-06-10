'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { useAdminPath } from '../useAdminPath'
import { updateQuestion, setGoogleLogin } from '../actions'
import { useToast } from '@/app/components/Toast'
import { Modal } from '@/app/components/Modal'
import { Pagination } from '@/app/components/Pagination'
import { Badge, statusTone } from '@/app/components/ui'
import type { AdminQuestionRow, Category } from '@/types/db'

type DashQuestion = AdminQuestionRow & { errorRate: number; totalAttempts: number }

export default function AdminDashboardStatsPage() {
  const supabase = createClient()
  const adminPath = useAdminPath()
  const toast = useToast()

  const [questions, setQuestions] = useState<DashQuestion[]>([])
  const [categories, setCategories] = useState<Pick<Category, 'id' | 'name'>[]>([])
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [sortType, setSortType] = useState<string>('recent')
  const [isLoading, setIsLoading] = useState(true)

  // 소셜 설정 및 모달 관리 상태
  const [isGoogleEnabled, setIsGoogleEnabled] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<DashQuestion | null>(null)

  // ✅ 페이지네이션 전용 로컬 상태 추가
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    async function fetchData() {
      const { data: settings } = await supabase.from('site_settings').select('google_login_enabled').eq('id', 1).single()
      if (settings) setIsGoogleEnabled(settings.google_login_enabled)

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

  const handleToggleGoogleLogin = async () => {
    const newValue = !isGoogleEnabled
    const res = await setGoogleLogin(newValue)
    if (res.error) { toast.error(res.error); return }
    setIsGoogleEnabled(newValue)
    toast.success(`구글 로그인이 ${newValue ? '활성화' : '비활성화'} 되었습니다.`)
  }

  const handleSaveEdit = async () => {
    if (!editingQuestion) return
    const { id, question_text, options, answer_id, explanation } = editingQuestion

    const res = await updateQuestion(id, { question_text, options, answer_id, explanation })
    if (res.error) { toast.error(res.error); return }

    setQuestions(questions.map(q => q.id === id ? { ...q, question_text, options, answer_id, explanation } : q))
    setEditingQuestion(null)
    toast.success('수정되었습니다.')
  }

  // 필터링 및 정렬 파이프라인
  const filteredAndSorted = questions
    .filter(q => filterCategory === 'all' || q.category_id === filterCategory)
    .sort((a, b) => {
      if (sortType === 'recent') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      if (sortType === 'errorRate') return b.errorRate - a.errorRate
      if (sortType === 'type') return a.type.localeCompare(b.type)
      return 0
    })

  // ✅ 정렬 및 필터링 처리가 끝난 최종 배열을 10개 단위로 조각내기
  const totalPages = Math.ceil(filteredAndSorted.length / itemsPerPage)
  const paginatedQuestions = filteredAndSorted.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  // 필터/정렬 변경 시 1페이지로 리셋하는 핸들러 (effect 대신 이벤트에서 처리)
  const onFilterCategory = (v: string) => { setFilterCategory(v); setCurrentPage(1) }
  const onSortType = (v: string) => { setSortType(v); setCurrentPage(1) }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6 relative">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100">운영 대시보드 상세</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">학습 콘텐츠 상세 분석 및 서비스 설정</p>
          </div>
          <Link href={adminPath} className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline">← 관리자 메인</Link>
        </header>

        {/* 글로벌 설정 영역 */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">구글 소셜 로그인 연동</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">사용자의 구글 로그인 접근을 허용하거나 차단합니다.</p>
          </div>
          <button
            onClick={handleToggleGoogleLogin}
            className={`px-4 py-2 font-bold rounded-lg transition-colors ${isGoogleEnabled ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}
          >
            {isGoogleEnabled ? '활성화됨 (ON)' : '비활성화됨 (OFF)'}
          </button>
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
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">정렬 방식</label>
            <select value={sortType} onChange={(e) => onSortType(e.target.value)} className="w-full p-2 border rounded-lg text-sm text-slate-800 dark:border-slate-600 dark:bg-slate-700">
              <option value="recent">최신 등록순</option>
              <option value="errorRate">🔥 오답률 높은 순</option>
              <option value="type">문제 종류순</option>
            </select>
          </div>
        </div>

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
                    <th className="p-4">분야</th>
                    <th className="p-4 w-1/2">문제 내용 (클릭하여 전체 수정)</th>
                    <th className="p-4">오답률</th>
                    <th className="p-4">상태</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-slate-800 dark:text-slate-200">
                  {/* ✅ paginatedQuestions를 순회 출력 */}
                  {paginatedQuestions.map(q => (
                    <tr key={q.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer" onClick={() => setEditingQuestion({...q})}>
                      <td className="p-4 font-bold text-blue-600 dark:text-blue-400 uppercase">{q.category_id}</td>
                      <td className="p-4">{q.question_text} ✏️</td>
                      <td className="p-4">
                        <span className={`font-bold ${q.errorRate > 50 ? 'text-red-500 dark:text-red-400' : 'text-slate-600 dark:text-slate-300'}`}>{q.errorRate.toFixed(1)}%</span>
                        <span className="text-xs text-slate-400 dark:text-slate-500 block">총 {q.totalAttempts}회 풀이</span>
                      </td>
                      <td className="p-4">
                        <Badge tone={statusTone(q.status)}>{q.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 페이지네이션 (prev/next + 생략) */}
        <Pagination page={currentPage} totalPages={totalPages} onChange={setCurrentPage} />
      </div>

      {/* 문제 수정 모달 */}
      <Modal open={!!editingQuestion} onClose={() => setEditingQuestion(null)} className="max-w-2xl" labelledBy="q-edit-title">
        {editingQuestion && (
          <div className="space-y-4">
            <h2 id="q-edit-title" className="text-xl font-bold text-slate-800 dark:text-slate-100">문제 수정</h2>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">질문 내용</label>
              <textarea value={editingQuestion.question_text} onChange={(e) => setEditingQuestion({...editingQuestion, question_text: e.target.value})} className="w-full p-3 border border-slate-300 rounded-lg text-slate-800 dark:border-slate-600 dark:bg-slate-700" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              {editingQuestion.options.map((opt, idx) => (
                <div key={opt.id}>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">보기 {opt.id}</label>
                  <input value={opt.text} onChange={(e) => { const newOptions = [...editingQuestion.options]; newOptions[idx].text = e.target.value; setEditingQuestion({...editingQuestion, options: newOptions}) }} className="w-full p-2 border border-slate-300 rounded-lg text-slate-800 text-sm dark:border-slate-600 dark:bg-slate-700" />
                </div>
              ))}
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">정답 ID (1~4)</label>
              <select value={editingQuestion.answer_id} onChange={(e) => setEditingQuestion({...editingQuestion, answer_id: e.target.value})} className="w-full p-3 border border-slate-300 rounded-lg text-slate-800 dark:border-slate-600 dark:bg-slate-700">
                {editingQuestion.options.map((opt) => <option key={opt.id} value={opt.id}>{opt.id}번 보기</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">해설</label>
              <textarea value={editingQuestion.explanation} onChange={(e) => setEditingQuestion({...editingQuestion, explanation: e.target.value})} className="w-full p-3 border border-slate-300 rounded-lg text-slate-800 dark:border-slate-600 dark:bg-slate-700" rows={3} />
            </div>
            <div className="flex gap-3 pt-4">
              <button onClick={handleSaveEdit} className="flex-1 p-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700">저장하기</button>
              <button onClick={() => setEditingQuestion(null)} className="flex-1 p-3 bg-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600">취소</button>
            </div>
          </div>
        )}
      </Modal>
    </main>
  )
}