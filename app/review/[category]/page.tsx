export const dynamic = 'force-dynamic'

import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export default async function CategoryReviewPage({ params }: { params: Promise<{ category: string }> }) {
  // Next.js 15+ params Unwrapping
  const resolvedParams = await params
  const categoryId = resolvedParams.category
  
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // ✅ 정답/해설은 일반 사용자 select에서 회수되므로(SEC-A), 정의자 함수로 조회.
  //    함수가 해당 카테고리의 오답 문제를 중복 제거·최근순으로 반환한다.
  const { data } = await supabase
    .rpc('get_incorrect_questions', { p_category: categoryId })
  const incorrectQuestions = data ?? []

  return (
    <main className="flex min-h-screen flex-col bg-slate-50 md:items-center p-4 pt-8">
      <div className="w-full max-w-2xl space-y-6">
        
        <header className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-1 bg-blue-100 text-blue-700 font-black text-xs rounded uppercase">{categoryId}</span>
            </div>
            <h1 className="text-2xl font-black text-slate-800">📝 나의 오답 노트</h1>
            <p className="text-slate-500 mt-1">내가 틀렸던 문제들을 다시 복습해 보세요.</p>
          </div>
          <Link href="/quiz" className="px-4 py-2 bg-white border border-slate-200 text-slate-600 font-bold rounded-lg hover:bg-slate-50">
            대시보드로
          </Link>
        </header>

        {incorrectQuestions.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-4xl">🎉</span>
            <h2 className="text-lg font-bold text-slate-700 mt-4">오답 노트가 텅 비어있어요!</h2>
            <p className="text-slate-500 mt-2">해당 분야에서 틀린 문제가 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {incorrectQuestions.map((q: any, index: number) => {
              const answerOption = q.options.find((opt: any) => opt.id === q.answer_id)
              
              return (
                <div key={q.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <div className="flex gap-2 items-center mb-4">
                    <span className="text-sm font-bold text-slate-400">오답 복습 #{index + 1}</span>
                  </div>
                  
                  <h3 className="text-lg font-bold text-slate-800 mb-4">{q.question_text}</h3>
                  
                  {q.code_snippet && (
                    <pre className="bg-slate-800 text-slate-50 p-4 rounded-lg overflow-x-auto text-sm font-mono mb-4">
                      <code>{q.code_snippet}</code>
                    </pre>
                  )}

                  <div className="bg-green-50 border border-green-200 p-4 rounded-xl mb-4">
                    <p className="text-xs font-bold text-green-800 mb-1">정답</p>
                    <p className="font-medium text-green-900">{answerOption?.text}</p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl">
                    <p className="text-xs font-bold text-slate-500 mb-1">상세 해설</p>
                    <p className="text-sm text-slate-700 leading-relaxed">{q.explanation}</p>
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