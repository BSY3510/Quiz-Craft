'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import DeactivateButton from './DeactivateButton'

export default function MyPage() {
  const supabase = createClient()
  const router = useRouter()

  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [reports, setReports] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [nickname, setNickname] = useState('')
  const [password, setPassword] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    async function fetchMyData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')
      setUser(user)

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (prof) {
        setProfile(prof)
        setNickname(prof.nickname || '')
      }

      const { data: reps } = await supabase
        .from('reports')
        .select(`id, reason, status, created_at, questions ( question_text )`)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      
      if (reps) setReports(reps)
      setIsLoading(false)
    }
    fetchMyData()
  }, [router, supabase])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsUpdating(true)
    let isChanged = false

    if (nickname && nickname !== profile?.nickname) {
      const { error } = await supabase.from('profiles').update({ nickname }).eq('id', user.id)
      if (!error) isChanged = true
    }

    if (password) {
      const { error } = await supabase.auth.updateUser({ password })
      if (!error) isChanged = true
    }

    if (isChanged) {
      alert('개인정보가 성공적으로 변경되었습니다!')
      setPassword('') 
      setProfile({ ...profile, nickname }) // 화면 즉시 업데이트
      
      // ✅ 가장 중요: Next.js 라우터 캐시를 강제로 새로고침하여 /quiz 이동 시 변경사항이 반영되게 함
      router.refresh()
    } else {
      alert('변경할 내용이 없거나 오류가 발생했습니다.')
    }
    
    setIsUpdating(false)
  }

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 font-bold text-slate-500">불러오는 중...</div>

  const recentReports = reports.slice(0, 3)

  return (
    <main className="flex min-h-screen flex-col items-center bg-slate-50 p-4 pt-8">
      <div className="w-full max-w-md space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-800">마이페이지</h1>
          <Link href="/quiz" className="text-sm text-blue-600 font-medium hover:underline">퀴즈로 돌아가기</Link>
        </header>

        <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-sm font-bold text-slate-500 mb-4">개인정보 설정</h2>
          
          {/* ✅ 가입 이메일 및 현재 닉네임 표시 영역 개선 */}
          <div className="mb-4 pb-4 border-b border-slate-100 flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-600 text-sm">가입 이메일</span>
              <span className="font-bold text-slate-800 text-sm">{user?.email}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600 text-sm">현재 닉네임</span>
              <span className="font-bold text-blue-600 text-sm bg-blue-50 px-2 py-1 rounded">
                {profile?.nickname || '미설정 (이메일 사용)'}
              </span>
            </div>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">새 닉네임 입력</label>
              <input 
                type="text" 
                value={nickname} 
                onChange={(e) => setNickname(e.target.value)} 
                placeholder="변경할 닉네임을 입력하세요"
                className="w-full p-3 border border-slate-300 rounded-lg text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">새 비밀번호 (변경시에만 입력)</label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="변경할 비밀번호를 입력하세요"
                className="w-full p-3 border border-slate-300 rounded-lg text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button 
              type="submit" 
              disabled={isUpdating || (!password && nickname === profile?.nickname)}
              className="w-full p-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:bg-slate-300 transition-colors"
            >
              {isUpdating ? '저장 중...' : '정보 저장하기'}
            </button>
          </form>

          <form action="/auth/signout" method="post" className="mt-4 pt-4 border-t border-slate-100">
            <button type="submit" className="w-full p-3 bg-slate-100 text-slate-600 font-bold rounded-lg hover:bg-slate-200 transition-colors">로그아웃</button>
          </form>
        </section>

        <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-end mb-4">
            <h2 className="text-sm font-bold text-slate-500">내 신고 및 정정 요청 내역</h2>
            <span className="text-xs text-slate-400 font-bold">총 {reports.length}건</span>
          </div>
          
          <div className="space-y-4">
            {recentReports.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">제출하신 신고 내역이 없습니다.</p>
            ) : (
              recentReports.map((report: any) => (
                <div key={report.id} className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="flex justify-between items-start mb-2">
                    <span className={`px-2 py-1 text-xs font-bold rounded ${report.status === 'resolved' ? 'bg-green-100 text-green-700' : report.status === 'dismissed' ? 'bg-slate-200 text-slate-700' : 'bg-yellow-100 text-yellow-800'}`}>
                      {report.status}
                    </span>
                    <span className="text-xs text-slate-400">{new Date(report.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm font-medium text-slate-800 truncate mb-1">Q. {report.questions?.question_text}</p>
                  <p className="text-sm text-slate-600 truncate"><span className="font-bold mr-1">사유:</span>{report.reason}</p>
                </div>
              ))
            )}
          </div>

          {reports.length > 3 && (
            <button className="w-full mt-4 p-3 border border-slate-200 text-slate-600 font-bold rounded-lg hover:bg-slate-50 transition-colors" onClick={() => alert('더보기 기능은 추후 구현 예정입니다.')}>
              더보기
            </button>
          )}
        </section>

        <section className="bg-white p-6 rounded-xl shadow-sm border border-red-200 mt-6">
          <h2 className="text-sm font-bold text-red-500 mb-4">위험 구역</h2>
          <DeactivateButton />
        </section>
      </div>
    </main>
  )
}