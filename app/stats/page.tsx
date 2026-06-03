import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

// 데이터베이스 조인 결과를 위한 타입 정의
interface AttemptData {
  is_correct: boolean;
  questions: {
    category_id: string;
  } | null;
}

export default async function StatsPage() {
  const supabase = await createClient() // Next.js 15+ 규격에 맞춰 await 사용
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 1. 활성화된 전체 카테고리 정보 가져오기
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name')
    .eq('active', true)

  // 2. 현재 사용자의 모든 풀이 기록(Attempt)과 연관된 문제의 카테고리 정보 가져오기
  const { data: attemptsData, error } = await supabase
    .from('attempts')
    .select(`
      is_correct,
      questions ( category_id )
    `)
    .eq('user_id', user.id)

  const attempts = (attemptsData as unknown as AttemptData[]) || []

  // 3. 통계 데이터 집계 로직
  const totalSolved = attempts.length
  const totalCorrect = attempts.filter(a => a.is_correct).length
  const overAllAccuracy = totalSolved === 0 ? 0 : Math.round((totalCorrect / totalSolved) * 100)

  // 분야별 통계 계산
  const categoryStats = categories?.map(category => {
    // 해당 카테고리에 속하는 풀이 기록만 필터링
    const catAttempts = attempts.filter(a => a.questions?.category_id === category.id)
    const catTotal = catAttempts.length
    const catCorrect = catAttempts.filter(a => a.is_correct).length
    const catAccuracy = catTotal === 0 ? 0 : Math.round((catCorrect / catTotal) * 100)
    
    // 정답률이 50% 미만이고 3문제 이상 풀었을 때 약점으로 진단
    const isWeakness = catTotal >= 3 && catAccuracy < 50

    return {
      id: category.id,
      name: category.name,
      totalAttempts: catTotal,
      correct: catCorrect,
      accuracy: catAccuracy,
      isWeakness
    }
  }) || []

  // 한 번이라도 시도한 분야 중 약점 분야 필터링
  const weakCategories = categoryStats.filter(stat => stat.isWeakness)

  return (
    <main className="flex min-h-screen flex-col items-center bg-slate-50 p-4 pt-8">
      <div className="w-full max-w-md">
        
        <header className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-800">내 학습 통계</h1>
          <Link href="/quiz" className="text-sm text-blue-600 font-medium hover:underline">
            퀴즈로 돌아가기
          </Link>
        </header>

        {/* 종합 요약 카드 */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
          <h2 className="text-sm font-bold text-slate-500 mb-4">종합 요약</h2>
          <div className="flex gap-4 divide-x divide-slate-100">
            <div className="flex-1 text-center">
              <p className="text-3xl font-black text-slate-800">{totalSolved}</p>
              <p className="text-xs text-slate-500 mt-1">총 푼 문제</p>
            </div>
            <div className="flex-1 text-center">
              <p className="text-3xl font-black text-blue-600">{overAllAccuracy}%</p>
              <p className="text-xs text-slate-500 mt-1">전체 정답률</p>
            </div>
          </div>
        </section>

        {/* 약점 진단 경고창 */}
        {weakCategories.length > 0 && (
          <section className="bg-red-50 p-4 rounded-xl border border-red-100 mb-6 flex items-start gap-3">
            <div className="text-red-500 mt-0.5">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-red-800">집중 보완이 필요해요!</h3>
              <p className="text-sm text-red-600 mt-1">
                <span className="font-bold">{weakCategories.map(c => c.name).join(', ')}</span> 분야의 정답률이 낮습니다.
              </p>
            </div>
          </section>
        )}

        {/* 분야별 상세 통계 리스트 */}
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-bold text-slate-500">분야별 상세</h2>
          {categoryStats.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">아직 분야가 등록되지 않았습니다.</p>
          ) : (
            categoryStats.map((stat) => (
              <div key={stat.id} className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-800">{stat.name}</span>
                  <span className="text-lg font-black text-slate-700">{stat.accuracy}%</span>
                </div>
                
                {/* 분야별 정답률 프로그레스 바 */}
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${stat.isWeakness ? 'bg-red-400' : 'bg-blue-500'}`}
                    style={{ width: `${stat.accuracy}%` }}
                  />
                </div>
                
                <div className="flex justify-between text-xs text-slate-500">
                  <span>정답: {stat.correct}문제</span>
                  <span>총 시도: {stat.totalAttempts}문제</span>
                </div>
              </div>
            ))
          )}
        </section>

      </div>
    </main>
  )
}