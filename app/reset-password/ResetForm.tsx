'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { requestPasswordReset, verifyResetCode } from './actions'

export default function ResetForm() {
  const [email, setEmail] = useState('')
  const [reqState, reqAction, reqPending] = useActionState(requestPasswordReset, null)
  const [verifyState, verifyAction, verifyPending] = useActionState(verifyResetCode, null)

  const sent = reqState !== null && 'sent' in reqState
  const reqError = reqState !== null && 'error' in reqState ? reqState.error : null

  // 2단계: 코드 입력
  if (sent) {
    return (
      <form action={verifyAction} className="space-y-4">
        <input type="hidden" name="email" value={email} />
        <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
          <b className="text-slate-700 dark:text-slate-200">{email || '입력하신 주소'}</b>로 보내드린
          인증 코드를 입력해 주세요.
        </p>
        <div>
          <label className="sr-only" htmlFor="token">인증 코드</label>
          <input
            id="token"
            name="token"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={10}
            placeholder="인증 코드"
            required
            className="w-full p-4 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-center text-lg tracking-[0.4em] font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-700 transition-all text-slate-800"
          />
        </div>

        {verifyState?.error && (
          <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400 text-center bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-900 rounded-lg p-3">
            {verifyState.error}
          </p>
        )}

        <button type="submit" disabled={verifyPending} className="w-full p-4 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed dark:bg-slate-700 dark:hover:bg-slate-600">
          {verifyPending ? '확인 중...' : '코드 확인'}
        </button>

        <p className="text-center text-xs text-slate-400 dark:text-slate-500">
          코드를 받지 못하셨나요? 메일함(스팸함 포함)을 확인하거나{' '}
          <Link href="/reset-password" className="underline hover:text-slate-600 dark:hover:text-slate-300">다시 요청</Link>해 주세요.
        </p>
      </form>
    )
  }

  // 1단계: 이메일 입력
  return (
    <form action={reqAction} className="space-y-4">
      <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
        가입하신 이메일 주소를 입력하시면 비밀번호 재설정용 인증 코드를 보내드립니다.
      </p>
      <div>
        <label className="sr-only" htmlFor="email">이메일</label>
        <input
          id="email"
          name="email"
          type="email"
          placeholder="이메일 주소"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-4 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-700 transition-all text-slate-800"
        />
      </div>

      {reqError && (
        <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400 text-center bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-900 rounded-lg p-3">
          {reqError}
        </p>
      )}

      <button type="submit" disabled={reqPending} className="w-full p-4 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed dark:bg-slate-700 dark:hover:bg-slate-600">
        {reqPending ? '전송 중...' : '인증 코드 받기'}
      </button>

      <div className="text-center">
        <Link href="/login" className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 underline">
          로그인으로 돌아가기
        </Link>
      </div>
    </form>
  )
}
