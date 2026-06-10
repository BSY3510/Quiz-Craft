'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { generateQuizDraft, saveReviewedQuestions } from './actions' 

interface Category { id: string; name: string; }

export default function AdminQuizGenerator() {
  const supabase = createClient()
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(false)
  
  // ✅ JSON 문자열 대신 객체 배열로 상태 관리 (시각적 UI 렌더링 용도)
  const [drafts, setDrafts] = useState<any[]>([])
  // 생성 시 선택한 분야(저장 시 일괄 적용)
  const [draftCategory, setDraftCategory] = useState<string>('')

  useEffect(() => {
    async function fetchCategories() {
      const { data } = await supabase.from('categories').select('id, name').eq('active', true).order('created_at')
      if (data) setCategories(data)
    }
    fetchCategories()
  }, [supabase])

  const handleGenerate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setDrafts([]) 
    
    const formData = new FormData(e.currentTarget)
    const result = await generateQuizDraft(formData)
    
    if (result.success) {
      setDrafts(result.data ?? []) // 정규화된 객체 배열
      setDraftCategory(result.category ?? '')
    } else {
      alert(`❌ 생성 실패: ${result.error}`)
    }
    setIsLoading(false)
  }

  // 배열 내 특정 인덱스의 데이터 수정 핸들러
  const handleUpdateDraft = (index: number, field: string, value: any) => {
    const newDrafts = [...drafts]
    newDrafts[index][field] = value
    setDrafts(newDrafts)
  }

  const handleSaveToDB = async () => {
    try {
      const result = await saveReviewedQuestions(draftCategory, drafts)
      if (result.success) {
        alert('✅ 성공적으로 DB에 등록되었습니다!')
        setDrafts([])
        setDraftCategory('')
      } else {
        alert(`❌ 등록 실패: ${result.error}`)
      }
    } catch (error) {
      alert('저장 중 오류가 발생했습니다.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-lg font-bold text-slate-800 mb-4">AI 문제 출제기</h2>
        
        <form onSubmit={handleGenerate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">분야 (Category)</label>
              <select name="category" className="w-full p-3 border border-slate-300 rounded-lg text-slate-800" required>
                {categories.length === 0 && <option value="">분야를 불러오는 중...</option>}
                {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">생성 개수</label>
              <select name="count" className="w-full p-3 border border-slate-300 rounded-lg text-slate-800">
                <option value="1">1 문항</option>
                <option value="3">3 문항</option>
                <option value="5">5 문항</option>
              </select>
            </div>
          </div>
          <button type="submit" disabled={isLoading || categories.length === 0}
            className="w-full p-4 font-black text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-wait transition-colors"
          >
            {isLoading ? 'AI가 문제를 생성하는 중입니다...' : '초안 생성하기'}
          </button>
        </form>
      </div>

      {/* ✅ Raw JSON 대신 카드 형태의 시각적 검수 UI 제공 */}
      {drafts.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-slate-800">수동 검수 및 DB 등록</h2>
            <button onClick={handleSaveToDB} className="px-6 py-2 font-bold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors">
              완료 및 DB 등록
            </button>
          </div>
          
          <div className="space-y-6">
            {drafts.map((draft, idx) => (
              <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="font-bold text-slate-500 text-sm">문제 {idx + 1}</div>
                <textarea 
                  value={draft.question_text} 
                  onChange={(e) => handleUpdateDraft(idx, 'question_text', e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-lg font-bold text-slate-800"
                  rows={2}
                />
                
                <div className="grid grid-cols-2 gap-2">
                  {draft.options.map((opt: any, optIdx: number) => (
                    <div key={opt.id} className={`flex items-center p-2 border rounded-lg ${draft.answer_id === opt.id ? 'border-green-500 bg-green-50' : 'border-slate-300 bg-white'}`}>
                      <span className="w-6 font-bold text-slate-400">{opt.id}.</span>
                      <input 
                        value={opt.text}
                        onChange={(e) => {
                          const newOptions = [...draft.options];
                          newOptions[optIdx].text = e.target.value;
                          handleUpdateDraft(idx, 'options', newOptions);
                        }}
                        className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-slate-700"
                      />
                    </div>
                  ))}
                </div>

                <div className="mt-2">
                  <label className="text-xs font-bold text-slate-500">해설</label>
                  <textarea 
                    value={draft.explanation} 
                    onChange={(e) => handleUpdateDraft(idx, 'explanation', e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm text-slate-600 mt-1"
                    rows={2}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}