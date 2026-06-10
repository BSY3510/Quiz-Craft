'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/app/components/Modal'
import { updateQuestion } from './actions'
import { useToast } from '@/app/components/Toast'

export interface EditableQuestion {
  id: string
  question_text: string
  options: { id: string; text: string }[]
  answer_id: string
  explanation: string
}

export interface EditedFields {
  question_text: string
  options: { id: string; text: string }[]
  answer_id: string
  explanation: string
}

// 문제 수정 공용 모달 (문제 관리 · 신고 처리 공통). updateQuestion 으로 저장하고
// 성공 시 onSaved(id, fields)로 부모 목록을 갱신하게 한다.
export default function QuestionEditModal({
  question,
  onClose,
  onSaved,
}: {
  question: EditableQuestion | null
  onClose: () => void
  onSaved: (id: string, fields: EditedFields) => void
}) {
  const toast = useToast()
  const [form, setForm] = useState<EditableQuestion | null>(question)
  const [saving, setSaving] = useState(false)

  useEffect(() => setForm(question), [question])

  const save = async () => {
    if (!form) return
    setSaving(true)
    const fields: EditedFields = {
      question_text: form.question_text,
      options: form.options,
      answer_id: form.answer_id,
      explanation: form.explanation,
    }
    const res = await updateQuestion(form.id, fields)
    setSaving(false)
    if (res.error) { toast.error(res.error); return }
    onSaved(form.id, fields)
    toast.success('문제가 수정되었습니다!')
    onClose()
  }

  return (
    <Modal open={!!question} onClose={onClose} className="max-w-2xl" labelledBy="q-edit-title">
      {form && (
        <div className="space-y-5">
          <h2 id="q-edit-title" className="text-xl font-black text-slate-800 dark:text-slate-100">문제 수정</h2>

          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">질문 내용</label>
            <textarea
              value={form.question_text}
              onChange={(e) => setForm({ ...form, question_text: e.target.value })}
              className="w-full p-3 border border-slate-300 rounded-lg text-slate-800 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {form.options.map((opt, idx) => (
              <div key={opt.id}>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">보기 {opt.id}</label>
                <input
                  value={opt.text}
                  onChange={(e) => {
                    const newOptions = form.options.map((o, i) => (i === idx ? { ...o, text: e.target.value } : o))
                    setForm({ ...form, options: newOptions })
                  }}
                  className="w-full p-3 border border-slate-300 rounded-lg text-slate-800 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                />
              </div>
            ))}
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">정답</label>
            <select
              value={form.answer_id}
              onChange={(e) => setForm({ ...form, answer_id: e.target.value })}
              className="w-full p-3 border border-slate-300 rounded-lg text-slate-800 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            >
              {form.options.map((opt) => <option key={opt.id} value={opt.id}>{opt.id}번 보기</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">해설</label>
            <textarea
              value={form.explanation}
              onChange={(e) => setForm({ ...form, explanation: e.target.value })}
              className="w-full p-3 border border-slate-300 rounded-lg text-slate-800 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
            <button onClick={save} disabled={saving} className="flex-1 p-4 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 disabled:opacity-60">
              {saving ? '저장 중...' : '저장하기'}
            </button>
            <button onClick={onClose} className="flex-1 p-4 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600">취소</button>
          </div>
        </div>
      )}
    </Modal>
  )
}
