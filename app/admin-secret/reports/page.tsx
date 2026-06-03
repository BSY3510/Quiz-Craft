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
  const [categories, setCategories] = useState<any[]>([]) // ✅ 카테고리 필터용 상태
  const [isLoading, setIsLoading] = useState(true)
  
  // ✅ 필터링 상태 관리
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')

  // 문제 수정을 위한 모달 상태
  const [editingQuestion, setEditingQuestion] = useState<any>(null)

  // 신고 내역 및 카테고리 정보 가져오기
  useEffect(() => {
    async function fetchData() {
      // 분야 목록 가져오기 (필터 드롭다운용)
      const { data: cats } = await supabase.from('categories').select('id, name')
      if (cats) setCategories(cats)

      // 신고 내역 가져오기
      const { data: reps } = await supabase
        .from('reports')
        .select(`
          id,
          reason,
          status,
          created_at,
          questions (
            id,
            category_id,
            question_text,
            code_snippet,
            options,
            answer_id,
            explanation
          )
        `)
        .order('created_at', { ascending: false })

      if (reps) setReports(reps)
      setIsLoading(false)
    }
    fetchData()
  }, [supabase])

  // 신고 상태 변경 핸들러
  const handleUpdateStatus = async (reportId: string, newStatus: string) => {
    const { error } = await supabase
      .from('reports')
      .update({ status: newStatus })
      .eq('id', reportId)

    if (!error) {
      setReports(reports.map(r => r.id === reportId ? { ...r, status: newStatus } : r))
      alert(`상태가 '${newStatus === 'resolved' ? '수정 완료(해결)' : '반려'}' 상태로 변경되었습니다.`)
    } else {
      alert('상태 변경 중 오류가 발생했습니다.')
    }
  }

  // 문제 수정 저장 핸들러
  const handleSaveEdit = async () => {
    if (!editingQuestion) return
    const { id, question_text, options, answer_id, explanation } = editingQuestion
    
    const { error } = await supabase.from('questions')
      .update({ question_text, options, answer_id, explanation })
      .eq('id', id)
      
    if (!error) {
      setReports(reports.map(r => {
        if (r.questions?.id === id) {
          return { ...r, questions: { ...r.questions, question_text, options, answer_id, explanation } }
        }
        return r
      }))
      setEditingQuestion(null)
      alert('문제가 성공적으로 수정되었습니다!')
    } else {
      alert('문제 수정 중 오류가 발생했습니다.')
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'resolved': return <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-lg">해결됨</span>
      case 'dismissed': return <span className="px-3 py-1 bg-slate-200 text-slate-700 text-xs font-bold rounded-lg">반려됨</span>
      default: return <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded-lg animate-pulse">대기 중</span>
    }
  }

  // ✅ 조건에 맞게 신고 내역 필터링
  const filteredReports = reports.filter(report => {
    const matchStatus = filterStatus === 'all' || report.status === filterStatus
    const matchCategory = filterCategory === 'all' || report.questions?.category_id === filterCategory
    return matchStatus && matchCategory
  })

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-800">신고 및 정정 요청 관리</h1>
            <p className="text-slate-500 mt-1">사용자가 접수한 문제의 오류를 확인하고 수정합니다.</p>
          </div>
          <Link href={adminPath} className="text-sm font-bold text-blue-600 hover:underline">
            ← 관리자 메인으로
          </Link>
        </header>

        {/* ✅ 필터 컨트롤 영역 추가 */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex gap-4">
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-500 mb-1">처리 상태 필터</label>
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)} 
              className="w-full p-2 border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="all">전체 상태</option>
              <option value="pending">대기 중</option>
              <option value="resolved">해결됨</option>
              <option value="dismissed">반려됨</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-500 mb-1">분야 필터</label>
            <select 
              value={filterCategory} 
              onChange={(e) => setFilterCategory(e.target.value)} 
              className="w-full p-2 border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="all">전체 분야</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-slate-500 font-bold">신고 내역을 불러오는 중...</div>
          ) : filteredReports.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <span className="text-4xl mb-4 block">✨</span>
              조건에 일치하는 신고 내역이 없습니다.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {/* ✅ filteredReports를 기준으로 매핑하도록 변경 */}
              {filteredReports.map((report) => (
                <div key={report.id} className="p-6 hover:bg-slate-50 transition-colors">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      {getStatusBadge(report.status)}
                      <span className="text-sm font-bold text-slate-400">
                        {new Date(report.created_at).toLocaleString()}
                      </span>
                    </div>
                    {report.status === 'pending' && (
                      <div className="flex gap-2">
                        <button onClick={() => handleUpdateStatus(report.id, 'resolved')} className="px-3 py-1.5 bg-green-50 text-green-700 font-bold text-sm rounded-lg hover:bg-green-100 border border-green-200">
                          ✓ 수정 완료
                        </button>
                        <button onClick={() => handleUpdateStatus(report.id, 'dismissed')} className="px-3 py-1.5 bg-slate-100 text-slate-600 font-bold text-sm rounded-lg hover:bg-slate-200 border border-slate-200">
                          ✕ 반려
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="bg-red-50 p-4 rounded-xl border border-red-100 mb-4">
                    <p className="text-sm font-black text-red-800 mb-1">🚨 사용자 신고 사유</p>
                    <p className="text-slate-800 font-medium">{report.reason}</p>
                  </div>

                  {report.questions ? (
                    <div className="bg-slate-100 p-4 rounded-xl border border-slate-200">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-slate-500 uppercase">분야: {report.questions.category_id}</span>
                        <button 
                          onClick={() => setEditingQuestion({...report.questions})}
                          className="px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-700 shadow-sm"
                        >
                          ✏️ 이 문제 바로 수정하기
                        </button>
                      </div>
                      <p className="font-bold text-slate-800">{report.questions.question_text}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 italic">삭제되었거나 찾을 수 없는 문제입니다.</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 문제 전체 수정 모달 팝업 */}
      {editingQuestion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto space-y-5 shadow-2xl">
            <h2 className="text-xl font-black text-slate-800">문제 수정 (신고 반영)</h2>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">질문 내용</label>
              <textarea 
                value={editingQuestion.question_text} 
                onChange={(e) => setEditingQuestion({...editingQuestion, question_text: e.target.value})}
                className="w-full p-3 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none" rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {editingQuestion.options.map((opt: any, idx: number) => (
                <div key={opt.id}>
                  <label className="block text-xs font-bold text-slate-500 mb-1">보기 {opt.id}</label>
                  <input 
                    value={opt.text}
                    onChange={(e) => {
                      const newOptions = [...editingQuestion.options]
                      newOptions[idx].text = e.target.value
                      setEditingQuestion({...editingQuestion, options: newOptions})
                    }}
                    className="w-full p-3 border border-slate-300 rounded-lg text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              ))}
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">정답 ID (1~4)</label>
              <select 
                value={editingQuestion.answer_id} 
                onChange={(e) => setEditingQuestion({...editingQuestion, answer_id: e.target.value})}
                className="w-full p-3 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {editingQuestion.options.map((opt: any) => (
                  <option key={opt.id} value={opt.id}>{opt.id}번 보기</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">해설 (오류 정정 내용 반영)</label>
              <textarea 
                value={editingQuestion.explanation} 
                onChange={(e) => setEditingQuestion({...editingQuestion, explanation: e.target.value})}
                className="w-full p-3 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none" rows={3}
              />
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-100">
              <button onClick={handleSaveEdit} className="flex-1 p-4 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 transition-colors shadow-sm">
                저장하기
              </button>
              <button onClick={() => setEditingQuestion(null)} className="flex-1 p-4 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors">
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}