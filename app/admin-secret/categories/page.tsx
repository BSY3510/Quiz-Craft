'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function AdminCategoriesPage() {
  const supabase = createClient()
  const pathname = usePathname()
  const adminPath = pathname.split('/').slice(0, 2).join('/')

  const [categories, setCategories] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // 등록/수정 폼 상태 관리
  const [newId, setNewId] = useState('')
  const [newName, setNewName] = useState('')
  const [editingCategory, setEditingCategory] = useState<any>(null)

  // 분야 목록 불러오기
  const fetchCategories = async () => {
    setIsLoading(true)
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('created_at', { ascending: true })
    if (data) setCategories(data)
    setIsLoading(false)
  }

  useEffect(() => {
    fetchCategories()
  }, [supabase])

  // 1. 신규 분야 등록
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newId.trim() || !newName.trim()) return

    const { error } = await supabase
      .from('categories')
      .insert({ id: newId.toLowerCase().trim(), name: newName.trim(), active: true })

    if (!error) {
      alert('새로운 분야가 등록되었습니다.')
      setNewId('')
      setNewName('')
      fetchCategories()
    } else {
      alert('등록 실패: 중복된 ID이거나 오류가 발생했습니다.')
    }
  }

  // 2. 분야 활성/비활성 토글
  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('categories')
      .update({ active: !currentStatus })
      .eq('id', id)

    if (!error) {
      setCategories(categories.map(c => c.id === id ? { ...c, active: !currentStatus } : c))
    }
  }

  // 3. 분야명 수정 저장
  const handleSaveEdit = async () => {
    if (!editingCategory || !editingCategory.name.trim()) return

    const { error } = await supabase
      .from('categories')
      .update({ name: editingCategory.name.trim() })
      .eq('id', editingCategory.id)

    if (!error) {
      alert('분야명이 수정되었습니다.')
      setEditingCategory(null)
      fetchCategories()
    } else {
      alert('수정 중 오류가 발생했습니다.')
    }
  }

  // 4. 분야 완전 삭제
  const handleDeleteCategory = async (id: string) => {
    if (!confirm(`⚠️ 정말로 [${id}] 분야를 완전히 삭제하시겠습니까?\n삭제 시 해당 분야의 카테고리 정보가 증발합니다.`)) return

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)

    if (!error) {
      alert('분야가 성공적으로 삭제되었습니다.')
      fetchCategories()
    } else {
      alert('삭제 실패: 데이터베이스 제약 조건 또는 오류가 발생했습니다.')
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 relative">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-800">📚 퀴즈 분야 관리</h1>
            <p className="text-slate-500 mt-1">사용자들이 풀이할 학습 분야(카테고리)를 추가, 수정, 삭제합니다.</p>
          </div>
          <Link href={adminPath} className="text-sm font-bold text-blue-600 hover:underline">
            ← 관리자 센터로
          </Link>
        </header>

        {/* 신규 등록 폼 */}
        <section className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-sm font-bold text-slate-700 mb-3">✨ 신규 분야 생성</h2>
          <form onSubmit={handleCreateCategory} className="flex flex-col sm:flex-row gap-3">
            <input 
              type="text" 
              placeholder="분야 식별 ID (예: nextjs, sql)" 
              value={newId}
              onChange={(e) => setNewId(e.target.value)}
              className="flex-1 p-3 border border-slate-300 rounded-lg text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <input 
              type="text" 
              placeholder="표시용 이름 (예: Next.js, SQL 데이터베이스)" 
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1 p-3 border border-slate-300 rounded-lg text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <button type="submit" className="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 text-sm transition-colors whitespace-nowrap">
              + 분야 추가
            </button>
          </form>
        </section>

        {/* 분야 리스트 테이블 */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-slate-500 font-bold">분야 목록을 불러오는 중...</div>
          ) : categories.length === 0 ? (
            <div className="p-8 text-center text-slate-500">등록된 분야가 없습니다.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="p-4 font-bold">식별 ID</th>
                    <th className="p-4 font-bold">분야명 (표시 이름)</th>
                    <th className="p-4 font-bold">노출 상태</th>
                    <th className="p-4 font-bold text-right">관리 액션</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {categories.map(category => (
                    <tr key={category.id} className="hover:bg-slate-50">
                      <td className="p-4 font-mono text-xs font-bold text-slate-500 uppercase">{category.id}</td>
                      <td className="p-4 font-bold">{category.name}</td>
                      <td className="p-4">
                        <button 
                          onClick={() => handleToggleActive(category.id, category.active)}
                          className={`px-3 py-1 text-xs font-bold rounded-full transition-colors ${category.active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                        >
                          {category.active ? '● 노출 활성화' : '○ 숨김 비활성화'}
                        </button>
                      </td>
                      <td className="p-4 text-right space-x-2 whitespace-nowrap">
                        <button 
                          onClick={() => setEditingCategory({ ...category })}
                          className="px-2.5 py-1.5 bg-slate-100 text-slate-600 text-xs font-bold rounded hover:bg-slate-200 border border-slate-200"
                        >
                          ✏️ 이름 수정
                        </button>
                        <button 
                          onClick={() => handleDeleteCategory(category.id)}
                          className="px-2.5 py-1.5 bg-red-50 text-red-600 text-xs font-bold rounded hover:bg-red-100 border border-red-100"
                        >
                          🗑️ 영구 삭제
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* 분야 이름 수정 모달 팝업 */}
      {editingCategory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
            <h2 className="text-lg font-black text-slate-800">📚 분야 정보 수정</h2>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">분야 ID (변경 불가)</label>
              <input type="text" value={editingCategory.id} disabled className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-lg font-mono text-sm text-slate-400 uppercase" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">새 분야 이름</label>
              <input 
                type="text" 
                value={editingCategory.name} 
                onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                className="w-full p-3 border border-slate-300 rounded-lg text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={handleSaveEdit} className="flex-1 p-3 bg-blue-600 text-white font-bold rounded-xl text-sm hover:bg-blue-700">변경 저장</button>
              <button onClick={() => setEditingCategory(null)} className="flex-1 p-3 bg-slate-100 text-slate-700 font-bold rounded-xl text-sm hover:bg-slate-200">취소</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}