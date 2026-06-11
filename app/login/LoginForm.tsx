'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { login, signup } from './actions'

const INPUT_CLASS =
  'w-full p-4 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-700 transition-all text-slate-800'

export default function LoginForm({ isGoogleEnabled }: { isGoogleEnabled: boolean }) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')

  const [loginState, loginAction, loginPending] = useActionState(login, null)
  const [signupState, signupAction, signupPending] = useActionState(signup, null)

  // 가입 전용 상태
  const [agreed, setAgreed] = useState(false)
  const [pw, setPw] = useState('')
  const [pwConfirm, setPwConfirm] = useState('')

  const pwMismatch = pwConfirm.length > 0 && pw !== pwConfirm
  const canSignup = agreed && pw.length > 0 && pw === pwConfirm && !signupPending

  return (
    <div className="space-y-6">
      {/* Google 로그인 (로그인·가입 공통) */}
      <div className="flex flex-col gap-3">
        {isGoogleEnabled ? (
          <form action="/auth/google" method="post">
            <button className="w-full flex items-center justify-center gap-3 p-4 bg-white text-slate-700 font-bold rounded-xl border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Google로 계속하기
            </button>
          </form>
        ) : (
          <button disabled className="w-full flex items-center justify-center gap-3 p-4 bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 font-bold rounded-xl cursor-not-allowed border border-slate-200 dark:border-slate-600">
            Google 로그인 (현재 비활성화됨)
          </button>
        )}
      </div>

      <div className="relative flex items-center py-2">
        <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
        <span className="flex-shrink-0 mx-4 text-slate-400 dark:text-slate-500 text-xs font-bold">또는 이메일로</span>
        <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
      </div>

      {/* 로그인 / 가입 전환 탭 */}
      <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-slate-700/50 rounded-xl" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'login'}
          onClick={() => setMode('login')}
          className={`py-2.5 text-sm font-bold rounded-lg transition-colors ${mode === 'login' ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
        >
          로그인
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'signup'}
          onClick={() => setMode('signup')}
          className={`py-2.5 text-sm font-bold rounded-lg transition-colors ${mode === 'signup' ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
        >
          가입하기
        </button>
      </div>

      {/* 로그인 모드 */}
      {mode === 'login' && (
        <form action={loginAction} className="space-y-4">
          <div>
            <label className="sr-only" htmlFor="login-email">이메일</label>
            <input id="login-email" name="email" type="email" autoComplete="email" placeholder="이메일 주소" required className={INPUT_CLASS} />
          </div>
          <div>
            <label className="sr-only" htmlFor="login-password">비밀번호</label>
            <input id="login-password" name="password" type="password" autoComplete="current-password" placeholder="비밀번호" required className={INPUT_CLASS} />
          </div>

          <div className="flex justify-end">
            <Link href="/reset-password" className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 underline">
              비밀번호를 잊으셨나요?
            </Link>
          </div>

          {loginState?.error && (
            <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400 text-center bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-900 rounded-lg p-3">
              {loginState.error}
            </p>
          )}

          <button type="submit" disabled={loginPending} className="w-full p-4 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed dark:bg-slate-700 dark:hover:bg-slate-600">
            {loginPending ? '로그인 중...' : '로그인'}
          </button>
        </form>
      )}

      {/* 가입 모드 */}
      {mode === 'signup' && (
        <form action={signupAction} className="space-y-4">
          <div>
            <label className="sr-only" htmlFor="signup-email">이메일</label>
            <input id="signup-email" name="email" type="email" autoComplete="email" placeholder="이메일 주소" required className={INPUT_CLASS} />
          </div>
          <div>
            <label className="sr-only" htmlFor="signup-password">비밀번호</label>
            <input
              id="signup-password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="비밀번호 (8자 이상)"
              required
              minLength={8}
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label className="sr-only" htmlFor="signup-confirm">비밀번호 확인</label>
            <input
              id="signup-confirm"
              name="confirm"
              type="password"
              autoComplete="new-password"
              placeholder="비밀번호 확인"
              required
              value={pwConfirm}
              onChange={(e) => setPwConfirm(e.target.value)}
              className={`${INPUT_CLASS} ${pwMismatch ? 'border-red-300 dark:border-red-700 focus:ring-red-500' : ''}`}
            />
            {pwMismatch && (
              <p className="text-xs font-medium text-red-500 dark:text-red-400 mt-1.5 px-1">비밀번호가 일치하지 않습니다.</p>
            )}
          </div>

          {/* 가입 약관 동의 */}
          <div className="space-y-2 pt-1">
            <label className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                name="agree_terms"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>
                <span className="font-bold text-red-500">[필수]</span>{' '}
                <Link href="/terms" target="_blank" className="underline hover:text-slate-900 dark:hover:text-white">이용약관</Link> 및{' '}
                <Link href="/privacy" target="_blank" className="underline hover:text-slate-900 dark:hover:text-white">개인정보 수집·이용</Link>에 동의합니다. (만 14세 이상)
              </span>
            </label>
            <label className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                name="agree_marketing"
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>
                <span className="font-medium text-slate-400">[선택]</span> 이벤트·혜택 등 마케팅 정보 수신에 동의합니다.
              </span>
            </label>
          </div>

          {signupState?.error && (
            <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400 text-center bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-900 rounded-lg p-3">
              {signupState.error}
            </p>
          )}

          <button
            type="submit"
            disabled={!canSignup}
            title={!agreed ? '약관 동의 후 가입할 수 있습니다.' : pwMismatch ? '비밀번호가 일치하지 않습니다.' : undefined}
            className="w-full p-4 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed dark:bg-slate-700 dark:hover:bg-slate-600"
          >
            {signupPending ? '가입 중...' : '가입하기'}
          </button>
        </form>
      )}
    </div>
  )
}
