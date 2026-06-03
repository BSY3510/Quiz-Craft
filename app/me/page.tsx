import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import DeactivateButton from './DeactivateButton'

export default async function MyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // 1. 사용자 프로필 정보 조회
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, status, created_at')
    .eq('id', user.id)
    .single()

  // 2. 사용자가 제출한 신고 내역 조회
  const { data: reports } = await supabase
    .from('reports')
    .select(`
      id, 
      reason, 
      status, 
      created_at,
      questions ( question_text )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // 상태 배지 색상 매핑 헬퍼 함수
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'resolved': return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded">해결됨</span>
      case 'dismissed': return <span className="px-2 py-1 bg-slate-200 text-slate-700 text-xs font-bold rounded">반려됨</span>
      default: return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded">처리 대기</span>
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center bg-slate-50 p-4 pt-8">
      <div className="w-full max-w-md space-y-6">
        
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-800">마이페이지</h1>
          <Link href="/quiz" className="text-sm text-blue-600 font-medium hover:underline">
            퀴즈로 돌아가기
          </Link>
        </header>

        {/* 계정 정보 섹션 */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-sm font-bold text-slate-500 mb-4">내 계정 정보</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <span className="text-slate-600">이메일</span>
              <span className="font-bold text-slate-800">{user.email}</span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <span className="text-slate-600">가입일</span>
              <span className="text-slate-800">{new Date(profile?.created_at || '').toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between items-center pb-1">
              <span className="text-slate-600">권한</span>
              <span className="text-slate-800 uppercase font-mono bg-slate-100 px-2 py-0.5 rounded text-sm">
                {profile?.role}
              </span>
            </div>
          </div>
          <form action="/auth/signout" method="post" className="mt-6">
            <button type="submit" className="w-full p-3 bg-slate-100 text-slate-600 font-bold rounded-lg hover:bg-slate-200 transition-colors">
              로그아웃
            </button>
          </form>
        </section>

        {/* 신고 내역 섹션 */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-sm font-bold text-slate-500 mb-4">내 신고 및 정정 요청 내역</h2>
          <div className="space-y-4">
            {reports?.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">제출하신 신고 내역이 없습니다.</p>
            ) : (
              reports?.map((report: any) => (
                <div key={report.id} className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="flex justify-between items-start mb-2">
                    {getStatusBadge(report.status)}
                    <span className="text-xs text-slate-400">
                      {new Date(report.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-slate-800 truncate mb-1">
                    Q. {report.questions?.question_text}
                  </p>
                  <p className="text-sm text-slate-600">
                    <span className="font-bold mr-1">사유:</span>{report.reason}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>

        {/* ✅ 위험 구역: 회원 탈퇴 기능 */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-red-200 mt-6">
          <h2 className="text-sm font-bold text-red-500 mb-4">위험 구역</h2>
          {/* ✅ 클라이언트 컴포넌트로 분리된 탈퇴 버튼 렌더링 */}
          <DeactivateButton />
        </section>

      </div>
    </main>
  )
}