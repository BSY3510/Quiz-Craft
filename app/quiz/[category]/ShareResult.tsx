'use client'

import { useState } from 'react'
import QRCode from 'qrcode'
import { Modal } from '@/app/components/Modal'
import { useToast } from '@/app/components/Toast'

// 9-4 결과 공유: QR(앱 링크) + 결과 요약 텍스트 + 링크 + 복사 + (모바일) 네이티브 공유.
export default function ShareResult({
  categoryId,
  correct,
  answered,
  accuracy,
  skipped,
}: {
  categoryId: string
  correct: number
  answered: number
  accuracy: number
  skipped: number
}) {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [link, setLink] = useState('')
  const [qr, setQr] = useState('')
  const [canShare, setCanShare] = useState(false)

  const summary =
    `QuizCraft에서 ${categoryId.toUpperCase()} 퀴즈 ${answered}문제 중 ${correct}개 정답! 정답률 ${accuracy}%` +
    (skipped > 0 ? ` (건너뜀 ${skipped})` : '')

  // 열 때(클릭) 링크·QR 준비 — 이벤트 핸들러에서 처리(effect 동기 setState 회피).
  const handleOpen = async () => {
    const origin = window.location.origin
    setLink(origin)
    setCanShare(typeof navigator.share === 'function')
    setOpen(true)
    try {
      setQr(await QRCode.toDataURL(origin, { width: 220, margin: 1 }))
    } catch {
      setQr('')
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`${summary}\n${link}`)
      toast.success('결과 요약과 링크를 복사했어요.')
    } catch {
      toast.error('복사에 실패했습니다.')
    }
  }

  const handleNativeShare = async () => {
    try {
      await navigator.share({ title: 'QuizCraft 결과', text: summary, url: link })
    } catch {
      /* 사용자가 공유를 취소한 경우 등 — 무시 */
    }
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="w-full p-3 bg-amber-100 text-amber-800 rounded-xl font-bold hover:bg-amber-200 transition-colors dark:bg-amber-900/30 dark:text-amber-300 dark:hover:bg-amber-900/50"
      >
        📣 결과 공유하기
      </button>

      <Modal open={open} onClose={() => setOpen(false)} className="max-w-xs" labelledBy="share-title">
        <div className="space-y-4 text-center">
          <h2 id="share-title" className="text-lg font-black text-slate-800 dark:text-slate-100">결과 공유</h2>

          {/* QR (앱 링크) */}
          <div className="flex justify-center">
            {qr ? (
              // QR은 동적 data URL이라 next/image 대신 일반 img 사용
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr} alt="앱 링크 QR 코드" width={180} height={180} className="rounded-lg border border-slate-200 dark:border-slate-700" />
            ) : (
              <div className="w-[180px] h-[180px] flex items-center justify-center bg-slate-50 dark:bg-slate-900/50 rounded-lg text-sm text-slate-400">QR 생성 중...</div>
            )}
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500">QR을 스캔하면 QuizCraft로 이동해요</p>

          {/* 결과 요약 텍스트 */}
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 text-sm text-slate-700 dark:text-slate-200 font-medium">
            {summary}
          </div>

          {/* 링크 */}
          {link && (
            <p className="text-xs text-blue-600 dark:text-blue-400 break-all">{link}</p>
          )}

          {/* 액션 */}
          <div className="flex gap-2">
            <button onClick={handleCopy} className="flex-1 p-3 bg-blue-600 text-white font-bold rounded-xl text-sm hover:bg-blue-700 transition-colors">
              요약·링크 복사
            </button>
            {canShare && (
              <button onClick={handleNativeShare} className="flex-1 p-3 bg-slate-800 text-white font-bold rounded-xl text-sm hover:bg-slate-900 transition-colors dark:bg-slate-700 dark:hover:bg-slate-600">
                공유
              </button>
            )}
          </div>
          <button onClick={() => setOpen(false)} className="w-full p-2.5 text-slate-500 dark:text-slate-400 text-sm font-bold hover:underline">닫기</button>
        </div>
      </Modal>
    </>
  )
}
