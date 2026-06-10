export const dynamic = 'force-dynamic'

import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { DifficultyBadge } from '@/app/components/ui'
import BookmarkRemoveButton from './BookmarkRemoveButton'

interface BookmarkRow {
  id: string
  category_id: string
  type: string
  question_text: string
  code_snippet: string | null
  options: { id: string; text: string }[]
  answer_id: string
  explanation: string
  difficulty: string
}

export default async function BookmarksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 정답/해설은 일반 select에서 회수되므로 정의자 함수로 본인 북마크만 조회.
  const { data } = await supabase.rpc('get_bookmarked_questions')
  const items = (data as BookmarkRow[] | null) ?? []

  return (
    <main className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-900 md:items-center p-4 pt-8">
      <div className="w-full max-w-2xl space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100">🔖 내 북마크</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">저장해 둔 문제를 정답·해설과 함께 복습하세요.</p>
          </div>
          <Link href="/quiz" className="px-4 py-2 bg-white border border-slate-200 text-slate-600 font-bold rounded-lg hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700 whitespace-nowrap">
            대시보드로
          </Link>
        </header>

        {items.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 p-12 text-center rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <span className="text-4xl">🔖</span>
            <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200 mt-4">북마크한 문제가 없어요</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">문제를 풀다가 다시 보고 싶은 문제를 북마크해 보세요.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {items.map((q) => {
              const answerOption = q.options.find((opt) => opt.id === q.answer_id)
              return (
                <div key={q.id} className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                  <div className="flex gap-2 items-center mb-4">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 font-black text-xs rounded uppercase">{q.category_id}</span>
                    <DifficultyBadge difficulty={q.difficulty} />
                    <div className="ml-auto">
                      <BookmarkRemoveButton questionId={q.id} />
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">{q.question_text}</h3>

                  {q.code_snippet && (
                    <pre className="bg-slate-800 dark:bg-slate-950 text-slate-50 p-4 rounded-lg overflow-x-auto text-sm font-mono mb-4">
                      <code>{q.code_snippet}</code>
                    </pre>
                  )}

                  <div className="bg-green-50 border border-green-200 p-4 rounded-xl mb-4 dark:bg-green-900/20 dark:border-green-900/50">
                    <p className="text-xs font-bold text-green-800 dark:text-green-300 mb-1">정답</p>
                    <p className="font-medium text-green-900 dark:text-green-200">{answerOption?.text}</p>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl">
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">해설</p>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{q.explanation}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
