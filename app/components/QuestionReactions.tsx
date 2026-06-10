'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useToast } from '@/app/components/Toast'

// 문제별 반응 위젯(👍 도움됨 / 🔖 북마크). 채점 결과 패널에서 사용.
// 상태는 정의자 함수 get_question_reaction_state 로 1회 조회(내 토글 여부 + 전체 좋아요 수).
export default function QuestionReactions({ questionId }: { questionId: string }) {
  const supabase = createClient()
  const toast = useToast()

  const [uid, setUid] = useState<string | null>(null)
  const [liked, setLiked] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true
    async function load() {
      const [{ data: { user } }, { data }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.rpc('get_question_reaction_state', { p_question_id: questionId }),
      ])
      if (!active) return
      setUid(user?.id ?? null)
      const row = Array.isArray(data) ? data[0] : data
      if (row) {
        setLiked(Boolean(row.liked))
        setBookmarked(Boolean(row.bookmarked))
        setLikeCount(Number(row.like_count) || 0)
      }
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [questionId, supabase])

  const toggle = async (kind: 'like' | 'bookmark') => {
    if (busy || !uid) return
    setBusy(true)
    const isOn = kind === 'like' ? liked : bookmarked

    // 낙관적 갱신
    if (kind === 'like') {
      setLiked(!isOn)
      setLikeCount((c) => c + (isOn ? -1 : 1))
    } else {
      setBookmarked(!isOn)
    }

    const { error } = isOn
      ? await supabase.from('question_reactions').delete().eq('user_id', uid).eq('question_id', questionId).eq('kind', kind)
      : await supabase.from('question_reactions').insert({ user_id: uid, question_id: questionId, kind })

    setBusy(false)
    if (error) {
      // 롤백
      if (kind === 'like') {
        setLiked(isOn)
        setLikeCount((c) => c + (isOn ? 1 : -1))
      } else {
        setBookmarked(isOn)
      }
      toast.error('처리 중 오류가 발생했습니다. 다시 시도해 주세요.')
    }
  }

  if (loading) return null

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => toggle('like')}
        disabled={busy}
        className={`flex-1 px-3 py-2.5 rounded-xl text-sm font-bold border transition-colors disabled:opacity-60 ${
          liked
            ? 'bg-pink-50 text-pink-600 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-900/50'
            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700'
        }`}
      >
        👍 도움됐어요{likeCount > 0 ? ` ${likeCount}` : ''}
      </button>
      <button
        type="button"
        onClick={() => toggle('bookmark')}
        disabled={busy}
        className={`flex-1 px-3 py-2.5 rounded-xl text-sm font-bold border transition-colors disabled:opacity-60 ${
          bookmarked
            ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-900/50'
            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700'
        }`}
      >
        {bookmarked ? '🔖 북마크됨' : '🔖 북마크'}
      </button>
    </div>
  )
}
