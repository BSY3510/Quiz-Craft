'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { useAdminPath } from '../useAdminPath'
import { updateReportStatus } from './actions'
import { useToast } from '@/app/components/Toast'
import { Pagination } from '@/app/components/Pagination'
import { Badge, statusTone } from '@/app/components/ui'
import QuestionEditModal from '../QuestionEditModal'
import type { Question, Category } from '@/types/db'

// 신고 목록 임베드된 문제(정답/해설은 제외, 수정 시점에만 채워짐)
type ReportQuestion =
  Pick<Question, 'id' | 'category_id' | 'question_text' | 'code_snippet' | 'options'>
  & Partial<Pick<Question, 'answer_id' | 'explanation'>>
type ReportRow = {
  id: string
  reason: string
  status: string
  created_at: string
  questions: ReportQuestion | null
}

export default function AdminReportsPage() {
  const supabase = createClient()
  const adminPath = useAdminPath()
  const toast = useToast()

  const [reports, setReports] = useState<ReportRow[]>([])
  const [categories, setCategories] = useState<Pick<Category, 'id' | 'name'>[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)

  // ✅ 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    async function fetchData() {
      const { data: cats } = await supabase.from('categories').select('id, name')
      if (cats) setCategories(cats)

      // ✅ 정답(answer_id)/해설은 일반 권한에서 회수되므로 목록 임베드에서 제외.
      //    "문제 수정" 클릭 시 get_question_admin 정의자 함수로 정답 포함 단건 조회.
      const { data: reps } = await supabase
        .from('reports')
        .select(`id, reason, status, created_at, questions(id, category_id, question_text, code_snippet, options)`)
        .order('created_at', { ascending: false })

      // Supabase 중첩관계(questions)를 배열로 추론하므로 경계에서 캐스트(런타임은 단일 객체)
      if (reps) setReports(reps as unknown as ReportRow[])
      setIsLoading(false)
    }
    fetchData()
  }, [supabase])

  const handleUpdateStatus = async (reportId: string, newStatus: string) => {
    const res = await updateReportStatus(reportId, newStatus)
    if (!res.error) {
      setReports(reports.map(r => r.id === reportId ? { ...r, status: newStatus } : r))
      toast.success(`상태가 '${newStatus === 'resolved' ? '수정 완료' : '반려'}'로 변경되었습니다.`)
    } else {
      toast.error(res.error)
    }
  }

  // ✅ 정답/해설 포함 단건을 정의자 함수로 가져와 수정 모달을 연다.
  const handleOpenEdit = async (questionId: string) => {
    const { data, error } = await supabase.rpc('get_question_admin', { p_id: questionId })
    const full = Array.isArray(data) ? data[0] : data
    if (error || !full) {
      toast.error('문제 정보를 불러오지 못했습니다.')
      return
    }
    setEditingQuestion(full)
  }

  // 필터링 적용
  const filteredReports = reports.filter(report => {
    const matchStatus = filterStatus === 'all' || report.status === filterStatus
    const matchCategory = filterCategory === 'all' || report.questions?.category_id === filterCategory
    return matchStatus && matchCategory
  })

  // ✅ 필터링된 데이터를 10개씩 자르기
  const totalPages = Math.ceil(filteredReports.length / itemsPerPage)
  const paginatedReports = filteredReports.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  // 필터 변경 시 1페이지로 리셋 (effect 대신 이벤트에서 처리)
  const onFilterStatus = (v: string) => { setFilterStatus(v); setCurrentPage(1) }
  const onFilterCategory = (v: string) => { setFilterCategory(v); setCurrentPage(1) }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100">신고 및 정정 요청 관리</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">사용자가 접수한 문제의 오류를 확인하고 수정합니다.</p>
          </div>
          <Link href={adminPath} className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline">← 관리자 메인</Link>
        </header>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex gap-4">
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">처리 상태 필터</label>
            <select value={filterStatus} onChange={(e) => onFilterStatus(e.target.value)} className="w-full p-2 border rounded-lg text-sm dark:border-slate-600 dark:bg-slate-700">
              <option value="all">전체 상태</option>
              <option value="pending">대기 중</option>
              <option value="resolved">해결됨</option>
              <option value="dismissed">반려됨</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">분야 필터</label>
            <select value={filterCategory} onChange={(e) => onFilterCategory(e.target.value)} className="w-full p-2 border rounded-lg text-sm dark:border-slate-600 dark:bg-slate-700">
              <option value="all">전체 분야</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400 font-bold">신고 내역을 불러오는 중...</div>
          ) : paginatedReports.length === 0 ? (
            <div className="p-12 text-center text-slate-500 dark:text-slate-400">조건에 일치하는 내역이 없습니다.</div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {paginatedReports.map((report) => (
                <div key={report.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <Badge tone={statusTone(report.status)} className="px-3 py-1 rounded-lg">{report.status}</Badge>
                      <span className="text-sm font-bold text-slate-400 dark:text-slate-500">{new Date(report.created_at).toLocaleString()}</span>
                    </div>
                    {report.status === 'pending' && (
                      <div className="flex gap-2">
                        <button onClick={() => handleUpdateStatus(report.id, 'resolved')} className="px-3 py-1 bg-green-50 text-green-700 font-bold text-sm rounded border border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-900/50">✓ 해결</button>
                        <button onClick={() => handleUpdateStatus(report.id, 'dismissed')} className="px-3 py-1 bg-slate-100 text-slate-600 font-bold text-sm rounded border border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600">✕ 반려</button>
                      </div>
                    )}
                  </div>
                  <div className="bg-red-50 p-4 rounded-xl border border-red-100 mb-4 dark:bg-red-900/20 dark:border-red-900/50">
                    <p className="text-sm font-black text-red-800 dark:text-red-300 mb-1">🚨 신고 사유</p>
                    <p className="text-slate-800 dark:text-slate-100 font-medium">{report.reason}</p>
                  </div>
                  {report.questions && (
                    <div className="bg-slate-100 p-4 rounded-xl border border-slate-200 dark:bg-slate-900/50 dark:border-slate-700">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">분야: {report.questions.category_id}</span>
                        <button onClick={() => report.questions && handleOpenEdit(report.questions.id)} className="px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded">✏️ 문제 수정</button>
                      </div>
                      <p className="font-bold text-slate-800 dark:text-slate-100">{report.questions.question_text}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 페이지네이션 (prev/next + 생략) */}
        <Pagination page={currentPage} totalPages={totalPages} onChange={setCurrentPage} />
      </div>

      {/* 문제 수정 모달 (공용 컴포넌트) */}
      <QuestionEditModal
        question={editingQuestion}
        onClose={() => setEditingQuestion(null)}
        onSaved={(id, fields) => setReports(reports.map(r => r.questions?.id === id ? { ...r, questions: { ...r.questions, ...fields } } : r))}
      />
    </main>
  )
}