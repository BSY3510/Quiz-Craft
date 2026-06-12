'use server'

import { createClient } from '@/utils/supabase/server'
import { checkAdmin } from '@/utils/auth'
import { revalidatePath } from 'next/cache'
import { generateForCategory } from './core'
import type { GenQuestionType, Difficulty } from '../questionSchema'

export async function runAutoPipeline(
  categoryId: string,
  count: number,
  type: GenQuestionType = 'multiple-choice',
  difficulty: Difficulty | 'auto' = 'auto'
) {
  const c = await checkAdmin()
  if (!c.ok) return { error: c.error }

  const supabase = await createClient()
  const difficultyOpts = difficulty !== 'auto' ? { fixed: difficulty } : undefined
  const r = await generateForCategory(supabase, categoryId, count, type, difficultyOpts)

  if (!r.ok) return { error: r.error }

  revalidatePath('/quiz')
  revalidatePath('/admin-secret')
  return {
    success: true,
    insertedCount: r.insertedCount ?? 0,
    approvedCount: r.approvedCount ?? 0,
    queuedCount: r.queuedCount ?? 0,
    skippedDuplicates: r.skippedDuplicates ?? 0,
  }
}
