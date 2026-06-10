'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { submitReport } from '@/app/actions/report' // ✅ 신고 서버 액션 추가
import { useToast } from '@/app/components/Toast'
import { Modal } from '@/app/components/Modal'
import { Skeleton } from '@/app/components/Skeleton'
import { DifficultyBadge } from '@/app/components/ui'
import QuestionReactions from '@/app/components/QuestionReactions'

// ✅ 정답(answer_id)과 해설(explanation)은 클라이언트로 받지 않는다(SEC-A).
//    제출 후 서버 채점 결과(GradeResult)로만 노출된다.
interface Question {
  id: string;
  type: string;
  question_text: string;
  code_snippet: string | null;
  options: { id: string; text: string }[];
  difficulty: string;
}

interface GradeResult {
  isCorrect: boolean;
  answerId: string;
  explanation: string;
  xpAwarded: number;
}

// 한 세션당 문항 수. 활성 문제가 이보다 적으면 있는 만큼만.
const SESSION_SIZE = 10

// Fisher-Yates 셔플 (sort(()=>Math.random()-0.5)는 편향이 있어 사용 안 함)
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function QuizSolverPage({ params }: { params: Promise<{ category: string }> }) {
  const resolvedParams = use(params)
  const categoryId = resolvedParams.category

  const router = useRouter()
  const supabase = createClient()
  const toast = useToast()

  const [pool, setPool] = useState<Question[]>([])        // 분야의 전체 활성 문제(세션 재시작용)
  const [questions, setQuestions] = useState<Question[]>([]) // 이번 세션 문항(최대 SESSION_SIZE)
  const [isLoading, setIsLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  // 세션 집계
  const [correctCount, setCorrectCount] = useState(0)
  const [sessionXp, setSessionXp] = useState(0)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isGrading, setIsGrading] = useState(false)
  // ✅ 서버 채점 결과(정/오답·정답ID·해설·획득XP)를 담는다.
  const [result, setResult] = useState<GradeResult | null>(null)

  // ✅ 신고 기능 관련 상태 추가
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [isSubmittingReport, setIsSubmittingReport] = useState(false)

  useEffect(() => {
    async function fetchQuestions() {
      // ✅ 정답/해설 컬럼은 가져오지 않는다.
      const { data, error } = await supabase
        .from('questions')
        .select('id, type, question_text, code_snippet, options, difficulty')
        .eq('category_id', categoryId)
        .eq('status', 'active')

      if (!error && data) {
        const shuffled = shuffle(data as Question[])
        setPool(shuffled)
        setQuestions(shuffled.slice(0, SESSION_SIZE)) // 첫 세션
      }
      setIsLoading(false)
    }
    fetchQuestions()
  }, [categoryId, supabase])

  // 새 세션 시작 (전체 풀에서 다시 셔플 → SESSION_SIZE 만큼). 결과 화면에서 호출.
  const handleRestart = () => {
    setQuestions(shuffle(pool).slice(0, SESSION_SIZE))
    setCurrentIndex(0)
    setCorrectCount(0)
    setSessionXp(0)
    setSelectedOption(null)
    setIsSubmitted(false)
    setResult(null)
  }

  if (isLoading) return (
    <main className="flex min-h-screen flex-col items-center bg-slate-50 dark:bg-slate-900 p-4 pt-8">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-32 rounded-lg" />
          <Skeleton className="h-4 w-28" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
        <Skeleton className="h-44 w-full rounded-xl" />
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
      </div>
    </main>
  )
  if (questions.length === 0) return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
      <p className="text-slate-600 dark:text-slate-300 mb-4 font-bold">이 분야에는 아직 등록된 문제가 없습니다.</p>
      <button onClick={() => router.push('/quiz')} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold">대시보드로 돌아가기</button>
    </div>
  )

  const currentQuestion = questions[currentIndex]
  const isExhausted = currentIndex >= questions.length

  if (isExhausted) {
    const total = questions.length
    const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0
    const hasMore = pool.length > SESSION_SIZE
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
        <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 text-center">
          <span className="text-5xl">{accuracy >= 80 ? '🏆' : accuracy >= 50 ? '🎉' : '💪'}</span>
          <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-3 mb-1">세션 완료!</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">이번 세션 {total}문제를 모두 풀었어요.</p>

          <div className="grid grid-cols-3 gap-2 mb-6">
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3">
              <p className="text-2xl font-black text-slate-800 dark:text-slate-100">{correctCount}<span className="text-base text-slate-400">/{total}</span></p>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">정답</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3">
              <p className={`text-2xl font-black ${accuracy >= 80 ? 'text-green-600 dark:text-green-400' : accuracy >= 50 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-200'}`}>{accuracy}<span className="text-base">%</span></p>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">정답률</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3">
              <p className="text-2xl font-black text-amber-500 dark:text-amber-400">+{sessionXp}</p>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">획득 XP</p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button onClick={handleRestart} className="w-full p-3.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors">
              {hasMore ? '새 문제로 다시 풀기' : '다시 풀기'}
            </button>
            <div className="flex gap-2">
              <button onClick={() => router.push(`/review/${categoryId}`)} className="flex-1 p-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 transition-colors">오답 노트</button>
              <button onClick={() => router.push('/quiz')} className="flex-1 p-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 transition-colors">분야 목록</button>
            </div>
          </div>
        </div>
      </main>
    )
  }

  const handleSelect = (id: string) => {
    if (isSubmitted) return
    setSelectedOption(id)
  }

  const handleSubmit = async () => {
    if (!selectedOption || isGrading) return
    setIsGrading(true)

    // ✅ 정답 판정·XP 적립은 보안 정의자 함수가 서버에서 결정한다.
    //    함수를 클라이언트에서 직접 호출(1홉)해 채점 지연을 줄인다.
    const { data, error } = await supabase.rpc('grade_and_award', {
      p_question_id: currentQuestion.id,
      p_selected_option_id: selectedOption,
    })
    setIsGrading(false)

    if (error || !data) {
      console.error('grade_and_award error:', error)
      toast.error('채점 처리 중 오류가 발생했습니다. 다시 시도해 주세요.')
      return
    }

    // 결과를 받은 뒤 한 번에 제출 상태로 전환(중간 깜빡임 방지)
    setResult({
      isCorrect: Boolean(data.is_correct),
      answerId: String(data.answer_id),
      explanation: String(data.explanation ?? ''),
      xpAwarded: Number(data.xp_awarded ?? 0),
    })
    setIsSubmitted(true)
    // 세션 집계 누적
    if (data.is_correct) setCorrectCount((c) => c + 1)
    setSessionXp((x) => x + Number(data.xp_awarded ?? 0))
  }

  const handleNext = () => {
    setCurrentIndex(prev => prev + 1)
    setSelectedOption(null)
    setIsSubmitted(false)
    setResult(null)
    setIsReportModalOpen(false) // 다음 문제로 갈 때 모달 닫기
    setReportReason('')
  }

  // ✅ 신고 접수 핸들러
  const handleReportSubmit = async () => {
    if (!reportReason.trim()) { toast.error('신고 사유를 입력해 주세요.'); return }

    setIsSubmittingReport(true)
    const result = await submitReport(currentQuestion.id, reportReason)
    setIsSubmittingReport(false)

    if (result.success) {
      toast.success('신고가 정상적으로 접수되었습니다. 소중한 의견 감사합니다!')
      setIsReportModalOpen(false)
      setReportReason('')
    } else {
      toast.error(`오류: ${result.error}`)
    }
  }

  const isCorrect = isSubmitted && result?.isCorrect === true

  return (
    <main className="flex min-h-screen flex-col items-center bg-slate-50 dark:bg-slate-900 p-4 pt-8 relative">
      <div className="w-full max-w-md">

        <div className="flex justify-between items-center mb-6">
          <button onClick={() => router.push('/quiz')} className="text-sm font-bold text-slate-400 hover:text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:text-slate-100">
            ← 그만 풀고 나가기
          </button>
          <div className="text-sm font-bold text-slate-500 dark:text-slate-400">
            <span className="uppercase text-blue-600 dark:text-blue-400 mr-2">{categoryId}</span>
            <span>현재 {currentIndex + 1}문제째 도전 중</span>
          </div>
        </div>

        {/* 진행률 바 */}
        <div className="mb-6">
          <div className="flex justify-between text-xs font-bold text-slate-400 dark:text-slate-500 mb-1">
            <span>진행률</span>
            <span>{currentIndex + 1} / {questions.length}</span>
          </div>
          <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 mb-6 relative overflow-hidden">
          <div className="flex items-center gap-2 mb-3">
            <DifficultyBadge difficulty={currentQuestion.difficulty} />
            {currentQuestion.type === 'true-false' && (
              <span className="inline-block px-2 py-1 text-xs font-bold rounded bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">OX</span>
            )}
          </div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-relaxed mb-4">
            {currentQuestion.question_text}
          </h2>

          {currentQuestion.code_snippet && (
            <pre className="bg-slate-800 dark:bg-slate-950 text-slate-50 p-4 rounded-lg overflow-x-auto text-sm font-mono mb-6">
              <code>{currentQuestion.code_snippet}</code>
            </pre>
          )}

          <div className={currentQuestion.type === 'true-false' ? 'grid grid-cols-2 gap-3' : 'flex flex-col gap-3'}>
            {currentQuestion.options.map((option) => {
              const isOX = currentQuestion.type === 'true-false'
              const isSelected = selectedOption === option.id
              // ✅ 정답 여부는 제출 후 서버 결과로만 판단
              const isAnswer = result?.answerId === option.id

              let optionClass = "border-slate-200 hover:border-blue-400 text-slate-700 bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:border-blue-500"
              if (isSubmitted) {
                if (isAnswer) optionClass = "border-green-500 bg-green-50 text-green-800 font-bold dark:bg-green-900/30 dark:text-green-300"
                else if (isSelected && !isAnswer) optionClass = "border-red-500 bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                else optionClass = "border-slate-100 bg-slate-50 text-slate-400 opacity-50 dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-500"
              } else if (isSelected) {
                optionClass = "border-blue-500 bg-blue-50 text-blue-800 font-bold ring-1 ring-blue-500 dark:bg-blue-900/30 dark:text-blue-300"
              }

              return (
                <button
                  key={option.id}
                  onClick={() => handleSelect(option.id)}
                  className={`rounded-lg border-2 transition-all ${isOX ? 'p-6 text-center text-lg font-bold' : 'w-full p-4 text-left'} ${optionClass}`}
                >
                  {option.text}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex flex-col gap-4 mb-8">
          {isSubmitted && result ? (
            <div className={`p-4 rounded-xl border ${isCorrect ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-900/50' : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-900/50'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`font-bold text-lg ${isCorrect ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {isCorrect ? '정답입니다! 🎉' : '오답입니다.'}
                </span>
                {/* ✅ 실제 획득 XP를 표시(BUG-3) */}
                {result.xpAwarded > 0 && (
                  <span className="px-2 py-1 bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-100 text-xs font-black rounded-lg animate-bounce">+{result.xpAwarded} XP 획득!</span>
                )}
              </div>
              <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed mb-4">
                <strong className="block mb-1">해설:</strong>
                {result.explanation}
              </p>

              <div className="mb-3">
                <QuestionReactions questionId={currentQuestion.id} />
              </div>

              <div className="flex gap-2">
                <button onClick={handleNext} className="flex-1 p-4 font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-sm">
                  다음 문제
                </button>
                {/* ✅ 문제 신고/정정 요청 버튼 추가 */}
                <button
                  onClick={() => setIsReportModalOpen(true)}
                  className="px-4 font-bold text-slate-500 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
                  title="오류 신고"
                >
                  🚨 신고
                </button>
              </div>
            </div>
          ) : (
            <button onClick={handleSubmit} disabled={!selectedOption || isGrading} className="w-full p-4 font-bold text-white bg-slate-800 rounded-xl hover:bg-slate-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm dark:bg-slate-700 dark:hover:bg-slate-600">
              {isGrading ? '채점 중...' : '제출하기'}
            </button>
          )}
        </div>
      </div>

      {/* ✅ 오류 신고 모달 */}
      <Modal
        open={isReportModalOpen}
        onClose={() => { setIsReportModalOpen(false); setReportReason('') }}
        className="max-w-md"
        labelledBy="report-title"
      >
        <h3 id="report-title" className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">🚨 문제 오류 신고</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">문제의 오타나 잘못된 해설 등 오류를 알려주시면 검토 후 반영하겠습니다.</p>

        <textarea
          value={reportReason}
          onChange={(e) => setReportReason(e.target.value)}
          placeholder="예: 해설에 설명된 개념이 최신 버전과 다릅니다."
          className="w-full p-3 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 rounded-lg text-sm text-slate-800 mb-4"
          rows={4}
        />

        <div className="flex gap-2">
          <button
            onClick={handleReportSubmit}
            disabled={isSubmittingReport || !reportReason.trim()}
            className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 disabled:opacity-50 transition-colors"
          >
            {isSubmittingReport ? '접수 중...' : '신고하기'}
          </button>
          <button
            onClick={() => { setIsReportModalOpen(false); setReportReason('') }}
            className="flex-1 py-3 bg-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-300 transition-colors dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
          >
            취소
          </button>
        </div>
      </Modal>
    </main>
  )
}
