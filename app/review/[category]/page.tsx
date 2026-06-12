export const dynamic = 'force-dynamic'

import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { computeCards, type AttemptLite } from './srs'
import SrsReview, { type ReviewCard } from './SrsReview'

interface QContent {
  id: string
  type: string
  question_text: string
  code_snippet: string | null
  options: { id: string; text: string }[]
  difficulty: string
}

export default async function CategoryReviewPage({ params }: { params: Promise<{ category: string }> }) {
  const resolvedParams = await params
  const categoryId = resolvedParams.category

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 1. 본인 풀이 기록(이 분야) 조회 — 일정 계산용. attempts_select_own 정책으로 허용.
  const { data: attemptsData } = await supabase
    .from('attempts')
    .select('question_id, is_correct, created_at, questions!inner ( category_id )')
    .eq('user_id', user.id)
    .eq('questions.category_id', categoryId)

  const attempts = (attemptsData as unknown as AttemptLite[]) || []

  // 1-2. 건너뛰기 기록(이 분야)도 합산 — SRS 에선 건너뜀 = 오답과 동일(복습 대상 + 연속정답 끊김).
  const { data: skipData } = await supabase
    .from('question_skips')
    .select('question_id, created_at, questions!inner ( category_id )')
    .eq('user_id', user.id)
    .eq('questions.category_id', categoryId)

  const skipEvents: AttemptLite[] = ((skipData as unknown as { question_id: string; created_at: string }[]) || [])
    .map((s) => ({ question_id: s.question_id, is_correct: false, created_at: s.created_at }))

  // 2. Leitner 일정 계산 → 복습 카드(졸업 제외). 풀이 기록 + 건너뜀을 함께 투입.
  const cardMetas = computeCards([...attempts, ...skipEvents], Date.now())

  // 3. 카드 문제들의 본문 조회(정답/해설 제외). RLS가 active만 반환 → 보관/삭제된 문제는 자동 제외.
  const ids = cardMetas.map((c) => c.questionId)
  let cards: ReviewCard[] = []
  if (ids.length > 0) {
    const { data: qData } = await supabase
      .from('questions')
      .select('id, type, question_text, code_snippet, options, difficulty')
      .in('id', ids)
    const contentById = new Map((qData as QContent[] | null ?? []).map((q) => [q.id, q]))
    cards = cardMetas
      .map((m) => {
        const question = contentById.get(m.questionId)
        return question ? { question, dueAt: m.dueAt, isDue: m.isDue, box: m.box } : null
      })
      .filter((c): c is ReviewCard => c !== null)
      .sort((a, b) => a.dueAt - b.dueAt)
  }

  return (
    <main className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-900 md:items-center p-4 pt-8">
      <div className="w-full max-w-2xl space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 font-black text-xs rounded uppercase">{categoryId}</span>
            </div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100">📝 오답 복습 (SRS)</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">틀린 문제를 간격 반복으로 다시 풀며 완전히 익혀요.</p>
          </div>
          <Link href="/quiz" className="px-4 py-2 bg-white border border-slate-200 text-slate-600 font-bold rounded-lg hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700 whitespace-nowrap">
            대시보드로
          </Link>
        </header>

        <SrsReview categoryId={categoryId} cards={cards} />
      </div>
    </main>
  )
}
