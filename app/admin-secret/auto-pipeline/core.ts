import type { SupabaseClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'
import {
  buildPrompt,
  buildAvoidanceNote,
  buildTypeNote,
  buildDifficultyNote,
  coerceType,
  filterNearDuplicates,
  normalizeAndValidate,
  buildValidationPrompt,
  parseValidation,
  parseJsonLoose,
  QUESTION_RESPONSE_SCHEMA,
  VALIDATION_RESPONSE_SCHEMA,
  type NormalizedQuestion,
  type GenQuestionType,
} from '../questionSchema'

export interface PipelineResult {
  ok: boolean
  error?: string
  insertedCount?: number
  approvedCount?: number
  queuedCount?: number
  skippedDuplicates?: number
}

// 자동 출제 핵심 로직. 수동 파이프라인(runAutoPipeline)과 cron이 공유한다.
// 인증/세션은 호출부 책임 — 여기서는 전달받은 supabase 클라이언트로만 동작한다
// (수동: 관리자 세션 클라이언트 / cron: service-role 클라이언트).
export async function generateForCategory(
  supabase: SupabaseClient,
  categoryId: string,
  count: number,
  type: GenQuestionType = 'multiple-choice'
): Promise<PipelineResult> {
  const { data: settings } = await supabase
    .from('site_settings')
    .select('system_prompt, gemini_model')
    .eq('id', 1)
    .single()

  if (!settings?.system_prompt) {
    return { ok: false, error: '시스템 프롬프트가 설정되지 않았습니다. 프롬프트 관리에서 설정해주세요.' }
  }

  const { data: cat } = await supabase
    .from('categories')
    .select('name, prompt')
    .eq('id', categoryId)
    .single()

  // 중복 방지(1): 해당 분야의 기존 활성·대기 문제 텍스트를 회피 목록으로 사용
  const { data: existing } = await supabase
    .from('questions')
    .select('question_text')
    .eq('category_id', categoryId)
    .in('status', ['active', 'pending_review'])
    .order('created_at', { ascending: false })
    .limit(200)
  const existingTexts = (existing ?? []).map((r) => (r.question_text as string) ?? '')

  const systemPrompt =
    buildPrompt(settings.system_prompt, {
      categoryName: cat?.name || categoryId,
      count,
      guide: cat?.prompt || '',
    }) + buildTypeNote(type) + buildDifficultyNote() + buildAvoidanceNote(existingTexts)

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  const modelName = settings.gemini_model || process.env.GEMINI_MODEL_VERSION || 'gemini-3.1-flash-lite'

  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: { responseMimeType: 'application/json', responseSchema: QUESTION_RESPONSE_SCHEMA },
  })
  const valModel = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: { responseMimeType: 'application/json', responseSchema: VALIDATION_RESPONSE_SCHEMA },
  })

  // 생성 → 파싱 → 구조 검증, 깨진 JSON 대비 최대 3회 재시도
  let questions: NormalizedQuestion[] | null = null
  let lastErr = '알 수 없는 오류'
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const result = await model.generateContent(systemPrompt)
      const c = normalizeAndValidate(parseJsonLoose(result.response.text()))
      if (c.ok) {
        questions = c.questions
        break
      }
      lastErr = c.error
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e)
      console.error(`generateForCategory attempt ${attempt + 1} failed:`, e)
    }
  }
  if (!questions) {
    return { ok: false, error: `생성 결과 검증 실패(재시도 초과): ${lastErr}` }
  }
  coerceType(questions, type) // OX 요청이면 type 확정

  // 중복 방지(2): 기존 문제 및 배치 내부와 근접 중복인 항목 제거
  const deduped = filterNearDuplicates(questions, existingTexts)
  const skippedDuplicates = questions.length - deduped.length
  if (deduped.length === 0) {
    return { ok: true, insertedCount: 0, approvedCount: 0, queuedCount: 0, skippedDuplicates }
  }

  // AI 2차 검증 — 실패 시 안전하게 전부 검증 큐(pending_review)로
  let validFlags: boolean[]
  try {
    const valResult = await valModel.generateContent(buildValidationPrompt(deduped))
    validFlags = parseValidation(parseJsonLoose(valResult.response.text()), deduped.length)
  } catch (e) {
    console.error('AI validation failed:', e)
    validFlags = new Array(deduped.length).fill(false)
  }

  const insertData = deduped.map((q, i) => ({
    category_id: categoryId,
    type: q.type,
    question_text: q.question_text,
    code_snippet: q.code_snippet,
    options: q.options,
    answer_id: q.answer_id,
    explanation: q.explanation,
    difficulty: q.difficulty,
    status: validFlags[i] ? 'active' : 'pending_review',
  }))

  const { error } = await supabase.from('questions').insert(insertData)
  if (error) {
    return { ok: false, error: `DB 등록 실패: ${error.message}` }
  }

  const approvedCount = validFlags.filter(Boolean).length
  return {
    ok: true,
    insertedCount: insertData.length,
    approvedCount,
    queuedCount: insertData.length - approvedCount,
    skippedDuplicates,
  }
}
