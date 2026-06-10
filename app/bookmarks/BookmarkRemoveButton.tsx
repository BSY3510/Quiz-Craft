'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { useToast } from '@/app/components/Toast'

export default function BookmarkRemoveButton({ questionId }: { questionId: string }) {
  const supabase = createClient()
  const router = useRouter()
  const toast = useToast()
  const [busy, setBusy] = useState(false)

  const remove = async () => {
    if (busy) return
    setBusy(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setBusy(false); return }
    const { error } = await supabase
      .from('question_reactions')
      .delete()
      .eq('user_id', user.id)
      .eq('question_id', questionId)
      .eq('kind', 'bookmark')
    if (error) {
      setBusy(false)
      toast.error('북마크 해제 중 오류가 발생했습니다.')
      return
    }
    toast.success('북마크를 해제했습니다.')
    router.refresh()
  }

  return (
    <button
      onClick={remove}
      disabled={busy}
      className="text-xs font-bold px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 disabled:opacity-50 whitespace-nowrap"
    >
      🔖 해제
    </button>
  )
}
