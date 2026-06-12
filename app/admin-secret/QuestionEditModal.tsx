'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/app/components/Modal'
import { createClient } from '@/utils/supabase/client'
import { updateQuestion } from './actions'
import { useToast } from '@/app/components/Toast'

// 타임스탬프(timestamptz)를 한국어 날짜·시각으로 표시
function formatDateTime(value: string | null): string {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' })
}

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
  // 등록일/수정일은 모달이 열릴 때 해당 문제만 직접 조회(목록 RPC를 건드리지 않기 위함)
  const [meta, setMeta] = useState<{ created_at: string; updated_at: string } | null>(null)

  // prop 으로 받은 question 이 바뀌면 폼을 그 값으로 초기화(렌더 중 동기화 — React 권장 패턴)
  const [prevQuestion, setPrevQuestion] = useState(question)
  if (question !== prevQuestion) {
    setPrevQuestion(question)
    setForm(question)
  }

  useEffect(() => {
    const id = question?.id
    if (!id) return
    let active = true
    const supabase = createClient()
    supabase
      .from('questions')
      .select('created_at, updated_at')
      .eq('id', id)
      .single()
      .then(({ data }) => { if (active && data) setMeta(data) })
    // cleanup 에서 초기화 → 다른 문제로 전환/닫힘 시 이전 문제의 날짜가 잠깐 보이지 않게
    return () => { active = false; setMeta(null) }
  }, [question?.id])

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
    // 트리거가 서버에서 updated_at 을 갱신하므로, 화면에는 즉시 현재 시각으로 반영
    setMeta((m) => (m ? { ...m, updated_at: new Date().toISOString() } : m))
    onSaved(form.id, fields)
    toast.success('문제가 수정되었습니다!')
    onClose()
  }

  return (
    <Modal open={!!question} onClose={onClose} className="max-w-2xl" labelledBy="q-edit-title">
      {form && (
        <div className="space-y-5">
          <div>
            <h2 id="q-edit-title" className="text-xl font-black text-slate-800 dark:text-slate-100">문제 수정</h2>
            {meta && (
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                등록 {formatDateTime(meta.created_at)} · 수정 {formatDateTime(meta.updated_at)}
              </p>
            )}
          </div>

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
