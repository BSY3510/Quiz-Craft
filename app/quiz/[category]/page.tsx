'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { submitAnswer } from '../actions'
import { submitReport } from '@/app/actions/report' // ✅ 신고 서버 액션 추가

// ✅ 정답(answer_id)과 해설(explanation)은 클라이언트로 받지 않는다(SEC-A).
//    제출 후 서버 채점 결과(GradeResult)로만 노출된다.
interface Question {
  id: string;
  type: string;
  question_text: string;
  code_snippet: string | null;
  options: { id: string; text: string }[];
}

interface GradeResult {
  isCorrect: boolean;
  answerId: string;
  explanation: string;
  xpAwarded: number;
}

export default function QuizSolverPage({ params }: { params: Promise<{ category: string }> }) {
  const resolvedParams = use(params)
  const categoryId = resolvedParams.category

  const router = useRouter()
  const supabase = createClient()

  const [questions, setQuestions] = useState<Question[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [isSubmitted, setIsSubmitted] = useState(false)
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
        .select('id, type, question_text, code_snippet, options')
        .eq('category_id', categoryId)
        .eq('status', 'active')

      if (!error && data) {
        const shuffled = [...data].sort(() => Math.random() - 0.5)
        setQuestions(shuffled)
      }
      setIsLoading(false)
    }
    fetchQuestions()
  }, [categoryId, supabase])

  if (isLoading) return <div className="flex min-h-screen items-center justify-center bg-slate-50"><p className="text-slate-500 font-bold animate-pulse">문제를 준비 중입니다...</p></div>
  if (questions.length === 0) return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
      <p className="text-slate-600 mb-4 font-bold">이 분야에는 아직 등록된 문제가 없습니다.</p>
      <button onClick={() => router.push('/quiz')} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold">대시보드로 돌아가기</button>
    </div>
  )

  const currentQuestion = questions[currentIndex]
  const isExhausted = currentIndex >= questions.length

  if (isExhausted) return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
      <h2 className="text-2xl font-black text-slate-800 mb-2">모든 문제를 다 풀었습니다! 🎉</h2>
      <p className="text-slate-600 mb-8">오답 노트를 확인하거나 다른 분야에 도전해 보세요.</p>
      <div className="flex gap-4">
        <button onClick={() => router.push(`/review/${categoryId}`)} className="px-6 py-3 bg-slate-800 text-white rounded-xl font-bold">오답 노트 가기</button>
        <button onClick={() => router.push('/quiz')} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold">대시보드로 가기</button>
      </div>
    </div>
  )

  const handleSelect = (id: string) => {
    if (isSubmitted) return
    setSelectedOption(id)
  }

  const handleSubmit = async () => {
    if (!selectedOption) return
    setIsSubmitted(true)

    // ✅ 정답 판정·XP 적립은 서버가 결정한다.
    const res = await submitAnswer(currentQuestion.id, selectedOption)
    if ('error' in res) {
      alert(res.error)
      setIsSubmitted(false)
      return
    }
    setResult(res)
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
    if (!reportReason.trim()) return alert('신고 사유를 입력해 주세요.')

    setIsSubmittingReport(true)
    const result = await submitReport(currentQuestion.id, reportReason)
    setIsSubmittingReport(false)

    if (result.success) {
      alert('신고가 정상적으로 접수되었습니다. 소중한 의견 감사합니다!')
      setIsReportModalOpen(false)
      setReportReason('')
    } else {
      alert(`오류: ${result.error}`)
    }
  }

  const isCorrect = isSubmitted && result?.isCorrect === true

  return (
    <main className="flex min-h-screen flex-col items-center bg-slate-50 p-4 pt-8 relative">
      <div className="w-full max-w-md">

        <div className="flex justify-between items-center mb-6">
          <button onClick={() => router.push('/quiz')} className="text-sm font-bold text-slate-400 hover:text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
            ← 그만 풀고 나가기
          </button>
          <div className="text-sm font-bold text-slate-500">
            <span className="uppercase text-blue-600 mr-2">{categoryId}</span>
            <span>현재 {currentIndex + 1}문제째 도전 중</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6 relative overflow-hidden">
          <h2 className="text-lg font-bold text-slate-800 leading-relaxed mb-4">
            {currentQuestion.question_text}
          </h2>

          {currentQuestion.code_snippet && (
            <pre className="bg-slate-800 text-slate-50 p-4 rounded-lg overflow-x-auto text-sm font-mono mb-6">
              <code>{currentQuestion.code_snippet}</code>
            </pre>
          )}

          <div className="flex flex-col gap-3">
            {currentQuestion.options.map((option) => {
              const isSelected = selectedOption === option.id
              // ✅ 정답 여부는 제출 후 서버 결과로만 판단
              const isAnswer = result?.answerId === option.id

              let optionClass = "border-slate-200 hover:border-blue-400 text-slate-700 bg-white"
              if (isSubmitted) {
                if (isAnswer) optionClass = "border-green-500 bg-green-50 text-green-800 font-bold"
                else if (isSelected && !isAnswer) optionClass = "border-red-500 bg-red-50 text-red-800"
                else optionClass = "border-slate-100 bg-slate-50 text-slate-400 opacity-50"
              } else if (isSelected) {
                optionClass = "border-blue-500 bg-blue-50 text-blue-800 font-bold ring-1 ring-blue-500"
              }

              return (
                <button key={option.id} onClick={() => handleSelect(option.id)} className={`w-full p-4 rounded-lg border-2 text-left transition-all ${optionClass}`}>
                  {option.text}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex flex-col gap-4 mb-8">
          {isSubmitted && result ? (
            <div className={`p-4 rounded-xl border ${isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`font-bold text-lg ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                  {isCorrect ? '정답입니다! 🎉' : '오답입니다.'}
                </span>
                {/* ✅ 실제 획득 XP를 표시(BUG-3) */}
                {result.xpAwarded > 0 && (
                  <span className="px-2 py-1 bg-green-200 text-green-800 text-xs font-black rounded-lg animate-bounce">+{result.xpAwarded} XP 획득!</span>
                )}
              </div>
              <p className="text-slate-700 text-sm leading-relaxed mb-4">
                <strong className="block mb-1">해설:</strong>
                {result.explanation}
              </p>

              <div className="flex gap-2">
                <button onClick={handleNext} className="flex-1 p-4 font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-sm">
                  다음 문제
                </button>
                {/* ✅ 문제 신고/정정 요청 버튼 추가 */}
                <button
                  onClick={() => setIsReportModalOpen(true)}
                  className="px-4 font-bold text-slate-500 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
                  title="오류 신고"
                >
                  🚨 신고
                </button>
              </div>
            </div>
          ) : (
            <button onClick={handleSubmit} disabled={!selectedOption} className="w-full p-4 font-bold text-white bg-slate-800 rounded-xl hover:bg-slate-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">
              제출하기
            </button>
          )}
        </div>
      </div>

      {/* ✅ 오류 신고 모달 팝업 추가 */}
      {isReportModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold text-slate-800 mb-2">🚨 문제 오류 신고</h3>
            <p className="text-sm text-slate-500 mb-4">문제의 오타나 잘못된 해설 등 오류를 알려주시면 검토 후 반영하겠습니다.</p>

            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="예: 해설에 설명된 개념이 최신 버전과 다릅니다."
              className="w-full p-3 border border-slate-300 rounded-lg text-sm text-slate-800 mb-4"
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
                onClick={() => {
                  setIsReportModalOpen(false)
                  setReportReason('')
                }}
                className="flex-1 py-3 bg-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-300 transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
