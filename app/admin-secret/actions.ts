'use server'

import { createClient } from '@/utils/supabase/server'
import { checkAdmin } from '@/utils/auth'
import { buildPrompt, buildTypeNote, buildDifficultyNote, coerceType, normalizeList, normalizeAndValidate, parseJsonLoose, normalizeDifficultyRatio, QUESTION_RESPONSE_SCHEMA, type Difficulty } from './questionSchema'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { revalidatePath } from 'next/cache'

// 1. AI 문제 초안 생성 서버 액션 (DB 연동 동적 프롬프트 적용)
export async function generateQuizDraft(formData: FormData) {
  const c = await checkAdmin()
  if (!c.ok) return { success: false, error: c.error }

  const supabase = await createClient()
  const categoryId = formData.get('category') as string
  const count = parseInt(formData.get('count') as string, 10) || 3
  const type = (formData.get('type') as string) === 'true-false' ? 'true-false' : 'multiple-choice'
  // 난이도 지정(easy/medium/hard) 또는 'auto'(자연 분포). 지정 시 저장값을 그 값으로 확정.
  const rawDifficulty = formData.get('difficulty') as string
  const fixedDifficulty: Difficulty | undefined =
    rawDifficulty === 'easy' || rawDifficulty === 'medium' || rawDifficulty === 'hard' ? rawDifficulty : undefined

  try {
    // ✅ DB에서 저장된 공통/유형별 프롬프트 + 모델 불러오기
    const { data: settings } = await supabase
      .from('site_settings')
      .select('system_prompt, prompt_multiple_choice, prompt_true_false, gemini_model')
      .eq('id', 1)
      .single()

    if (!settings || !settings.system_prompt) {
      return { success: false, error: '시스템 프롬프트가 설정되지 않았습니다. 관리자 페이지에서 프롬프트를 설정해주세요.' }
    }

    // ✅ 분야 이름·가이드 조회 후 마스터 프롬프트에 치환({{category}}/{{count}}/{{category_guide}})
    //    {{category}}는 AI용 정밀 표현(ai_name)이 있으면 그것을, 없으면 표시명(name)을 사용.
    const { data: cat } = await supabase
      .from('categories')
      .select('name, ai_name, prompt')
      .eq('id', categoryId)
      .single()

    const systemPrompt = buildPrompt(settings.system_prompt, {
      categoryName: cat?.ai_name?.trim() || cat?.name || categoryId,
      count,
      guide: cat?.prompt || '',
    }) + buildTypeNote(type, {
      multipleChoice: settings.prompt_multiple_choice,
      trueFalse: settings.prompt_true_false,
    }) + buildDifficultyNote(fixedDifficulty ? { fixed: fixedDifficulty } : undefined)

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    const modelName = settings.gemini_model || process.env.GEMINI_MODEL_VERSION || 'gemini-3.1-flash-lite'

    const model = genAI.getGenerativeModel({
      model: modelName,
      // 구조 강제 스키마로 무효 JSON 생성을 차단
      generationConfig: { responseMimeType: 'application/json', responseSchema: QUESTION_RESPONSE_SCHEMA }
    })

    // ✅ 생성 → 파싱 정규화. 모델이 가끔 깨진 JSON을 내므로 최대 3회 재시도.
    let generatedQuestions: ReturnType<typeof normalizeList> = []
    let parseErr: unknown = null
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const result = await model.generateContent(systemPrompt)
        const list = coerceType(normalizeList(parseJsonLoose(result.response.text())), type)
        if (list.length > 0) { generatedQuestions = list; parseErr = null; break }
        parseErr = new Error('생성된 문제가 없습니다.')
      } catch (e) {
        parseErr = e
        console.error(`generateQuizDraft attempt ${attempt + 1} failed:`, e)
      }
    }
    if (parseErr) throw parseErr

    // 난이도 지정 출제면 검수 초안의 난이도를 지정값으로 확정(검수 화면에서 추가 수정 가능)
    if (fixedDifficulty) generatedQuestions.forEach((q) => { q.difficulty = fixedDifficulty })

    // 선택한 분야를 함께 반환해 저장 시 일괄 적용
    return { success: true, data: generatedQuestions, category: categoryId }
  } catch (error: unknown) {
    console.error('Gemini API Error:', error)

    const err = error as { message?: string; status?: number; response?: { status?: number } }
    const errorMessage = err.message?.toLowerCase() || ''
    const status = err.status || err.response?.status

    if (status === 429 || errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
      return { success: false, error: '🚨 무료 토큰 한도를 초과했거나 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.' }
    }

    if (status === 404 || errorMessage.includes('not found')) {
      return { success: false, error: '🚨 설정된 AI 모델(버전)을 찾을 수 없습니다. 환경변수를 확인해 주세요.' }
    }

    return { success: false, error: `문제 생성 중 오류가 발생했습니다: ${err.message || '알 수 없는 JSON 포맷 오류'}` }
  }
}

// 2. 검수 완료된 문제 DB 등록 서버 액션 (정규화·검증 + 분야 일괄 적용, BUG-4)
export async function saveReviewedQuestions(category: string, questions: unknown[]) {
  const c = await checkAdmin()
  if (!c.ok) return { success: false, error: c.error }

  if (!category) return { success: false, error: '분야가 지정되지 않았습니다.' }

  const checked = normalizeAndValidate(questions)
  if (!checked.ok) return { success: false, error: checked.error }

  try {
    const supabase = await createClient()
    const insertData = checked.questions.map((q) => ({
      category_id: category,
      type: q.type,
      question_text: q.question_text,
      code_snippet: q.code_snippet,
      options: q.options,
      answer_id: q.answer_id,
      explanation: q.explanation,
      difficulty: q.difficulty,
      status: 'active',
    }))

    const { error } = await supabase.from('questions').insert(insertData)

    if (error) throw error
    revalidatePath('/quiz')

    return { success: true }
  } catch (error: unknown) {
    console.error('Save to DB Error:', error)
    return { success: false, error: 'DB 등록 중 오류가 발생했습니다.' }
  }
}

// 3. 문제 수정 (대시보드/신고 화면 공용)
export async function updateQuestion(
  id: string,
  fields: { question_text: string; options: unknown; answer_id: string; explanation: string }
) {
  const c = await checkAdmin()
  if (!c.ok) return { error: c.error }

  const supabase = await createClient()
  const { error } = await supabase
    .from('questions')
    .update({
      question_text: fields.question_text,
      options: fields.options,
      answer_id: fields.answer_id,
      explanation: fields.explanation,
    })
    .eq('id', id)

  if (error) return { error: '문제 수정 중 오류가 발생했습니다.' }
  revalidatePath('/quiz')
  return { success: true }
}

// 4. 구글 로그인 토글 (site_settings)
export async function setGoogleLogin(enabled: boolean) {
  const c = await checkAdmin()
  if (!c.ok) return { error: c.error }

  const supabase = await createClient()
  const { error } = await supabase
    .from('site_settings')
    .update({ google_login_enabled: enabled })
    .eq('id', 1)

  if (error) return { error: '설정 변경 중 오류가 발생했습니다.' }
  return { success: true }
}

// 4-0. 가입 자동 승인 토글 (site_settings) — ON이면 신규 가입자가 status='approved'로 생성됨
//      (DB 트리거 handle_new_user가 이 값을 읽어 status를 결정). 이메일 인증 단계는 그대로 유지.
export async function setAutoApproveSignup(enabled: boolean) {
  const c = await checkAdmin()
  if (!c.ok) return { error: c.error }

  const supabase = await createClient()
  const { error } = await supabase
    .from('site_settings')
    .update({ auto_approve_signup: enabled })
    .eq('id', 1)

  if (error) return { error: '설정 변경 중 오류가 발생했습니다.' }
  return { success: true }
}

// 4-0b. 가입 허용 이메일 도메인 화이트리스트 저장 (site_settings.allowed_email_domains)
//       빈 배열이면 제한 없음(모든 도메인 허용). 입력은 정규화(소문자·선행 @ 제거·중복 제거)한다.
//       ⚠️ 구글 OAuth 가입에는 적용되지 않음(가입 서버 액션을 거치지 않음).
export async function setAllowedEmailDomains(domains: string[]) {
  const c = await checkAdmin()
  if (!c.ok) return { error: c.error }

  const clean = Array.from(new Set(
    (Array.isArray(domains) ? domains : [])
      .map((d) => String(d).trim().toLowerCase().replace(/^@+/, ''))
      .filter(Boolean)
  ))

  const supabase = await createClient()
  const { error } = await supabase
    .from('site_settings')
    .update({ allowed_email_domains: clean })
    .eq('id', 1)

  if (error) return { error: '설정 저장 중 오류가 발생했습니다.' }
  return { success: true }
}

// 4-1. 자동 출제(cron) 활성화 토글 (site_settings)
export async function setAutoGenerate(enabled: boolean) {
  const c = await checkAdmin()
  if (!c.ok) return { error: c.error }

  const supabase = await createClient()
  const { error } = await supabase
    .from('site_settings')
    .update({ auto_generate_enabled: enabled })
    .eq('id', 1)

  if (error) return { error: '설정 변경 중 오류가 발생했습니다.' }
  return { success: true }
}

// 4-2. 자동 출제 대상/개수 설정 (분야 선정 모드 + 선택 분야 + 분야당 문항 수)
export async function setAutoGenerateConfig(opts: {
  mode: 'rotation' | 'selected'
  categoryIds: string[]
  count: number
  oxRatio: number
  difficultyRatio?: { easy: number; medium: number; hard: number }
}) {
  const c = await checkAdmin()
  if (!c.ok) return { error: c.error }

  const mode = opts.mode === 'selected' ? 'selected' : 'rotation'
  const count = Math.min(20, Math.max(1, Math.floor(Number(opts.count)) || 5))
  const oxRatio = Math.min(100, Math.max(0, Math.floor(Number(opts.oxRatio)) || 0))
  // 난이도 비율은 합 100으로 정규화(잔여분 medium). 미지정이면 기본 분포로.
  const difficultyRatio = normalizeDifficultyRatio(opts.difficultyRatio ?? { easy: 30, medium: 50, hard: 20 })
  const categoryIds = Array.isArray(opts.categoryIds)
    ? opts.categoryIds.filter((x) => typeof x === 'string')
    : []

  if (mode === 'selected' && categoryIds.length === 0) {
    return { error: '분야 선택 모드에서는 최소 1개 분야를 선택해야 합니다.' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('site_settings')
    .update({
      auto_generate_mode: mode,
      auto_generate_category_ids: categoryIds,
      auto_generate_count: count,
      auto_generate_ox_ratio: oxRatio,
      auto_generate_difficulty_ratio: difficultyRatio,
    })
    .eq('id', 1)

  if (error) return { error: '설정 저장 중 오류가 발생했습니다.' }
  return { success: true }
}

// 5. AI 프롬프트 저장 (공통 + 유형별). site_settings 의 3개 컬럼을 한 번에 갱신.
//    객관식/OX 보조 프롬프트는 비우면 null 로 저장(객관식=미적용, OX=코드 기본값 사용).
export async function setPrompts(prompts: { common: string; multipleChoice: string; trueFalse: string }) {
  const c = await checkAdmin()
  if (!c.ok) return { error: c.error }

  const common = prompts.common?.trim()
  if (!common) return { error: '공통 프롬프트는 비울 수 없습니다.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('site_settings')
    .update({
      system_prompt: common,
      prompt_multiple_choice: prompts.multipleChoice?.trim() || null,
      prompt_true_false: prompts.trueFalse?.trim() || null,
    })
    .eq('id', 1)

  if (error) return { error: '프롬프트 저장 중 오류가 발생했습니다.' }
  return { success: true }
}

const QUESTION_STATUSES = ['active', 'pending_review', 'archived'] as const
type QStatus = (typeof QUESTION_STATUSES)[number]

// 6-1. 문제 상태 변경 (검증 큐 승인/반려). active=노출, pending_review=대기, archived=보관
export async function setQuestionStatus(id: string, status: QStatus) {
  const c = await checkAdmin()
  if (!c.ok) return { error: c.error }
  if (!QUESTION_STATUSES.includes(status)) return { error: '잘못된 상태값입니다.' }

  const supabase = await createClient()
  const { error } = await supabase.from('questions').update({ status }).eq('id', id)

  if (error) return { error: '상태 변경 중 오류가 발생했습니다.' }
  revalidatePath('/quiz')
  revalidatePath('/admin-secret')
  return { success: true }
}

// 6-2. 문제 상태 일괄 변경 (검증 큐 일괄 승인/반려)
export async function setQuestionsStatus(ids: string[], status: QStatus) {
  const c = await checkAdmin()
  if (!c.ok) return { error: c.error }
  if (!QUESTION_STATUSES.includes(status)) return { error: '잘못된 상태값입니다.' }
  if (!ids.length) return { error: '대상 문제가 없습니다.' }

  const supabase = await createClient()
  const { error } = await supabase.from('questions').update({ status }).in('id', ids)

  if (error) return { error: '일괄 처리 중 오류가 발생했습니다.' }
  revalidatePath('/quiz')
  revalidatePath('/admin-secret')
  return { success: true, count: ids.length }
}

// 6-3. 문제 영구 삭제 (단건). 2단계 정책: archived(보관) 상태인 문제만 삭제 가능.
//      attempts/reports FK 는 ON DELETE SET NULL(phase-question-delete.sql)이라 이력은 보존된다.
export async function deleteQuestion(id: string) {
  const c = await checkAdmin()
  if (!c.ok) return { error: c.error }

  const supabase = await createClient()
  // status='archived' 조건을 함께 걸어 보관 상태가 아닌 문제는 삭제되지 않게 강제한다.
  const { data, error } = await supabase
    .from('questions')
    .delete()
    .eq('id', id)
    .eq('status', 'archived')
    .select('id')

  if (error) return { error: '문제 삭제 중 오류가 발생했습니다.' }
  if (!data || data.length === 0) return { error: '보관(archived) 상태의 문제만 영구 삭제할 수 있습니다.' }

  revalidatePath('/quiz')
  revalidatePath('/admin-secret')
  return { success: true }
}

// 6-4. 문제 영구 삭제 (일괄). 단건과 동일하게 archived 상태만 삭제되며, 실제 삭제된 건수를 돌려준다.
export async function deleteQuestions(ids: string[]) {
  const c = await checkAdmin()
  if (!c.ok) return { error: c.error }
  if (!ids.length) return { error: '대상 문제가 없습니다.' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('questions')
    .delete()
    .in('id', ids)
    .eq('status', 'archived')
    .select('id')

  if (error) return { error: '일괄 삭제 중 오류가 발생했습니다.' }

  revalidatePath('/quiz')
  revalidatePath('/admin-secret')
  return { success: true, count: data?.length ?? 0 }
}

// 6. AI 모델 버전 저장 (site_settings.gemini_model)
export async function setGeminiModel(model: string) {
  const c = await checkAdmin()
  if (!c.ok) return { error: c.error }

  const clean = model.trim()
  if (!clean) return { error: '모델명을 선택해 주세요.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('site_settings')
    .update({ gemini_model: clean })
    .eq('id', 1)

  if (error) return { error: '모델 저장 중 오류가 발생했습니다.' }
  return { success: true }
}