import ResetForm from './ResetForm'

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
      <div className="w-full max-w-sm bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">비밀번호 재설정</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 font-medium">QuizCraft</p>
        </div>

        <ResetForm />
      </div>
    </main>
  )
}
