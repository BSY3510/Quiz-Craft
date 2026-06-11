import Link from 'next/link'
import { Card } from '@/app/components/ui'

export default function VerifyEmailPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-900">
      <Card className="w-full max-w-sm p-8 text-center">
        <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">이메일을 확인해 주세요</h1>
        <p className="text-slate-600 dark:text-slate-300 mb-6 text-sm">
          가입하신 주소로 인증 메일을 보내드렸습니다.<br />
          메일의 인증 링크를 눌러 가입을 완료해 주세요.<br />
          <span className="text-slate-400 dark:text-slate-500 text-xs">메일이 보이지 않으면 스팸함도 확인해 주세요.</span>
        </p>
        <Link
          href="/login"
          className="inline-block text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline"
        >
          로그인으로 돌아가기
        </Link>
      </Card>
    </main>
  )
}
