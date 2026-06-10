'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { useAdminPath } from '../useAdminPath'
import { useToast } from '@/app/components/Toast'
import { useConfirm } from '@/app/components/Confirm'
import type { Profile } from '@/types/db'

export default function AdminUsersManagementPage() {
  const supabase = createClient()
  const adminPath = useAdminPath()
  const toast = useToast()
  const confirm = useConfirm()

  const [users, setUsers] = useState<Profile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'suspended'>('pending')

  useEffect(() => {
    async function fetchUsers() {
      // 데이터베이스 RLS 허용 후 모든 프로필 정보 가져오기
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
      
      // Supabase 미생성 타입 환경: enum 컬럼이 string으로 추론되므로 경계에서 캐스트
      if (data) setUsers(data as Profile[])
      setIsLoading(false)
    }
    fetchUsers()
  }, [supabase])

  const handleUpdateStatus = async (userId: string, newStatus: string) => {
    const ok = await confirm({
      title: '회원 상태 변경',
      message: `해당 회원의 상태를 '${newStatus === 'approved' ? '승인' : '정지'}'(으)로 변경할까요?`,
      confirmText: '변경',
      danger: newStatus !== 'approved',
    })
    if (!ok) return

    // ✅ 관리자 상태 변경은 정의자 함수 경유(직접 profiles update 금지, SEC-C/D)
    const { error } = await supabase
      .rpc('admin_set_user_status', { p_target: userId, p_status: newStatus })

    if (!error) {
      setUsers(users.map(u => u.id === userId ? { ...u, status: newStatus as Profile['status'] } : u))
      toast.success('회원 상태가 반영되었습니다.')
    } else {
      console.error(error)
      toast.error('상태 변경 실패: 관리자 권한 및 정책을 확인하세요.')
    }
  }

  const filteredUsers = users.filter(u => u.status === activeTab)

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100">👥 통합 회원 관리</h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">회원 가입 승인 및 계정 상태를 관리합니다.</p>
          </div>
          <Link href={adminPath} className="text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline">
            ← 관리자 메인으로
          </Link>
        </header>

        {/* 탭 네비게이션 (모바일 가로 스크롤 대응) */}
        <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700 pb-2 overflow-x-auto whitespace-nowrap scrollbar-none">
          <button onClick={() => setActiveTab('pending')} className={`px-3 py-2 text-xs sm:text-sm font-bold rounded-lg transition-colors ${activeTab === 'pending' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
            승인 대기 ({users.filter(u => u.status === 'pending').length})
          </button>
          <button onClick={() => setActiveTab('approved')} className={`px-3 py-2 text-xs sm:text-sm font-bold rounded-lg transition-colors ${activeTab === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
            정상 회원 ({users.filter(u => u.status === 'approved').length})
          </button>
          <button onClick={() => setActiveTab('suspended')} className={`px-3 py-2 text-xs sm:text-sm font-bold rounded-lg transition-colors ${activeTab === 'suspended' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
            정지/탈퇴 회원 ({users.filter(u => u.status === 'suspended').length})
          </button>
        </div>

        {/* 모바일 화면 대응터짐 방지 가로 스크롤 컨테이너 패킹 */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm font-bold">회원 정보를 불러오는 중입니다...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm">해당 상태의 회원이 없습니다.</div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-xs sm:text-sm text-left table-auto min-w-[500px] sm:min-w-full">
                <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                  <tr>
                    {/* 모바일 최적화: 너무 긴 UUID 식별자는 큰 화면(md)에서만 노출시킴 */}
                    <th className="p-3 sm:p-4 font-bold hidden md:table-cell">회원 ID (UUID)</th>
                    <th className="p-3 sm:p-4 font-bold">가입 이메일</th>
                    <th className="p-3 sm:p-4 font-bold">닉네임</th>
                    <th className="p-3 sm:p-4 font-bold">학습 점수</th>
                    <th className="p-3 sm:p-4 font-bold text-right">관리 액션</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {filteredUsers.map(user => (
                    <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                      <td className="p-3 sm:p-4 text-slate-400 dark:text-slate-500 font-mono text-xs hidden md:table-cell">{user.id}</td>
                      {/* 이메일 노출 및 줄바꿈 차단 */}
                      <td className="p-3 sm:p-4 text-slate-800 dark:text-slate-100 font-bold whitespace-nowrap">{user.email || '이메일 정보 없음'}</td>
                      <td className="p-3 sm:p-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">{user.nickname || <span className="text-slate-300 dark:text-slate-500 italic text-xs">미설정</span>}</td>
                      <td className="p-3 sm:p-4 text-blue-600 dark:text-blue-400 font-black whitespace-nowrap">{user.xp?.toLocaleString()} XP</td>
                      <td className="p-3 sm:p-4 text-right whitespace-nowrap">
                        {activeTab === 'pending' && (
                          <button onClick={() => handleUpdateStatus(user.id, 'approved')} className="px-2.5 py-1.5 bg-blue-600 text-white font-bold text-xs rounded-lg hover:bg-blue-700 shadow-sm transition-colors">
                            가입 승인
                          </button>
                        )}
                        {activeTab === 'approved' && user.role !== 'admin' && (
                          <button onClick={() => handleUpdateStatus(user.id, 'suspended')} className="px-2.5 py-1.5 bg-red-50 text-red-600 font-bold text-xs rounded-lg hover:bg-red-100 border border-red-200 transition-colors dark:bg-red-900/30 dark:text-red-400 dark:border-red-900/50 dark:hover:bg-red-900/50">
                            계정 정지
                          </button>
                        )}
                        {activeTab === 'suspended' && (
                          <button onClick={() => handleUpdateStatus(user.id, 'approved')} className="px-2.5 py-1.5 bg-green-50 text-green-700 font-bold text-xs rounded-lg hover:bg-green-100 border border-green-200 transition-colors dark:bg-green-900/30 dark:text-green-400 dark:border-green-900/50 dark:hover:bg-green-900/50">
                            정지 해제
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}