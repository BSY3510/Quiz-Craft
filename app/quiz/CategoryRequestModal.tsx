'use client'

import { useState } from 'react'
import { Modal } from '@/app/components/Modal'
import { useToast } from '@/app/components/Toast'
import { submitCategoryRequest } from './actions'
import { type GroupItem, sortGroups } from './categoryShared'

// 분야 신청 모달. 폼 상태·제출은 컴포넌트가 자체 관리한다.
export default function CategoryRequestModal({
  open,
  groups,
  onClose,
}: {
  open: boolean
  groups: GroupItem[]
  onClose: () => void
}) {
  const toast = useToast()
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [group, setGroup] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    setSaving(true)
    const res = await submitCategoryRequest({ name, description: desc, groupId: group || null, reason })
    setSaving(false)
    if (res.error) { toast.error(res.error); return }
    toast.success('분야 신청이 접수되었습니다. 관리자 검토 후 반영됩니다.')
    setName(''); setDesc(''); setGroup(''); setReason('')
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} className="max-w-md" labelledBy="req-title">
      <div className="space-y-4">
        <div>
          <h2 id="req-title" className="text-lg font-black text-slate-800 dark:text-slate-100">분야 신청</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">원하는 학습 분야를 신청하면 관리자 검토 후 추가됩니다.</p>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">분야명 <span className="text-red-500">*</span></label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="예: Kubernetes" className="w-full p-3 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">분야 설명 <span className="text-red-500">*</span></label>
          <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="무엇을 다루는 분야인지 한 줄로" className="w-full p-3 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        {groups.length > 0 && (
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">상위 카테고리 <span className="font-normal text-slate-400">(선택)</span></label>
            <select value={group} onChange={(e) => setGroup(e.target.value)} className="w-full p-3 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-100">
              <option value="">선택 안 함</option>
              {sortGroups(groups).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">신청 사유·예시 주제 <span className="font-normal text-slate-400">(선택)</span></label>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="예: 컨테이너 오케스트레이션 학습용. 파드/서비스/디플로이먼트 위주." className="w-full p-3 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={submit} disabled={saving || !name.trim() || !desc.trim()} className="flex-1 p-3 bg-blue-600 text-white font-bold rounded-xl text-sm hover:bg-blue-700 disabled:opacity-50">{saving ? '접수 중...' : '신청하기'}</button>
          <button onClick={onClose} className="flex-1 p-3 bg-slate-100 text-slate-700 font-bold rounded-xl text-sm hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600">취소</button>
        </div>
      </div>
    </Modal>
  )
}
