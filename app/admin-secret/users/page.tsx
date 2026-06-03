import { createClient } from '@/utils/supabase/server'
import { updateUserStatus } from './actions'
import Link from 'next/link'

export default async function AdminUsersPage() {
  const supabase = await createClient()
  
  // 대기 중인 회원 목록 조회
  const { data: users } = await supabase
    .from('profiles')
    .select('id, email, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

    const adminPath = `/admin-${process.env.ADMIN_PATH_SUFFIX}`

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-800">회원 가입 승인</h1>
            <p className="text-slate-500 mt-1">대기 중인 신규 가입자의 서비스 이용을 승인합니다.</p>
          </div>
          <Link href={adminPath} className="text-sm font-bold text-blue-600 hover:underline">
          ← 관리자 메인으로
          </Link>
        </header>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="p-4 font-bold">이메일</th>
                <th className="p-4 font-bold">가입일</th>
                <th className="p-4 font-bold text-right">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users?.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-slate-500">
                    승인 대기 중인 회원이 없습니다.
                  </td>
                </tr>
              ) : (
                users?.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 text-slate-800">{u.email}</td>
                    <td className="p-4 text-slate-500">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      <form className="inline-flex gap-2">
                        <button 
                          formAction={async () => {
                            'use server'
                            await updateUserStatus(u.id, 'approved')
                          }}
                          className="px-4 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors"
                        >
                          승인
                        </button>
                        <button 
                          formAction={async () => {
                            'use server'
                            await updateUserStatus(u.id, 'rejected')
                          }}
                          className="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-300 transition-colors"
                        >
                          거절
                        </button>
                      </form>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}