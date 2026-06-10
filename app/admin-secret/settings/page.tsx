'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { useAdminPath } from '../useAdminPath'
import { setGoogleLogin, setGeminiModel, setAutoGenerate, setAutoGenerateConfig } from '../actions'
import { useToast } from '@/app/components/Toast'

interface Category { id: string; name: string }
const AUTO_GEN_COUNTS = [3, 5, 10, 20]

// 2026-06 무료 티어 모델 (한도 안내). gemini-3.1-flash-lite가 가장 널널.
const GEMINI_MODELS = [
  { value: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash-Lite (무료 한도 최대 · 권장)' },
  { value: 'gemini-3-flash', label: 'Gemini 3 Flash' },
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash-Lite' },
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (한도 가장 빡빡)' },
]

export default function AdminSettingsPage() {
  const supabase = createClient()
  const adminPath = useAdminPath()
  const toast = useToast()

  const [isGoogleEnabled, setIsGoogleEnabled] = useState(false)
  const [isAutoGenEnabled, setIsAutoGenEnabled] = useState(false)
  const [model, setModel] = useState('gemini-3.1-flash-lite')
  const [isSavingModel, setIsSavingModel] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // 자동 출제 대상/개수 설정
  const [categories, setCategories] = useState<Category[]>([])
  const [autoGenMode, setAutoGenMode] = useState<'rotation' | 'selected'>('rotation')
  const [autoGenCategoryIds, setAutoGenCategoryIds] = useState<string[]>([])
  const [autoGenCount, setAutoGenCount] = useState(5)
  const [isSavingAutoGen, setIsSavingAutoGen] = useState(false)

  useEffect(() => {
    async function load() {
      const [{ data }, { data: cats }] = await Promise.all([
        supabase
          .from('site_settings')
          .select('google_login_enabled, gemini_model, auto_generate_enabled, auto_generate_mode, auto_generate_category_ids, auto_generate_count')
          .eq('id', 1)
          .single(),
        supabase.from('categories').select('id, name').eq('active', true).order('created_at'),
      ])
      if (data) {
        setIsGoogleEnabled(data.google_login_enabled)
        setIsAutoGenEnabled(data.auto_generate_enabled ?? false)
        if (data.gemini_model) setModel(data.gemini_model)
        setAutoGenMode(data.auto_generate_mode === 'selected' ? 'selected' : 'rotation')
        setAutoGenCategoryIds(Array.isArray(data.auto_generate_category_ids) ? data.auto_generate_category_ids : [])
        setAutoGenCount(data.auto_generate_count ?? 5)
      }
      if (cats) setCategories(cats)
      setIsLoading(false)
    }
    load()
  }, [supabase])

  const toggleCategoryId = (id: string) => {
    setAutoGenCategoryIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const handleSaveAutoGenConfig = async () => {
    setIsSavingAutoGen(true)
    const res = await setAutoGenerateConfig({ mode: autoGenMode, categoryIds: autoGenCategoryIds, count: autoGenCount })
    setIsSavingAutoGen(false)
    if (res.error) return toast.error(res.error)
    toast.success('자동 출제 설정이 저장되었습니다.')
  }

  const handleToggleGoogleLogin = async () => {
    const newValue = !isGoogleEnabled
    const res = await setGoogleLogin(newValue)
    if (res.error) return toast.error(res.error)
    setIsGoogleEnabled(newValue)
    toast.success(`구글 로그인이 ${newValue ? '활성화' : '비활성화'} 되었습니다.`)
  }

  const handleToggleAutoGen = async () => {
    const newValue = !isAutoGenEnabled
    const res = await setAutoGenerate(newValue)
    if (res.error) return toast.error(res.error)
    setIsAutoGenEnabled(newValue)
    toast.success(`자동 출제가 ${newValue ? '활성화' : '비활성화'} 되었습니다.`)
  }

  const handleChangeModel = async (value: string) => {
    setModel(value)
    setIsSavingModel(true)
    const res = await setGeminiModel(value)
    setIsSavingModel(false)
    if (res.error) return toast.error(res.error)
    toast.success('AI 모델이 변경되었습니다.')
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100">🛠️ 사이트 설정</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">서비스 전역 설정을 관리합니다.</p>
          </div>
          <Link href={adminPath} className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline">← 관리자 메인</Link>
        </header>

        <section className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">구글 소셜 로그인 연동</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">로그인 화면에서 구글 로그인 접근을 허용하거나 차단합니다.</p>
          </div>
          <button
            onClick={handleToggleGoogleLogin}
            disabled={isLoading}
            className={`px-4 py-2 font-bold rounded-lg transition-colors disabled:opacity-50 ${isGoogleEnabled ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}
          >
            {isLoading ? '...' : isGoogleEnabled ? '활성화됨 (ON)' : '비활성화됨 (OFF)'}
          </button>
        </section>

        <section className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">자동 출제 (매일 밤)</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">매일 KST 04:00경 AI가 문제를 자동 생성·검증합니다. 꺼두면 야간 자동 출제만 멈춥니다(수동 출제는 영향 없음).</p>
            </div>
            <button
              onClick={handleToggleAutoGen}
              disabled={isLoading}
              className={`px-4 py-2 font-bold rounded-lg transition-colors disabled:opacity-50 shrink-0 ${isAutoGenEnabled ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}
            >
              {isLoading ? '...' : isAutoGenEnabled ? '활성화됨 (ON)' : '비활성화됨 (OFF)'}
            </button>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-700 space-y-4">
            {/* 분야 선정 방식 */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">분야 선정 방식</label>
              <select
                value={autoGenMode}
                onChange={(e) => setAutoGenMode(e.target.value as 'rotation' | 'selected')}
                disabled={isLoading}
                className="w-full p-2.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 rounded-lg text-sm text-slate-800 disabled:opacity-50"
              >
                <option value="rotation">자동 로테이션 (문제 적은 분야부터 자동)</option>
                <option value="selected">관리자가 분야 선택</option>
              </select>
            </div>

            {/* 선택 모드일 때만 분야 체크박스 */}
            {autoGenMode === 'selected' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">출제 분야 선택</label>
                {categories.length === 0 ? (
                  <p className="text-xs text-slate-400 dark:text-slate-500">활성 분야가 없습니다.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
                    {categories.map((cat) => (
                      <label key={cat.id} className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-600 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 text-sm text-slate-700 dark:text-slate-200">
                        <input
                          type="checkbox"
                          checked={autoGenCategoryIds.includes(cat.id)}
                          onChange={() => toggleCategoryId(cat.id)}
                          className="shrink-0"
                        />
                        <span className="truncate">{cat.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 분야당 생성 문항 수 */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">분야당 생성 문항 수 (1회 실행당)</label>
              <select
                value={autoGenCount}
                onChange={(e) => setAutoGenCount(Number(e.target.value))}
                disabled={isLoading}
                className="w-full p-2.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 rounded-lg text-sm text-slate-800 disabled:opacity-50"
              >
                {AUTO_GEN_COUNTS.map((n) => (
                  <option key={n} value={n}>{n} 문항</option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">무료 한도·함수 시간 한도를 고려해 1회 실행당 일부 분야만 채웁니다(문항 수가 클수록 처리 분야 수는 줄 수 있음).</p>
            </div>

            <button
              onClick={handleSaveAutoGenConfig}
              disabled={isLoading || isSavingAutoGen}
              className="w-full p-2.5 font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-600 transition-colors text-sm"
            >
              {isSavingAutoGen ? '저장 중...' : '자동 출제 설정 저장'}
            </button>
          </div>
        </section>

        <section className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">AI 출제 모델</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-3">문제 생성(반자동·자동)에 사용할 Gemini 모델입니다. 무료 한도가 모델마다 다릅니다.</p>
          <select
            value={model}
            onChange={(e) => handleChangeModel(e.target.value)}
            disabled={isLoading || isSavingModel}
            className="w-full p-3 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 rounded-lg text-sm text-slate-800 disabled:opacity-50"
          >
            {GEMINI_MODELS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          {isSavingModel && <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">저장 중...</p>}
        </section>
      </div>
    </main>
  )
}
