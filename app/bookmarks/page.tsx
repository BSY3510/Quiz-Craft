export const dynamic = 'force-dynamic'

import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import BookmarksList, { type BookmarkItem } from './BookmarksList'

export default async function BookmarksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 정답/해설은 일반 select에서 회수되므로 정의자 함수로 본인 북마크만 조회.
  // 분야 필터에 이름을 쓰기 위해 categories도 함께 조회해 매핑.
  const [{ data }, { data: cats }] = await Promise.all([
    supabase.rpc('get_bookmarked_questions'),
    supabase.from('categories').select('id, name'),
  ])
  const items = (data as BookmarkItem[] | null) ?? []
  const categoryNames: Record<string, string> = {}
  for (const c of (cats as { id: string; name: string }[] | null) ?? []) categoryNames[c.id] = c.name

  return (
    <main className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-900 md:items-center p-4 pt-8">
      <div className="w-full max-w-2xl space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100">🔖 내 북마크</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">저장해 둔 문제를 정답·해설과 함께 복습하세요.</p>
          </div>
          <Link href="/quiz" className="px-4 py-2 bg-white border border-slate-200 text-slate-600 font-bold rounded-lg hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700 whitespace-nowrap">
            대시보드로
          </Link>
        </header>

        <BookmarksList items={items} categoryNames={categoryNames} />
      </div>
    </main>
  )
}
