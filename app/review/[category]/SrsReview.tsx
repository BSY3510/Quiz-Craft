'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { useToast } from '@/app/components/Toast'
import { DifficultyBadge } from '@/app/components/ui'

interface QContent {
  id: string
  type: string
  question_text: string
  code_snippet: string | null
  options: { id: string; text: string }[]
  difficulty: string
}
export interface ReviewCard {
  question: QContent
  dueAt: number
  isDue: boolean
  box: number
}

interface GradeResult {
  isCorrect: boolean
  answerId: string
  explanation: string
  xpAwarded: number
}

export default function SrsReview({ categoryId, cards }: { categoryId: string; cards: ReviewCard[] }) {
  const router = useRouter()
  const supabase = createClient()
  const toast = useToast()

  const dueCards = cards.filter((c) => c.isDue)
  const nextDue = cards.filter((c) => !c.isDue).sort((a, b) => a.dueAt - b.dueAt)[0]

  const [queue, setQueue] = useState<QContent[] | null>(null) // null=시작 전
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [grading, setGrading] = useState(false)
  const [result, setResult] = useState<GradeResult | null>(null)
  const [correctCount, setCorrectCount] = useState(0)

  const start = (list: ReviewCard[]) => {
    setQueue(list.map((c) => c.question))
    setIndex(0)
    setCorrectCount(0)
    setSelected(null)
    setSubmitted(false)
    setResult(null)
  }

  const submit = async () => {
    if (!selected || grading || !queue) return
    setGrading(true)
    const { data, error } = await supabase.rpc('grade_and_award', {
      p_question_id: queue[index].id,
      p_selected_option_id: selected,
    })
    setGrading(false)
    if (error || !data) {
      toast.error('채점 처리 중 오류가 발생했습니다. 다시 시도해 주세요.')
      return
    }
    setResult({
      isCorrect: Boolean(data.is_correct),
      answerId: String(data.answer_id),
      explanation: String(data.explanation ?? ''),
      xpAwarded: Number(data.xp_awarded ?? 0),
    })
    setSubmitted(true)
    if (data.is_correct) setCorrectCount((c) => c + 1)
  }

  const next = () => {
    setIndex((i) => i + 1)
    setSelected(null)
    setSubmitted(false)
    setResult(null)
  }

  // ── 시작 전 요약 ──
  if (queue === null) {
    return (
      <div className="space-y-4">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-6 text-white shadow-md">
          <p className="text-purple-100 text-sm font-medium">오늘 복습할 문제</p>
          <p className="text-3xl font-black mt-1">{dueCards.length}<span className="text-lg font-bold text-purple-200">개</span></p>
          <p className="text-purple-100 text-xs mt-2">
            복습 대기 {cards.length}개 · 맞힐수록 복습 간격이 길어지고, 5번 연속 맞히면 졸업해요.
          </p>
        </div>

        {cards.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 p-10 text-center rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <span className="text-4xl">🎉</span>
            <p className="text-lg font-bold text-slate-700 dark:text-slate-200 mt-4">복습할 오답이 없어요!</p>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">이 분야에서 틀린 문제가 없거나 모두 졸업했습니다.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {dueCards.length > 0 ? (
              <button onClick={() => start(dueCards)} className="w-full p-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-sm">
                오늘의 복습 시작 ({dueCards.length}개)
              </button>
            ) : (
              <div className="bg-white dark:bg-slate-800 p-5 text-center rounded-xl border border-slate-200 dark:border-slate-700">
                <p className="font-bold text-slate-700 dark:text-slate-200">오늘 예정된 복습이 없어요 👍</p>
                {nextDue && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    다음 복습 예정: {new Date(nextDue.dueAt).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
                  </p>
                )}
              </div>
            )}
            <button onClick={() => start(cards)} className="w-full p-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 transition-colors">
              전체 복습 ({cards.length}개) — 일정 무시하고 모두 풀기
            </button>
          </div>
        )}
      </div>
    )
  }

  // ── 완료 ──
  if (index >= queue.length) {
    const total = queue.length
    const accuracy = total ? Math.round((correctCount / total) * 100) : 0
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-8 text-center">
        <span className="text-5xl">{accuracy >= 80 ? '🏆' : accuracy >= 50 ? '👏' : '💪'}</span>
        <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-3 mb-1">복습 완료!</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
          {total}문제 중 {correctCount}개 정답 ({accuracy}%) · 복습 일정이 갱신되었습니다.
        </p>
        <div className="flex flex-col gap-2">
          <button onClick={() => router.refresh()} className="w-full p-3.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors">
            복습 현황 새로고침
          </button>
          <div className="flex gap-2">
            <button onClick={() => router.push(`/quiz/${categoryId}`)} className="flex-1 p-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600">새 문제 풀기</button>
            <button onClick={() => router.push('/quiz')} className="flex-1 p-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600">분야 목록</button>
          </div>
        </div>
      </div>
    )
  }

  // ── 풀이 ──
  const q = queue[index]
  const isOX = q.type === 'true-false'
  const isCorrect = result?.isCorrect
  return (
    <div>
      <div className="flex justify-between text-xs font-bold text-slate-400 dark:text-slate-500 mb-1">
        <span>복습 진행</span>
        <span>{index + 1} / {queue.length}</span>
      </div>
      <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-6">
        <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${((index + 1) / queue.length) * 100}%` }} />
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <DifficultyBadge difficulty={q.difficulty} />
          {isOX && <span className="inline-block px-2 py-1 text-xs font-bold rounded bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">OX</span>}
        </div>
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-relaxed mb-4">{q.question_text}</h2>
        {q.code_snippet && (
          <pre className="bg-slate-800 dark:bg-slate-950 text-slate-50 p-4 rounded-lg overflow-x-auto text-sm font-mono mb-6"><code>{q.code_snippet}</code></pre>
        )}

        <div className={isOX ? 'grid grid-cols-2 gap-3' : 'flex flex-col gap-3'}>
          {q.options.map((option) => {
            const isSelected = selected === option.id
            const isAnswer = result?.answerId === option.id
            let cls = 'border-slate-200 hover:border-indigo-400 text-slate-700 bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:border-indigo-500'
            if (submitted) {
              if (isAnswer) cls = 'border-green-500 bg-green-50 text-green-800 font-bold dark:bg-green-900/30 dark:text-green-300'
              else if (isSelected && !isAnswer) cls = 'border-red-500 bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-300'
              else cls = 'border-slate-100 bg-slate-50 text-slate-400 opacity-50 dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-500'
            } else if (isSelected) {
              cls = 'border-indigo-500 bg-indigo-50 text-indigo-800 font-bold ring-1 ring-indigo-500 dark:bg-indigo-900/30 dark:text-indigo-300'
            }
            return (
              <button
                key={option.id}
                onClick={() => !submitted && setSelected(option.id)}
                className={`rounded-lg border-2 transition-all ${isOX ? 'p-6 text-center text-lg font-bold' : 'w-full p-4 text-left'} ${cls}`}
              >
                {option.text}
              </button>
            )
          })}
        </div>
      </div>

      {submitted && result ? (
        <div className={`p-4 rounded-xl border mb-4 ${isCorrect ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-900/50' : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-900/50'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`font-bold text-lg ${isCorrect ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {isCorrect ? '정답입니다! 🎉' : '오답입니다.'}
            </span>
            {result.xpAwarded > 0 && (
              <span className="px-2 py-1 bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-100 text-xs font-black rounded-lg">+{result.xpAwarded} XP</span>
            )}
          </div>
          <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed mb-4"><strong className="block mb-1">해설:</strong>{result.explanation}</p>
          <button onClick={next} className="w-full p-4 font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors">
            {index + 1 < queue.length ? '다음 문제' : '복습 마치기'}
          </button>
        </div>
      ) : (
        <button onClick={submit} disabled={!selected || grading} className="w-full p-4 font-bold text-white bg-slate-800 rounded-xl hover:bg-slate-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm dark:bg-slate-700 dark:hover:bg-slate-600 mb-4">
          {grading ? '채점 중...' : '제출하기'}
        </button>
      )}
    </div>
  )
}
