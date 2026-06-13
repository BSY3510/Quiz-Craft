'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { useAdminPath } from '../useAdminPath'
import { setGoogleLogin, setGeminiModel, setAutoApproveSignup, setAllowedEmailDomains } from '../actions'
import { useToast } from '@/app/components/Toast'
import { DEFAULT_GEMINI_MODEL } from '@/app/lib/constants'
import AutoGenerateSettings from './AutoGenerateSettings'

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
  const [model, setModel] = useState(DEFAULT_GEMINI_MODEL)
  const [isSavingModel, setIsSavingModel] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('site_settings')
        .select('google_login_enabled, auto_approve_signup, allowed_email_domains, gemini_model')
        .eq('id', 1)
        .single()
      if (data) {
        setIsGoogleEnabled(data.google_login_enabled)
        setIsAutoApproveEnabled(data.auto_approve_signup ?? false)
        setAllowedDomainsText(Array.isArray(data.allowed_email_domains) ? data.allowed_email_domains.join('\n') : '')
        if (data.gemini_model) setModel(data.gemini_model)
      }
      setIsLoading(false)
    }
    load()
  }, [supabase])

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

        {/* 자동 출제(야간) 설정 — 자체 조회·저장 컴포넌트 */}
        <AutoGenerateSettings />

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
