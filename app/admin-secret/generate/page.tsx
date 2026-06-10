'use client'

import Link from 'next/link'
import { useAdminPath } from '../useAdminPath'
import AdminQuizGenerator from '../AdminQuizGenerator'

export default function AdminGeneratePage() {
  const adminPath = useAdminPath()

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100">✍️ AI 출제 (검수 등록)</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">AI 초안을 생성하고, 직접 검수한 뒤 DB에 등록합니다.</p>
          </div>
          <Link href={adminPath} className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline">← 관리자 메인</Link>
        </header>

        <AdminQuizGenerator />
      </div>
    </main>
  )
}
