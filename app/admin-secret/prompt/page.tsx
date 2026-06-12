'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { useAdminPath } from '../useAdminPath'
import { setPrompts } from '../actions'
import { DEFAULT_TRUE_FALSE_PROMPT } from '../questionSchema'
import { useToast } from '@/app/components/Toast'

type Tab = 'common' | 'mc' | 'ox'

const TABS: { key: Tab; label: string }[] = [
  { key: 'common', label: '공통' },
  { key: 'mc', label: '객관식' },
  { key: 'ox', label: 'OX' },
]

export default function AdminPromptPage() {
  const supabase = createClient()
  const adminPath = useAdminPath()
  const toast = useToast()

  const [tab, setTab] = useState<Tab>('common')
  const [common, setCommon] = useState('')
  const [mc, setMc] = useState('')
  const [ox, setOx] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    async function fetchPrompts() {
      const { data } = await supabase
        .from('site_settings')
        .select('system_prompt, prompt_multiple_choice, prompt_true_false')
        .eq('id', 1)
        .single()

      if (data) {
        setCommon(data.system_prompt || '')
        setMc(data.prompt_multiple_choice || '')
        setOx(data.prompt_true_false || '')
      }
      setIsLoading(false)
    }
    fetchPrompts()
  }, [supabase])

  const handleSave = async () => {
    setIsSaving(true)
    const res = await setPrompts({ common, multipleChoice: mc, trueFalse: ox })
    if (!res.error) {
      toast.success('AI 프롬프트가 저장되어 즉시 반영됩니다!')
    } else {
      toast.error(`저장 중 오류가 발생했습니다: ${res.error}`)
    }
    setIsSaving(false)
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6 relative">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100">⚙️ AI 프롬프트 관리</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">문제 출제 AI에게 내릴 지시문을 유형별로 나누어 관리하세요.</p>
          </div>
          <Link href={adminPath} className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline">
            ← 관리자 센터로
          </Link>
        </header>

        <section className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
          {/* 탭 */}
          <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-900/50 rounded-xl w-fit">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${
                  tab === t.key
                    ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400 font-bold">프롬프트를 불러오는 중입니다...</div>
          ) : (
            <>
              {/* 공통 탭 */}
              {tab === 'common' && (
                <div className="space-y-3">
                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg dark:bg-blue-900/20 dark:border-blue-900/50">
                    <h3 className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-2">💡 공통 프롬프트 (모든 유형에 적용)</h3>
                    <ul className="text-xs text-blue-700 dark:text-blue-300 list-disc list-inside space-y-1.5">
                      <li><code className="bg-blue-100 dark:bg-blue-900/40 dark:text-blue-200 px-1 py-0.5 rounded font-mono font-bold">{'{{category}}'}</code> : 선택한 분야명(분야에 <strong>AI용 이름</strong>이 있으면 그 값)으로 치환됩니다.</li>
                      <li><code className="bg-blue-100 dark:bg-blue-900/40 dark:text-blue-200 px-1 py-0.5 rounded font-mono font-bold">{'{{count}}'}</code> : 생성할 문제 개수로 치환됩니다.</li>
                      <li><code className="bg-blue-100 dark:bg-blue-900/40 dark:text-blue-200 px-1 py-0.5 rounded font-mono font-bold">{'{{category_guide}}'}</code> : 분야별 출제 가이드가 삽입됩니다(분야 관리에서 입력).</li>
                      <li>유형별(객관식·OX) 세부 지시는 각 탭으로 분리하세요. 공통은 역할·포맷·JSON 구조 등 공통 규칙을 담습니다.</li>
                    </ul>
                  </div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">공통 프롬프트 (필수)</label>
                  <textarea
                    value={common}
                    onChange={(e) => setCommon(e.target.value)}
                    rows={16}
                    className="w-full p-4 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-100 font-mono outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="AI에게 지시할 공통 지시문을 작성하세요..."
                  />
                </div>
              )}

              {/* 객관식 탭 */}
              {tab === 'mc' && (
                <div className="space-y-3">
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg dark:bg-slate-900/30 dark:border-slate-700">
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">📋 객관식(4지선다) 전용 지시</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">공통 프롬프트 뒤에 덧붙습니다. <strong>비워두면 공통 프롬프트의 지시를 그대로 사용</strong>합니다(현행 동작).</p>
                  </div>
                  <textarea
                    value={mc}
                    onChange={(e) => setMc(e.target.value)}
                    rows={12}
                    className="w-full p-4 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-100 font-mono outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="(선택) 객관식 전용 지시. 예: 보기는 정확히 4개, 오답도 그럴듯하게 구성 등"
                  />
                </div>
              )}

              {/* OX 탭 */}
              {tab === 'ox' && (
                <div className="space-y-3">
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg dark:bg-amber-900/20 dark:border-amber-900/50 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-amber-800 dark:text-amber-300 mb-1">⭕ OX(참/거짓) 전용 지시</h3>
                      <p className="text-xs text-amber-700 dark:text-amber-400"><strong>비워두면 기본 OX 지시</strong>를 사용합니다. 아래 버튼으로 기본값을 불러와 편집할 수 있습니다.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOx(DEFAULT_TRUE_FALSE_PROMPT)}
                      className="shrink-0 px-3 py-2 text-xs font-bold rounded-lg bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-200 dark:hover:bg-amber-900/60"
                    >
                      기본값 불러오기
                    </button>
                  </div>
                  <textarea
                    value={ox}
                    onChange={(e) => setOx(e.target.value)}
                    rows={12}
                    className="w-full p-4 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-100 font-mono outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="(선택) OX 전용 지시. 비워두면 기본 OX 지시가 자동 적용됩니다."
                  />
                </div>
              )}

              <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full p-4 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition-colors disabled:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 dark:disabled:bg-slate-600"
              >
                {isSaving ? '저장 중...' : '프롬프트 저장 및 즉시 반영 (공통·객관식·OX 모두 저장)'}
              </button>
            </>
          )}
        </section>
      </div>
    </main>
  )
}
