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

    const result = await runAutoPipeline(category, count)
    if (result.error) setResultMsg(`❌ 실패: ${result.error}`)
    else setResultMsg(`✅ 성공: ${result.insertedCount}개의 문제가 등록되었습니다!`)
    setIsLoading(false)
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-800">AI 완전 자동화 파이프라인</h1>
            <p className="text-slate-500 mt-1">AI가 문제를 출제하고 자가 검증하여 즉시 서비스에 배포합니다.</p>
          </div>
          <Link href={adminPath} className="text-sm font-bold text-blue-600 hover:underline">
            ← 관리자 메인으로
          </Link>
        </header>

        <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <form onSubmit={handleRunPipeline} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">분야 (Category)</label>
                <select name="category" className="w-full p-3 border border-slate-300 rounded-lg text-slate-800" required>
                  {categories.length === 0 && <option value="">분야를 불러오는 중...</option>}
                  {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">자동 생성 개수</label>
                <select name="count" className="w-full p-3 border border-slate-300 rounded-lg text-slate-800">
                  <option value="5">5 문항</option>
                  <option value="10">10 문항</option>
                  <option value="20">20 문항 (대량)</option>
                </select>
              </div>
            </div>
            <div className="pt-4 border-t border-slate-100">
              <button type="submit" disabled={isLoading || categories.length === 0} className="w-full p-4 font-black text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:bg-slate-300 transition-colors">
                {isLoading ? '🤖 출제 및 검증 중...' : '🚀 파이프라인 가동'}
              </button>
            </div>
          </form>
        </section>

        {resultMsg && (
          <div className={`p-4 rounded-xl font-bold ${resultMsg.startsWith('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {resultMsg}
          </div>
        )}
      </div>
    </main>
  )
}