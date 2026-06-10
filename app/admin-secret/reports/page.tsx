'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function AdminReportsPage() {
  const supabase = createClient()
  const pathname = usePathname()
  const adminPath = pathname.split('/').slice(0, 2).join('/')

  const [reports, setReports] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [editingQuestion, setEditingQuestion] = useState<any>(null)

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

      if (reps) setReports(reps)
      setIsLoading(false)
    }
    fetchData()
  }, [supabase])

  const handleUpdateStatus = async (reportId: string, newStatus: string) => {
    const { error } = await supabase.from('reports').update({ status: newStatus }).eq('id', reportId)
    if (!error) {
      setReports(reports.map(r => r.id === reportId ? { ...r, status: newStatus } : r))
      alert(`상태가 '${newStatus === 'resolved' ? '수정 완료' : '반려'}'로 변경되었습니다.`)
    }
  }

  // ✅ 정답/해설 포함 단건을 정의자 함수로 가져와 수정 모달을 연다.
  const handleOpenEdit = async (questionId: string) => {
    const { data, error } = await supabase.rpc('get_question_admin', { p_id: questionId })
    const full = Array.isArray(data) ? data[0] : data
    if (error || !full) {
      alert('문제 정보를 불러오지 못했습니다.')
      return
    }
    setEditingQuestion(full)
  }

  const handleSaveEdit = async () => {
    if (!editingQuestion) return
    const { id, question_text, options, answer_id, explanation } = editingQuestion
    const { error } = await supabase.from('questions').update({ question_text, options, answer_id, explanation }).eq('id', id)
    if (!error) {
      setReports(reports.map(r => r.questions?.id === id ? { ...r, questions: { ...r.questions, question_text, options, answer_id, explanation } } : r))
      setEditingQuestion(null)
      alert('문제가 수정되었습니다!')
    }
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

  // 필터 변경 시 무조건 1페이지로 이동
  useEffect(() => { setCurrentPage(1) }, [filterStatus, filterCategory])

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-800">신고 및 정정 요청 관리</h1>
            <p className="text-slate-500 mt-1">사용자가 접수한 문제의 오류를 확인하고 수정합니다.</p>
          </div>
          <Link href={adminPath} className="text-sm font-bold text-blue-600 hover:underline">← 관리자 메인</Link>
        </header>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex gap-4">
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-500 mb-1">처리 상태 필터</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full p-2 border rounded-lg text-sm">
              <option value="all">전체 상태</option>
              <option value="pending">대기 중</option>
              <option value="resolved">해결됨</option>
              <option value="dismissed">반려됨</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-500 mb-1">분야 필터</label>
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="w-full p-2 border rounded-lg text-sm">
              <option value="all">전체 분야</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-slate-500 font-bold">신고 내역을 불러오는 중...</div>
          ) : paginatedReports.length === 0 ? (
            <div className="p-12 text-center text-slate-500">조건에 일치하는 내역이 없습니다.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {paginatedReports.map((report) => (
                <div key={report.id} className="p-6 hover:bg-slate-50 transition-colors">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 text-xs font-bold rounded-lg ${report.status === 'resolved' ? 'bg-green-100 text-green-700' : report.status === 'dismissed' ? 'bg-slate-200 text-slate-700' : 'bg-yellow-100 text-yellow-800'}`}>
                        {report.status}
                      </span>
                      <span className="text-sm font-bold text-slate-400">{new Date(report.created_at).toLocaleString()}</span>
                    </div>
                    {report.status === 'pending' && (
                      <div className="flex gap-2">
                        <button onClick={() => handleUpdateStatus(report.id, 'resolved')} className="px-3 py-1 bg-green-50 text-green-700 font-bold text-sm rounded border border-green-200">✓ 해결</button>
                        <button onClick={() => handleUpdateStatus(report.id, 'dismissed')} className="px-3 py-1 bg-slate-100 text-slate-600 font-bold text-sm rounded border border-slate-200">✕ 반려</button>
                      </div>
                    )}
                  </div>
                  <div className="bg-red-50 p-4 rounded-xl border border-red-100 mb-4">
                    <p className="text-sm font-black text-red-800 mb-1">🚨 신고 사유</p>
                    <p className="text-slate-800 font-medium">{report.reason}</p>
                  </div>
                  {report.questions && (
                    <div className="bg-slate-100 p-4 rounded-xl border border-slate-200">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-slate-500 uppercase">분야: {report.questions.category_id}</span>
                        <button onClick={() => handleOpenEdit(report.questions.id)} className="px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded">✏️ 문제 수정</button>
                      </div>
                      <p className="font-bold text-slate-800">{report.questions.question_text}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ✅ 페이지네이션 버튼 UI */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            {Array.from({ length: totalPages }, (_, i) => (
              <button 
                key={i} 
                onClick={() => setCurrentPage(i + 1)} 
                className={`w-10 h-10 rounded-lg font-bold transition-colors ${currentPage === i + 1 ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 모달 팝업 생략 (기존 코드와 완전히 동일하므로 그대로 유지하시면 됩니다) */}
      {editingQuestion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto space-y-5 shadow-2xl">
            <h2 className="text-xl font-black text-slate-800">문제 수정</h2>
            <div>
              <textarea value={editingQuestion.question_text} onChange={(e) => setEditingQuestion({...editingQuestion, question_text: e.target.value})} className="w-full p-3 border rounded-lg text-slate-800" rows={2}/>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {editingQuestion.options.map((opt: any, idx: number) => (
                <div key={opt.id}>
                  <label className="block text-xs font-bold text-slate-500 mb-1">보기 {opt.id}</label>
                  <input value={opt.text} onChange={(e) => { const newOptions = [...editingQuestion.options]; newOptions[idx].text = e.target.value; setEditingQuestion({...editingQuestion, options: newOptions}) }} className="w-full p-3 border rounded-lg text-slate-800 text-sm"/>
                </div>
              ))}
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">정답 ID</label>
              <select value={editingQuestion.answer_id} onChange={(e) => setEditingQuestion({...editingQuestion, answer_id: e.target.value})} className="w-full p-3 border rounded-lg text-slate-800">
                {editingQuestion.options.map((opt: any) => <option key={opt.id} value={opt.id}>{opt.id}번</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">해설</label>
              <textarea value={editingQuestion.explanation} onChange={(e) => setEditingQuestion({...editingQuestion, explanation: e.target.value})} className="w-full p-3 border rounded-lg text-slate-800" rows={3}/>
            </div>
            <div className="flex gap-3 pt-4 border-t border-slate-100">
              <button onClick={handleSaveEdit} className="flex-1 p-4 bg-blue-600 text-white font-black rounded-xl">저장하기</button>
              <button onClick={() => setEditingQuestion(null)} className="flex-1 p-4 bg-slate-100 text-slate-700 font-bold rounded-xl">취소</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}