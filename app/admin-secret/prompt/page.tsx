'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { setSystemPrompt } from '../actions'

export default function AdminPromptPage() {
  const supabase = createClient()
  const pathname = usePathname()
  const adminPath = pathname.split('/').slice(0, 2).join('/')

  const [prompt, setPrompt] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    async function fetchPrompt() {
      const { data } = await supabase
        .from('site_settings')
        .select('system_prompt')
        .eq('id', 1)
        .single()
      
      if (data && data.system_prompt) {
        setPrompt(data.system_prompt)
      }
      setIsLoading(false)
    }
    fetchPrompt()
  }, [supabase])

  const handleSavePrompt = async () => {
    setIsSaving(true)
    const res = await setSystemPrompt(prompt)
    if (!res.error) {
      alert('AI 프롬프트가 성공적으로 저장되었습니다!')
    } else {
      alert(`저장 중 오류가 발생했습니다: ${res.error}`)
    }
    setIsSaving(false)
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 relative">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-800">⚙️ AI 프롬프트 관리</h1>
            <p className="text-slate-500 mt-1">문제 출제 AI에게 내릴 지시문(Prompt)을 자유롭게 수정하세요.</p>
          </div>
          <Link href={adminPath} className="text-sm font-bold text-blue-600 hover:underline">
            ← 관리자 센터로
          </Link>
        </header>

        <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
            <h3 className="text-sm font-bold text-blue-800 mb-2">💡 프롬프트 작성 가이드</h3>
            <ul className="text-xs text-blue-700 list-disc list-inside space-y-1.5">
              {/* ✅ 중괄호 렌더링 에러를 피하기 위해 템플릿 리터럴 형태로 텍스트 바인딩 안전 처리 */}
              <li><code className="bg-blue-100 px-1 py-0.5 rounded font-mono font-bold">{"{{category}}"}</code> : 치환자 문구를 넣으면, 문제 생성 시 선택한 분야명으로 자동 변경됩니다.</li>
              <li><code className="bg-blue-100 px-1 py-0.5 rounded font-mono font-bold">{"{{count}}"}</code> : 치환자 문구를 넣으면, 생성할 문제 개수로 자동 치환됩니다.</li>
              <li>AI가 결과를 완벽하게 파싱할 수 있도록 <strong>JSON 응답 가이드 구조</strong>는 에디터 하단 형태를 최대한 유지해 주세요.</li>
              <li>프로그래밍 이외의 다방면 퀴즈 앱으로 확장하려면 프롬프트 내의 &apos;프로그래밍&apos; 단어들을 제거하고 일반 지식 가이드로 수정하세요.</li>
            </ul>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-slate-500 font-bold">프롬프트를 불러오는 중입니다...</div>
          ) : (
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">시스템 프롬프트 에디터</label>
              <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={15}
                className="w-full p-4 border border-slate-300 rounded-lg text-sm text-slate-800 font-mono outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="AI에게 지시할 시스템 지시문을 빌드하세요..."
              />
              <button 
                onClick={handleSavePrompt}
                disabled={isSaving}
                className="mt-4 w-full p-4 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition-colors disabled:bg-slate-300"
              >
                {isSaving ? '저장 중...' : '프롬프트 저장 및 즉시 반영'}
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}