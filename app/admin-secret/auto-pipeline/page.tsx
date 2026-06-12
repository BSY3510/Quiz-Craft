'use client'

import { useState, useEffect } from 'react'
import { runAutoPipeline } from './actions'
import Link from 'next/link'
import { useAdminPath } from '../useAdminPath'
import { createClient } from '@/utils/supabase/client'

interface Category { id: string; name: string; }

export default function AutoPipelinePage() {
  const supabase = createClient()
  const adminPath = useAdminPath()

  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [resultMsg, setResultMsg] = useState<string | null>(null)

  useEffect(() => {
    async function fetchCategories() {
      const { data } = await supabase.from('categories').select('id, name').eq('active', true).order('created_at')
      if (data) setCategories(data)
    }
    fetchCategories()
  }, [supabase])

  const handleRunPipeline = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setResultMsg(null)
    const formData = new FormData(e.currentTarget)
    const category = formData.get('category') as string
    const count = parseInt(formData.get('count') as string, 10)
    const type = (formData.get('type') as string) === 'true-false' ? 'true-false' : 'multiple-choice'
    const rawDiff = formData.get('difficulty') as string
    const difficulty = rawDiff === 'easy' || rawDiff === 'medium' || rawDiff === 'hard' ? rawDiff : 'auto'

    const result = await runAutoPipeline(category, count, type, difficulty)
    if (result.error) {
      setResultMsg(`❌ 실패: ${result.error}`)
    } else {
      const approved = result.approvedCount ?? 0
      const queued = result.queuedCount ?? 0
      const skipped = result.skippedDuplicates ?? 0
      setResultMsg(
        `✅ ${result.insertedCount}개 등록 · AI 검증 통과 ${approved}개 즉시 노출` +
          (queued > 0 ? ` · ${queued}개는 검증 보류(문제 관리 > 검증 대기에서 확인)` : '') +
          (skipped > 0 ? ` · 중복 ${skipped}개 제외` : '')
      )
    }
    setIsLoading(false)
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100">AI 완전 자동화 파이프라인</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">AI가 출제 → 독립 AI 검수 → 통과분 즉시 노출. 검수 탈락분은 검증 큐로 보류됩니다.</p>
          </div>
          <Link href={adminPath} className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline">
            ← 관리자 메인으로
          </Link>
        </header>

        <section className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <form onSubmit={handleRunPipeline} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">분야 (Category)</label>
                <select name="category" className="w-full p-3 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 rounded-lg text-slate-800" required>
                  {categories.length === 0 && <option value="">분야를 불러오는 중...</option>}
                  {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">자동 생성 개수</label>
                <select name="count" className="w-full p-3 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 rounded-lg text-slate-800">
                  <option value="5">5 문항</option>
                  <option value="10">10 문항</option>
                  <option value="20">20 문항 (대량)</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">문제 유형</label>
                <select name="type" className="w-full p-3 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 rounded-lg text-slate-800">
                  <option value="multiple-choice">객관식 (4지선다)</option>
                  <option value="true-false">OX (참/거짓)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">난이도</label>
                <select name="difficulty" defaultValue="auto" className="w-full p-3 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 rounded-lg text-slate-800">
                  <option value="auto">자동 (AI 자연 분포)</option>
                  <option value="easy">쉬움으로 지정</option>
                  <option value="medium">보통으로 지정</option>
                  <option value="hard">어려움으로 지정</option>
                </select>
              </div>
            </div>
            <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
              <button type="submit" disabled={isLoading || categories.length === 0} className="w-full p-4 font-black text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-600 transition-colors">
                {isLoading ? '🤖 출제 및 검증 중...' : '🚀 파이프라인 가동'}
              </button>
            </div>
          </form>
        </section>

        {resultMsg && (
          <div className={`p-4 rounded-xl font-bold ${resultMsg.startsWith('✅') ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'}`}>
            {resultMsg}
          </div>
        )}
      </div>
    </main>
  )
}