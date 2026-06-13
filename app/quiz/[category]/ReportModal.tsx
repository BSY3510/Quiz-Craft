'use client'

import { useState } from 'react'
import { Modal } from '@/app/components/Modal'
import { useToast } from '@/app/components/Toast'
import { submitReport } from '@/app/actions/report'

// 문제 오류 신고 모달. 열림 상태는 부모가 보유하고(키보드 가드/다음문제 리셋에 필요),
// 사유 입력·제출 상태는 이 컴포넌트가 자체 관리한다.
export default function ReportModal({
  open,
  questionId,
  onClose,
}: {
  open: boolean
  questionId: string | null
  onClose: () => void
}) {
  const toast = useToast()
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // 모달이 열릴 때마다 사유를 초기화(렌더 중 동기화 — React 권장 패턴)
  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) setReason('')
  }

  const handleSubmit = async () => {
    if (!reason.trim()) { toast.error('신고 사유를 입력해 주세요.'); return }
    if (!questionId) return
    setSubmitting(true)
    const result = await submitReport(questionId, reason)
    setSubmitting(false)
    if (result.success) {
      toast.success('신고가 정상적으로 접수되었습니다. 소중한 의견 감사합니다!')
      onClose()
    } else {
      toast.error(`오류: ${result.error}`)
    }
  }

  return (
    <Modal open={open} onClose={onClose} className="max-w-md" labelledBy="report-title">
      <h3 id="report-title" className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">🚨 문제 오류 신고</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">문제의 오타나 잘못된 해설 등 오류를 알려주시면 검토 후 반영하겠습니다.</p>

      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="예: 해설에 설명된 개념이 최신 버전과 다릅니다."
        className="w-full p-3 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 rounded-lg text-sm text-slate-800 mb-4"
        rows={4}
      />

      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={submitting || !reason.trim()}
          className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 disabled:opacity-50 transition-colors"
        >
          {submitting ? '접수 중...' : '신고하기'}
        </button>
        <button
          onClick={onClose}
          className="flex-1 py-3 bg-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-300 transition-colors dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
        >
          취소
        </button>
      </div>
    </Modal>
  )
}
