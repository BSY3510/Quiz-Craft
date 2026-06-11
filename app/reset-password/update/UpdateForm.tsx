'use client'

import { useActionState } from 'react'
import { updatePassword } from './actions'

export default function UpdateForm() {
  const [state, action, pending] = useActionState(updatePassword, null)

  return (
    <form action={action} className="space-y-4">
      <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
        새로 사용할 비밀번호를 입력해 주세요. (8자 이상)
      </p>
      <div>
        <label className="sr-only" htmlFor="password">새 비밀번호</label>
        <input id="password" name="password" type="password" placeholder="새 비밀번호" required minLength={8} className="w-full p-4 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-700 transition-all text-slate-800" />
      </div>
      <div>
        <label className="sr-only" htmlFor="confirm">새 비밀번호 확인</label>
        <input id="confirm" name="confirm" type="password" placeholder="새 비밀번호 확인" required minLength={8} className="w-full p-4 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-700 transition-all text-slate-800" />
      </div>

      {state?.error && (
        <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400 text-center bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-900 rounded-lg p-3">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className="w-full p-4 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed dark:bg-slate-700 dark:hover:bg-slate-600">
        {pending ? '변경 중...' : '비밀번호 변경하기'}
      </button>
    </form>
  )
}
