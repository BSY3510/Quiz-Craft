'use client'

import { useEffect, useState } from 'react'
import { Modal } from '@/app/components/Modal'

// 첫 방문 시 1회 자동 노출. 본 적 있으면 localStorage 로 건너뛴다(DB 변경 없음).
const STORAGE_KEY = 'qc_onboarded_v1'

const STEPS = [
  {
    icon: '👋',
    title: 'QuizCraft에 오신 걸 환영해요',
    body: 'AI가 만든 개발 퀴즈로 매일 조금씩 실력을 쌓는 학습 서비스예요. 1분만에 사용법을 알려드릴게요.',
  },
  {
    icon: '🎯',
    title: '분야를 골라 풀어보세요',
    body: '원하는 분야를 선택하면 10문항 세션이 시작돼요. 정답을 맞히면 XP가 쌓이고, 매일 풀면 연속 학습(스트릭)이 이어집니다.',
  },
  {
    icon: '🔁',
    title: '틀린 문제는 복습으로',
    body: '오답은 SRS 오답노트에서 간격을 두고 다시 풀며 완전히 익혀요. 다시 보고 싶은 문제는 🔖 북마크, 좋은 문제엔 👍 도움됐어요를 눌러보세요.',
  },
  {
    icon: '🏆',
    title: '기록하고 경쟁해요',
    body: '주간 리더보드에서 순위를 겨루고, 배지를 모으며 동기를 얻으세요. 자, 이제 시작해볼까요?',
  },
]

export default function OnboardingTour() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setOpen(true)
    } catch {
      // localStorage 접근 불가 시 조용히 무시
    }
  }, [])

  const finish = () => {
    try { localStorage.setItem(STORAGE_KEY, '1') } catch {}
    setOpen(false)
    setStep(0)
  }

  const openTour = () => { setStep(0); setOpen(true) }

  const s = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    <>
      <div className="flex justify-end">
        <button
          onClick={openTour}
          className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
        >
          ❓ 사용법 보기
        </button>
      </div>

      <Modal open={open} onClose={finish} className="max-w-sm" labelledBy="onb-title">
        <div className="text-center">
          <div className="text-5xl mb-3">{s.icon}</div>
          <h2 id="onb-title" className="text-xl font-black text-slate-800 dark:text-slate-100 mb-2">{s.title}</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed min-h-[4.5rem]">{s.body}</p>

          {/* 진행 점 */}
          <div className="flex justify-center gap-1.5 my-5">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${i === step ? 'w-5 bg-blue-600 dark:bg-blue-400' : 'w-1.5 bg-slate-200 dark:bg-slate-600'}`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {step > 0 ? (
              <button
                onClick={() => setStep((v) => v - 1)}
                className="px-4 py-3 rounded-xl font-bold text-sm bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
              >
                이전
              </button>
            ) : (
              <button
                onClick={finish}
                className="px-4 py-3 rounded-xl font-bold text-sm text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
              >
                건너뛰기
              </button>
            )}
            <button
              onClick={() => (isLast ? finish() : setStep((v) => v + 1))}
              className="flex-1 px-4 py-3 rounded-xl font-bold text-sm text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              {isLast ? '시작하기 🚀' : '다음'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
