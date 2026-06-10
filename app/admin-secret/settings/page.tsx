'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { useAdminPath } from '../useAdminPath'
import { setGoogleLogin } from '../actions'
import { useToast } from '@/app/components/Toast'

export default function AdminSettingsPage() {
  const supabase = createClient()
  const adminPath = useAdminPath()
  const toast = useToast()

  const [isGoogleEnabled, setIsGoogleEnabled] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('site_settings').select('google_login_enabled').eq('id', 1).single()
      if (data) setIsGoogleEnabled(data.google_login_enabled)
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
      </div>
    </main>
  )
}
