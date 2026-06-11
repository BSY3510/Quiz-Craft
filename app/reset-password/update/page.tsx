import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import UpdateForm from './UpdateForm'

export default async function UpdatePasswordPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
      <div className="w-full max-w-sm bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">새 비밀번호 설정</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 font-medium">QuizCraft</p>
        </div>

        {user ? (
          <UpdateForm />
        ) : (
          <div className="space-y-4 text-center">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              유효하지 않거나 만료된 링크입니다.<br />
              비밀번호 재설정을 다시 요청해 주세요.
            </p>
            <Link href="/reset-password" className="inline-block text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline">
              비밀번호 재설정 다시 요청하기
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
