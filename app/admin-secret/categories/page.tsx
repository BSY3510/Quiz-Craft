import { createClient } from '@/utils/supabase/server'
import { addCategory, toggleCategoryStatus } from './actions'
import Link from 'next/link'

export default async function AdminCategoriesPage() {
  const supabase = await createClient()
  
  // 등록된 분야 목록 조회
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, active, created_at')
    .order('created_at', { ascending: true })

    const adminPath = `/admin-${process.env.ADMIN_PATH_SUFFIX}`

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-800">퀴즈 분야 관리</h1>
            <p className="text-slate-500 mt-1">새로운 퀴즈 분야를 추가하거나 활성화 상태를 변경합니다.</p>
          </div>
          <Link href={adminPath} className="text-sm font-bold text-blue-600 hover:underline">
          ← 관리자 메인으로
          </Link>
        </header>

        {/* 분야 추가 폼 */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-slate-800 mb-4">새 분야 추가</h2>
          {/* 타입 에러 해결: 익명 함수로 서버 액션 래핑 */}
          <form 
            action={async (formData) => {
              'use server'
              await addCategory(formData)
            }} 
            className="flex gap-4 items-end"
          >
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">분야 ID (영문 소문자)</label>
              <input 
                name="id" 
                type="text" 
                required 
                placeholder="예: react"
                className="w-full p-3 border border-slate-300 rounded-lg"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">분야 표시명</label>
              <input 
                name="name" 
                type="text" 
                required 
                placeholder="예: React.js"
                className="w-full p-3 border border-slate-300 rounded-lg"
              />
            </div>
            <button 
              type="submit"
              className="px-6 py-3 font-bold text-white bg-slate-800 rounded-lg hover:bg-slate-900 transition-colors"
            >
              추가하기
            </button>
          </form>
        </section>

        {/* 분야 목록 테이블 */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="p-4 font-bold">분야 ID</th>
                <th className="p-4 font-bold">표시명</th>
                <th className="p-4 font-bold text-center">상태</th>
                <th className="p-4 font-bold text-right">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categories?.map((cat) => (
                <tr key={cat.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 text-slate-500 font-mono">{cat.id}</td>
                  <td className="p-4 text-slate-800 font-bold">{cat.name}</td>
                  <td className="p-4 text-center">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${cat.active ? 'bg-green-100 text-green-800' : 'bg-slate-200 text-slate-600'}`}>
                      {cat.active ? '활성' : '비활성'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <form 
                      action={async () => {
                        'use server'
                        await toggleCategoryStatus(cat.id, cat.active)
                      }}
                    >
                      <button 
                        type="submit"
                        className={`px-4 py-2 font-bold rounded-lg transition-colors ${cat.active ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
                      >
                        {cat.active ? '비활성화' : '활성화'}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  )
}