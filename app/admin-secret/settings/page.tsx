'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { useAdminPath } from '../useAdminPath'
import { setGoogleLogin, setGeminiModel, setAutoGenerate, setAutoGenerateConfig, setAutoApproveSignup, setAllowedEmailDomains } from '../actions'
import { useToast } from '@/app/components/Toast'
import { DEFAULT_GEMINI_MODEL } from '@/app/lib/constants'

interface Category { id: string; name: string }
const AUTO_GEN_COUNTS = [3, 5, 10, 20]

// 2026-06 무료 티어 모델 (한도 안내). gemini-3.1-flash-lite가 가장 널널.
const GEMINI_MODELS = [
  { value: DEFAULT_GEMINI_MODEL, label: 'Gemini 3.1 Flash-Lite (무료 한도 최대 · 권장)' },
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
  const [isAutoApproveEnabled, setIsAutoApproveEnabled] = useState(false)
  const [allowedDomainsText, setAllowedDomainsText] = useState('')
  const [isSavingDomains, setIsSavingDomains] = useState(false)
  const [isAutoGenEnabled, setIsAutoGenEnabled] = useState(false)
  const [model, setModel] = useState(DEFAULT_GEMINI_MODEL)
  const [isSavingModel, setIsSavingModel] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // 자동 출제 대상/개수 설정
  const [categories, setCategories] = useState<Category[]>([])
  const [autoGenMode, setAutoGenMode] = useState<'rotation' | 'selected'>('rotation')
  const [autoGenCategoryIds, setAutoGenCategoryIds] = useState<string[]>([])
  const [autoGenCount, setAutoGenCount] = useState(5)
  const [autoGenOxRatio, setAutoGenOxRatio] = useState(0)
  // 난이도 비율: easy/hard 만 직접 조정, medium 은 잔여(=100-easy-hard)로 자동 계산
  const [diffEasy, setDiffEasy] = useState(30)
  const [diffHard, setDiffHard] = useState(20)
  const diffMedium = Math.max(0, 100 - diffEasy - diffHard)
  const [isSavingAutoGen, setIsSavingAutoGen] = useState(false)

  useEffect(() => {
    async function load() {
      const [{ data }, { data: cats }] = await Promise.all([
        supabase
          .from('site_settings')
          .select('google_login_enabled, auto_approve_signup, allowed_email_domains, gemini_model, auto_generate_enabled, auto_generate_mode, auto_generate_category_ids, auto_generate_count, auto_generate_ox_ratio, auto_generate_difficulty_ratio')
          .eq('id', 1)
          .single(),
        supabase.from('categories').select('id, name').eq('active', true).order('created_at'),
      ])
      if (data) {
        setIsGoogleEnabled(data.google_login_enabled)
        setIsAutoApproveEnabled(data.auto_approve_signup ?? false)
        setAllowedDomainsText(Array.isArray(data.allowed_email_domains) ? data.allowed_email_domains.join('\n') : '')
        setIsAutoGenEnabled(data.auto_generate_enabled ?? false)
        if (data.gemini_model) setModel(data.gemini_model)
        setAutoGenMode(data.auto_generate_mode === 'selected' ? 'selected' : 'rotation')
        setAutoGenCategoryIds(Array.isArray(data.auto_generate_category_ids) ? data.auto_generate_category_ids : [])
        setAutoGenCount(data.auto_generate_count ?? 5)
        setAutoGenOxRatio(data.auto_generate_ox_ratio ?? 0)
        const dr = (data.auto_generate_difficulty_ratio ?? {}) as { easy?: number; hard?: number }
        const clampPct = (v: unknown, fallback: number) => {
          const n = Number(v)
          return Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : fallback
        }
        setDiffEasy(clampPct(dr.easy, 30))
        setDiffHard(clampPct(dr.hard, 20))
      }
      if (cats) setCategories(cats)
      setIsLoading(false)
    }
    load()
  }, [supabase])

  // 분야 멀티셀렉트 드롭다운(이름순 정렬 + 검색 + 바깥 클릭 닫힘)
  const [catOpen, setCatOpen] = useState(false)
  const [catSearch, setCatSearch] = useState('')
  const catBoxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!catOpen) return
    const onDown = (e: MouseEvent) => {
      if (catBoxRef.current && !catBoxRef.current.contains(e.target as Node)) setCatOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [catOpen])

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.name.localeCompare(b.name, 'ko')),
    [categories]
  )
  const visibleCategories = useMemo(() => {
    const q = catSearch.trim().toLowerCase()
    return q ? sortedCategories.filter((c) => c.name.toLowerCase().includes(q)) : sortedCategories
  }, [sortedCategories, catSearch])

  const selectedSummary = useMemo(() => {
    const names = sortedCategories.filter((c) => autoGenCategoryIds.includes(c.id)).map((c) => c.name)
    if (names.length === 0) return ''
    if (names.length <= 2) return names.join(', ')
    return `${names.slice(0, 2).join(', ')} 외 ${names.length - 2}개`
  }, [sortedCategories, autoGenCategoryIds])

  const toggleCategoryId = (id: string) => {
    setAutoGenCategoryIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const handleSaveAutoGenConfig = async () => {
    setIsSavingAutoGen(true)
    const res = await setAutoGenerateConfig({
      mode: autoGenMode,
      categoryIds: autoGenCategoryIds,
      count: autoGenCount,
      oxRatio: autoGenOxRatio,
      difficultyRatio: { easy: diffEasy, medium: diffMedium, hard: diffHard },
    })
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

  const handleToggleAutoApprove = async () => {
    const newValue = !isAutoApproveEnabled
    const res = await setAutoApproveSignup(newValue)
    if (res.error) return toast.error(res.error)
    setIsAutoApproveEnabled(newValue)
    toast.success(`가입 자동 승인이 ${newValue ? '활성화' : '비활성화'} 되었습니다.`)
  }

  const handleSaveDomains = async () => {
    // 줄바꿈/쉼표/공백 어느 구분자로 입력해도 받아 정규화(소문자·선행 @ 제거·중복 제거)한다.
    const domains = Array.from(new Set(
      allowedDomainsText.split(/[\n,\s]+/).map((d) => d.trim().toLowerCase().replace(/^@+/, '')).filter(Boolean)
    ))
    setIsSavingDomains(true)
    const res = await setAllowedEmailDomains(domains)
    setIsSavingDomains(false)
    if (res.error) return toast.error(res.error)
    setAllowedDomainsText(domains.join('\n')) // 정규화 결과를 화면에 반영
    toast.success(domains.length ? '허용 도메인이 저장되었습니다.' : '도메인 제한이 해제되었습니다(모든 도메인 허용).')
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

        <section className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">가입 자동 승인</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">활성화 시 신규 가입자가 관리자 승인 없이 바로 이용할 수 있습니다(이메일 인증은 그대로 필요). 비공개 베타라면 꺼두세요.</p>
          </div>
          <button
            onClick={handleToggleAutoApprove}
            disabled={isLoading}
            className={`px-4 py-2 font-bold rounded-lg transition-colors disabled:opacity-50 shrink-0 ${isAutoApproveEnabled ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}
          >
            {isLoading ? '...' : isAutoApproveEnabled ? '활성화됨 (ON)' : '비활성화됨 (OFF)'}
          </button>
        </section>

        <section className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-3">
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">가입 허용 이메일 도메인</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              한 줄에 하나씩 입력하세요(예: company.com). 입력된 도메인의 이메일만 가입할 수 있고, 그 외 도메인은 다른 이메일을 입력하도록 안내됩니다.
              <span className="font-bold"> 비워두면 모든 도메인을 허용</span>합니다.
            </p>
          </div>
          <textarea
            value={allowedDomainsText}
            onChange={(e) => setAllowedDomainsText(e.target.value)}
            disabled={isLoading}
            rows={3}
            placeholder={'company.com\nuniv.ac.kr'}
            className="w-full p-2.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-100 disabled:opacity-50 font-mono"
          />
          <p className="text-[11px] text-amber-600 dark:text-amber-400">⚠️ 구글 로그인 가입은 이 제한을 우회합니다(이메일/비밀번호 가입에만 적용).</p>
          <button
            onClick={handleSaveDomains}
            disabled={isLoading || isSavingDomains}
            className="w-full p-2.5 font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-600 transition-colors text-sm"
          >
            {isSavingDomains ? '저장 중...' : '허용 도메인 저장'}
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

            {/* 선택 모드일 때만 분야 멀티셀렉트(펼침형) */}
            {autoGenMode === 'selected' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  출제 분야 선택 {autoGenCategoryIds.length > 0 && <span className="text-indigo-600 dark:text-indigo-400">({autoGenCategoryIds.length})</span>}
                </label>
                {categories.length === 0 ? (
                  <p className="text-xs text-slate-400 dark:text-slate-500">활성 분야가 없습니다.</p>
                ) : (
                  <div className="relative" ref={catBoxRef}>
                    {/* 요약 버튼 (셀렉트처럼 보임) */}
                    <button
                      type="button"
                      onClick={() => setCatOpen((v) => !v)}
                      className="w-full p-2.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 rounded-lg text-sm text-left flex items-center justify-between gap-2"
                    >
                      <span className={`truncate ${selectedSummary ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'}`}>
                        {selectedSummary || '분야를 선택하세요'}
                      </span>
                      <span className="shrink-0 text-slate-400 dark:text-slate-500">{catOpen ? '▲' : '▼'}</span>
                    </button>

                    {/* 펼침 패널 */}
                    {catOpen && (
                      <div className="absolute z-20 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg overflow-hidden">
                        <div className="p-2 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
                          <input
                            type="text"
                            value={catSearch}
                            onChange={(e) => setCatSearch(e.target.value)}
                            placeholder="분야 검색..."
                            className="flex-1 min-w-0 p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-100"
                          />
                          <button
                            type="button"
                            onClick={() => setAutoGenCategoryIds(sortedCategories.map((c) => c.id))}
                            className="shrink-0 text-xs font-bold px-2 py-1.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                          >
                            전체
                          </button>
                          <button
                            type="button"
                            onClick={() => setAutoGenCategoryIds([])}
                            className="shrink-0 text-xs font-bold px-2 py-1.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                          >
                            해제
                          </button>
                        </div>
                        <div className="max-h-56 overflow-y-auto p-1">
                          {visibleCategories.length === 0 ? (
                            <p className="text-xs text-slate-400 dark:text-slate-500 p-3 text-center">검색 결과가 없습니다.</p>
                          ) : (
                            visibleCategories.map((cat) => (
                              <label
                                key={cat.id}
                                className="flex items-center gap-2 px-2.5 py-2 rounded-md cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 text-sm text-slate-700 dark:text-slate-200"
                              >
                                <input
                                  type="checkbox"
                                  checked={autoGenCategoryIds.includes(cat.id)}
                                  onChange={() => toggleCategoryId(cat.id)}
                                  className="shrink-0"
                                />
                                <span className="truncate">{cat.name}</span>
                              </label>
                            ))
                          )}
                        </div>
                      </div>
                    )}
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

            {/* OX 비율 */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                OX 비율 <span className="text-indigo-600 dark:text-indigo-400">{autoGenOxRatio}%</span>
                <span className="font-normal text-slate-400 dark:text-slate-500"> (나머지 {100 - autoGenOxRatio}%는 객관식)</span>
              </label>
              <input
                type="range"
                min={0}
                max={100}
                step={10}
                value={autoGenOxRatio}
                onChange={(e) => setAutoGenOxRatio(Number(e.target.value))}
                disabled={isLoading}
                className="w-full accent-indigo-600"
              />
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                예: 문항 수 5 · OX 40% → 객관식 3 + OX 2. 0%면 전부 객관식, 100%면 전부 OX입니다.
              </p>
            </div>

            {/* 난이도 비율 (easy/hard 조절, medium 은 잔여) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">난이도 비율 <span className="font-normal text-slate-400 dark:text-slate-500">(합 100% · 보통은 나머지로 자동)</span></label>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    <span>쉬움(easy)</span><span className="text-indigo-600 dark:text-indigo-400">{diffEasy}%</span>
                  </div>
                  <input
                    type="range" min={0} max={100} step={5}
                    value={diffEasy}
                    onChange={(e) => setDiffEasy(Math.min(Number(e.target.value), 100 - diffHard))}
                    disabled={isLoading}
                    className="w-full accent-emerald-500"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    <span>어려움(hard)</span><span className="text-indigo-600 dark:text-indigo-400">{diffHard}%</span>
                  </div>
                  <input
                    type="range" min={0} max={100} step={5}
                    value={diffHard}
                    onChange={(e) => setDiffHard(Math.min(Number(e.target.value), 100 - diffEasy))}
                    disabled={isLoading}
                    className="w-full accent-rose-500"
                  />
                </div>
                <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-lg px-3 py-2">
                  <span>보통(medium) — 자동</span><span className="text-slate-700 dark:text-slate-200">{diffMedium}%</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">야간 자동 출제에만 적용됩니다. 정확한 분배가 아니라 AI에게 주는 목표 분포입니다.</p>
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
