'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { useAdminPath } from '../useAdminPath'
import { useToast } from '@/app/components/Toast'
import { Modal } from '@/app/components/Modal'
import { approveCategoryRequest, rejectCategoryRequest } from './actions'
import type { CategoryRequest, CategoryGroup } from '@/types/db'

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  approved: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  rejected: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300',
}
const STATUS_LABEL: Record<string, string> = { pending: '검토 대기', approved: '승인됨', rejected: '반려됨' }

export default function AdminCategoryRequestsPage() {
  const supabase = createClient()
  const adminPath = useAdminPath()
  const toast = useToast()

  const [requests, setRequests] = useState<CategoryRequest[]>([])
  const [groups, setGroups] = useState<CategoryGroup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'pending' | 'processed' | 'all'>('pending')

  // 승인 모달
  const [approving, setApproving] = useState<CategoryRequest | null>(null)
  const [apId, setApId] = useState('')
  const [apName, setApName] = useState('')
  const [apDesc, setApDesc] = useState('')
  const [apGroup, setApGroup] = useState('')
  const [apPrompt, setApPrompt] = useState('')
  const [apSaving, setApSaving] = useState(false)

  // 반려 모달
  const [rejecting, setRejecting] = useState<CategoryRequest | null>(null)
  const [rjNote, setRjNote] = useState('')
  const [rjSaving, setRjSaving] = useState(false)

  const fetchData = async () => {
    setIsLoading(true)
    const [{ data: reqs }, { data: grps }] = await Promise.all([
      supabase.from('category_requests').select('*').order('created_at', { ascending: false }),
      supabase.from('category_groups').select('*').order('sort_order'),
    ])
    setRequests((reqs as CategoryRequest[]) ?? [])
    setGroups((grps as CategoryGroup[]) ?? [])
    setIsLoading(false)
  }

  useEffect(() => {
    let active = true
    Promise.all([
      supabase.from('category_requests').select('*').order('created_at', { ascending: false }),
      supabase.from('category_groups').select('*').order('sort_order'),
    ]).then(([{ data: reqs }, { data: grps }]) => {
      if (!active) return
      setRequests((reqs as CategoryRequest[]) ?? [])
      setGroups((grps as CategoryGroup[]) ?? [])
      setIsLoading(false)
    })
    return () => { active = false }
  }, [supabase])

  const openApprove = (r: CategoryRequest) => {
    setApproving(r)
    setApId(slugify(r.name))
    setApName(r.name)
    setApDesc(r.description ?? '')
    setApGroup(r.group_id ?? '')
    setApPrompt('')
  }

  const doApprove = async () => {
    if (!approving) return
    setApSaving(true)
    const res = await approveCategoryRequest(approving.id, {
      id: apId, name: apName, description: apDesc, groupId: apGroup || null, prompt: apPrompt,
    })
    setApSaving(false)
    if (res.error) { toast.error(res.error); return }
    toast.success('승인되어 분야가 생성되었습니다.')
    setApproving(null)
    fetchData()
  }

  const doReject = async () => {
    if (!rejecting) return
    setRjSaving(true)
    const res = await rejectCategoryRequest(rejecting.id, rjNote)
    setRjSaving(false)
    if (res.error) { toast.error(res.error); return }
    toast.success('신청을 반려했습니다.')
    setRejecting(null)
    setRjNote('')
    fetchData()
  }

  const groupName = (id: string | null) => (id ? groups.find((g) => g.id === id)?.name ?? '—' : '—')

  const filtered = requests.filter((r) =>
    filter === 'all' ? true : filter === 'pending' ? r.status === 'pending' : r.status !== 'pending'
  )
  const pendingCount = requests.filter((r) => r.status === 'pending').length

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100">🗂️ 분야 신청 관리</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">사용자가 신청한 분야를 검토해 승인(분야 생성)하거나 반려합니다.</p>
          </div>
          <Link href={adminPath} className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline">← 관리자 메인</Link>
        </header>

        <div className="flex gap-1.5">
          {([['pending', `검토 대기 (${pendingCount})`], ['processed', '처리됨'], ['all', '전체']] as const).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                filter === k ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {isLoading ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400">불러오는 중...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">해당하는 신청이 없습니다.</div>
          ) : (
            filtered.map((r) => (
              <div key={r.id} className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="font-bold text-slate-800 dark:text-slate-100">{r.name}</h2>
                      <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${STATUS_BADGE[r.status] ?? STATUS_BADGE.rejected}`}>{STATUS_LABEL[r.status] ?? r.status}</span>
                    </div>
                    {r.description && <p className="text-sm text-slate-600 dark:text-slate-300">{r.description}</p>}
                    <div className="text-xs text-slate-400 dark:text-slate-500 mt-1 space-x-2">
                      <span>그룹: {groupName(r.group_id)}</span>
                      <span>·</span>
                      <span>{new Date(r.created_at).toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                    </div>
                    {r.reason && <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg p-2">사유: {r.reason}</p>}
                    {r.status === 'rejected' && r.admin_note && <p className="text-xs text-red-500 dark:text-red-400 mt-1">반려 사유: {r.admin_note}</p>}
                  </div>
                  {r.status === 'pending' && (
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <button onClick={() => openApprove(r)} className="px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700">승인</button>
                      <button onClick={() => { setRejecting(r); setRjNote('') }} className="px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600">반려</button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 승인 모달 */}
      <Modal open={!!approving} onClose={() => setApproving(null)} className="max-w-md" labelledBy="ap-title">
        {approving && (
          <div className="space-y-4">
            <h2 id="ap-title" className="text-lg font-black text-slate-800 dark:text-slate-100">분야 승인 · 생성</h2>
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">식별 ID <span className="text-red-500">*</span> <span className="font-normal text-slate-400">(영문 소문자·숫자·-)</span></label>
              <input value={apId} onChange={(e) => setApId(e.target.value)} placeholder="예: kubernetes" className="w-full p-3 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 rounded-lg text-sm font-mono text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">표시 이름 <span className="text-red-500">*</span></label>
              <input value={apName} onChange={(e) => setApName(e.target.value)} className="w-full p-3 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">부제(설명)</label>
              <input value={apDesc} onChange={(e) => setApDesc(e.target.value)} className="w-full p-3 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">상위 그룹</label>
              <select value={apGroup} onChange={(e) => setApGroup(e.target.value)} className="w-full p-3 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-100">
                <option value="">미분류</option>
                {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">출제 가이드 <span className="font-normal text-slate-400">(선택)</span></label>
              <textarea value={apPrompt} onChange={(e) => setApPrompt(e.target.value)} rows={3} placeholder="이 분야에 특화된 출제 지시(나중에 분야 관리에서 수정 가능)" className="w-full p-3 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={doApprove} disabled={apSaving || !apId.trim() || !apName.trim()} className="flex-1 p-3 bg-green-600 text-white font-bold rounded-xl text-sm hover:bg-green-700 disabled:opacity-50">{apSaving ? '처리 중...' : '승인 · 분야 생성'}</button>
              <button onClick={() => setApproving(null)} className="flex-1 p-3 bg-slate-100 text-slate-700 font-bold rounded-xl text-sm hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600">취소</button>
            </div>
          </div>
        )}
      </Modal>

      {/* 반려 모달 */}
      <Modal open={!!rejecting} onClose={() => setRejecting(null)} className="max-w-sm" labelledBy="rj-title">
        {rejecting && (
          <div className="space-y-4">
            <h2 id="rj-title" className="text-lg font-black text-slate-800 dark:text-slate-100">신청 반려</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">「{rejecting.name}」 신청을 반려합니다. 사유를 남기면 신청자에게 회신할 수 있습니다.</p>
            <textarea value={rjNote} onChange={(e) => setRjNote(e.target.value)} rows={3} placeholder="반려 사유 (선택)" className="w-full p-3 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500" />
            <div className="flex gap-2">
              <button onClick={doReject} disabled={rjSaving} className="flex-1 p-3 bg-red-600 text-white font-bold rounded-xl text-sm hover:bg-red-700 disabled:opacity-50">{rjSaving ? '처리 중...' : '반려'}</button>
              <button onClick={() => setRejecting(null)} className="flex-1 p-3 bg-slate-100 text-slate-700 font-bold rounded-xl text-sm hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600">취소</button>
            </div>
          </div>
        )}
      </Modal>
    </main>
  )
}
