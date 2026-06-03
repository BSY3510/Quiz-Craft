'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function AdminUsersManagementPage() {
  const supabase = createClient()
  const pathname = usePathname()
  const adminPath = pathname.split('/').slice(0, 2).join('/')

  const [users, setUsers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'suspended'>('pending')

  useEffect(() => {
    async function fetchUsers() {
      // 🚨 관리자 권한으로 모든 프로필 가져오기 (이메일 정보 조인을 위해 auth 스키마 직접 접근은 불가하므로 profiles 위주로 가져옴)
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (data) setUsers(data)
      setIsLoading(false)
    }
    fetchUsers()
  }, [supabase])

  const handleUpdateStatus = async (userId: string, newStatus: string) => {
    if (!confirm(`해당 회원의 상태를 '${newStatus}'(으)로 변경하시겠습니까?`)) return

    const { error } = await supabase.from('profiles').update({ status: newStatus }).eq('id', userId)
    if (!error) {
      setUsers(users.map(u => u.id === userId ? { ...u, status: newStatus } : u))
      alert('상태가 변경되었습니다.')
    } else {
      alert('오류가 발생했습니다.')
    }
  }

  const filteredUsers = users.filter(u => u.status === activeTab)

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-800">통합 회원 관리</h1>
            <p className="text-slate-500 mt-1">회원 가입 승인 및 계정 상태를 관리합니다.</p>
          </div>
          <Link href={adminPath} className="text-sm font-bold text-blue-600 hover:underline">← 관리자 메인으로</Link>
        </header>

        {/* 탭 네비게이션 */}
        <div className="flex gap-2 border-b border-slate-200 pb-2">
          <button onClick={() => setActiveTab('pending')} className={`px-4 py-2 font-bold rounded-lg ${activeTab === 'pending' ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-100'}`}>
            승인 대기 ({users.filter(u => u.status === 'pending').length})
          </button>
          <button onClick={() => setActiveTab('approved')} className={`px-4 py-2 font-bold rounded-lg ${activeTab === 'approved' ? 'bg-green-100 text-green-700' : 'text-slate-500 hover:bg-slate-100'}`}>
            정상 회원 ({users.filter(u => u.status === 'approved').length})
          </button>
          <button onClick={() => setActiveTab('suspended')} className={`px-4 py-2 font-bold rounded-lg ${activeTab === 'suspended' ? 'bg-red-100 text-red-700' : 'text-slate-500 hover:bg-slate-100'}`}>
            정지/탈퇴 회원 ({users.filter(u => u.status === 'suspended').length})
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-slate-500">회원 정보를 불러오는 중입니다...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-slate-500">해당 상태의 회원이 없습니다.</div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="p-4 font-bold">회원 ID (UUID)</th>
                  <th className="p-4 font-bold">역할</th>
                  <th className="p-4 font-bold">경험치(XP)</th>
                  <th className="p-4 font-bold">가입일</th>
                  <th className="p-4 font-bold text-right">관리 액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="p-4 text-slate-800 font-mono text-xs">{user.id}</td>
                    <td className="p-4 text-slate-600 uppercase">{user.role}</td>
                    <td className="p-4 text-blue-600 font-bold">{user.xp} XP</td>
                    <td className="p-4 text-slate-500">{new Date(user.created_at).toLocaleDateString()}</td>
                    <td className="p-4 text-right">
                      {activeTab === 'pending' && (
                        <button onClick={() => handleUpdateStatus(user.id, 'approved')} className="px-3 py-1 bg-blue-600 text-white font-bold rounded hover:bg-blue-700">가입 승인</button>
                      )}
                      {activeTab === 'approved' && user.role !== 'admin' && (
                        <button onClick={() => handleUpdateStatus(user.id, 'suspended')} className="px-3 py-1 bg-red-100 text-red-600 font-bold rounded hover:bg-red-200">계정 정지</button>
                      )}
                      {activeTab === 'suspended' && (
                        <button onClick={() => handleUpdateStatus(user.id, 'approved')} className="px-3 py-1 bg-green-100 text-green-700 font-bold rounded hover:bg-green-200">정지 해제</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </main>
  )
}