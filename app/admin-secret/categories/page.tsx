'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { useAdminPath } from '../useAdminPath'
import { createCategory, toggleCategoryActive, updateCategory, deleteCategory } from './actions'
import { useToast } from '@/app/components/Toast'
import { useConfirm } from '@/app/components/Confirm'
import { Modal } from '@/app/components/Modal'
import type { Category } from '@/types/db'

export default function AdminCategoriesPage() {
  const supabase = createClient()
  const adminPath = useAdminPath()
  const toast = useToast()
  const confirm = useConfirm()

  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // 등록/수정 폼 상태 관리
  const [newId, setNewId] = useState('')
  const [newName, setNewName] = useState('')
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [search, setSearch] = useState('')

  // 검색 필터 (식별 ID 또는 분야명)
  const keyword = search.trim().toLowerCase()
  const filteredCategories = keyword
    ? categories.filter(c =>
        c.id.toLowerCase().includes(keyword) || (c.name || '').toLowerCase().includes(keyword))
    : categories

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

    const res = await createCategory(newId, newName)
    if (!res.error) {
      toast.success('새로운 분야가 등록되었습니다.')
      setNewId('')
      setNewName('')
      fetchCategories()
    } else {
      toast.error(`등록 실패: ${res.error}`)
    }
  }

  // 2. 분야 활성/비활성 토글
  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    const res = await toggleCategoryActive(id, currentStatus)
    if (!res.error) {
      setCategories(categories.map(c => c.id === id ? { ...c, active: !currentStatus } : c))
    } else {
      toast.error(res.error)
    }
  }

  // 3. 분야명 수정 저장
  const handleSaveEdit = async () => {
    if (!editingCategory || !editingCategory.name.trim()) return

    const res = await updateCategory(editingCategory.id, editingCategory.name, editingCategory.prompt || '')
    if (!res.error) {
      toast.success('분야 정보가 수정되었습니다.')
      setEditingCategory(null)
      fetchCategories()
    } else {
      toast.error(`수정 중 오류가 발생했습니다: ${res.error}`)
    }
  }

  // 4. 분야 완전 삭제
  const handleDeleteCategory = async (id: string) => {
    const ok = await confirm({
      title: '분야 삭제',
      message: `정말로 [${id}] 분야를 완전히 삭제할까요?\n삭제 시 해당 분야 정보가 사라집니다.`,
      confirmText: '삭제',
      danger: true,
    })
    if (!ok) return

    const res = await deleteCategory(id)
    if (!res.error) {
      toast.success('분야가 성공적으로 삭제되었습니다.')
      fetchCategories()
    } else {
      toast.error(`삭제 실패: ${res.error}`)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6 relative">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100">📚 퀴즈 분야 관리</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">사용자들이 풀이할 학습 분야(카테고리)를 추가, 수정, 삭제합니다.</p>
          </div>
          <Link href={adminPath} className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline">
            ← 관리자 센터로
          </Link>
        </header>

        {/* 신규 등록 폼 */}
        <section className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">✨ 신규 분야 생성</h2>
          <form onSubmit={handleCreateCategory} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="분야 식별 ID (예: nextjs, sql)"
              value={newId}
              onChange={(e) => setNewId(e.target.value)}
              className="flex-1 p-3 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 rounded-lg text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <input
              type="text"
              placeholder="표시용 이름 (예: Next.js, SQL 데이터베이스)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1 p-3 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 rounded-lg text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <button type="submit" className="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 text-sm transition-colors whitespace-nowrap">
              + 분야 추가
            </button>
          </form>
        </section>

        {/* 분야 검색 */}
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 분야 검색 (ID 또는 이름)"
            className="w-full p-3 pl-4 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          />
          {keyword && (
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400 dark:text-slate-500">{filteredCategories.length}개</span>
          )}
        </div>

        {/* 분야 리스트 테이블 */}
        <section className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400 font-bold">분야 목록을 불러오는 중...</div>
          ) : categories.length === 0 ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400">등록된 분야가 없습니다.</div>
          ) : filteredCategories.length === 0 ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400">&apos;{search}&apos; 검색 결과가 없습니다.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="p-4 font-bold">식별 ID</th>
                    <th className="p-4 font-bold">분야명 (표시 이름)</th>
                    <th className="p-4 font-bold">노출 상태</th>
                    <th className="p-4 font-bold text-right">관리 액션</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-slate-800 dark:text-slate-200">
                  {filteredCategories.map(category => (
                    <tr key={category.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="p-4 font-mono text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">{category.id}</td>
                      <td className="p-4 font-bold">{category.name}</td>
                      <td className="p-4">
                        <button 
                          onClick={() => handleToggleActive(category.id, category.active)}
                          className={`px-3 py-1 text-xs font-bold rounded-full transition-colors ${category.active ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-300' : 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300'}`}
                        >
                          {category.active ? '● 노출 활성화' : '○ 숨김 비활성화'}
                        </button>
                      </td>
                      <td className="p-4 text-right space-x-2 whitespace-nowrap">
                        <button
                          onClick={() => setEditingCategory({ ...category })}
                          className="px-2.5 py-1.5 bg-slate-100 text-slate-600 text-xs font-bold rounded hover:bg-slate-200 border border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-600"
                        >
                          ✏️ 수정
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(category.id)}
                          className="px-2.5 py-1.5 bg-red-50 text-red-600 text-xs font-bold rounded hover:bg-red-100 border border-red-100 dark:bg-red-900/30 dark:text-red-400 dark:border-red-900/50 dark:hover:bg-red-900/50"
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

      {/* 분야 정보 수정 모달 */}
      <Modal open={!!editingCategory} onClose={() => setEditingCategory(null)} className="max-w-sm" labelledBy="cat-edit-title">
        {editingCategory && (
          <div className="space-y-4">
            <h2 id="cat-edit-title" className="text-lg font-black text-slate-800 dark:text-slate-100">📚 분야 정보 수정</h2>
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 mb-1">분야 ID (변경 불가)</label>
              <input type="text" value={editingCategory.id} disabled className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-lg font-mono text-sm text-slate-400 uppercase dark:bg-slate-900 dark:border-slate-700 dark:text-slate-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">새 분야 이름</label>
              <input
                type="text"
                value={editingCategory.name}
                onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                className="w-full p-3 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 rounded-lg text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">분야별 출제 가이드 <span className="font-normal text-slate-400 dark:text-slate-500">(선택)</span></label>
              <textarea
                value={editingCategory.prompt || ''}
                onChange={(e) => setEditingCategory({ ...editingCategory, prompt: e.target.value })}
                rows={4}
                placeholder={'이 분야에 특화된 출제 지시를 적어주세요.\n예: 최신 LTS 기준, 컬렉션·제네릭·스트림 위주. 너무 지엽적인 문법은 제외.'}
                className="w-full p-3 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 rounded-lg text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">마스터 프롬프트의 <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded font-mono">{'{{category_guide}}'}</code> 자리에 삽입됩니다. 비워두면 마스터만 사용.</p>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={handleSaveEdit} className="flex-1 p-3 bg-blue-600 text-white font-bold rounded-xl text-sm hover:bg-blue-700">변경 저장</button>
              <button onClick={() => setEditingCategory(null)} className="flex-1 p-3 bg-slate-100 text-slate-700 font-bold rounded-xl text-sm hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600">취소</button>
            </div>
          </div>
        )}
      </Modal>
    </main>
  )
}