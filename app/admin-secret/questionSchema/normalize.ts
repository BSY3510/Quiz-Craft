// AI 출제 결과 정규화·검증 (BUG-4)
// 반자동(generateQuizDraft)과 자동(runAutoPipeline)의 JSON 컨벤션이 달랐던 문제를
// 한 곳에서 흡수한다: snake_case(question_text/answer_id/code_snippet)와
// camelCase(question/answerId/codeSnippet)를 모두 수용해 DB 컬럼 형태로 정규화.

import type { Difficulty, DifficultyRatio, NormalizedQuestion } from './types'

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']

// 요청 유형이 OX면 결과의 type 을 'true-false' 로 확정(모델이 누락/오기해도 보정).
export function coerceType(questions: NormalizedQuestion[], type: string): NormalizedQuestion[] {
  if (type === 'true-false') questions.forEach((q) => { q.type = 'true-false' })
  return questions
}

// 비율 정규화: 각 값 0~100 정수로 보정 후, 합이 100이 아니면 잔여분을 medium 에 몰아 합 100 보장.
export function normalizeDifficultyRatio(raw: unknown): DifficultyRatio {
  const obj = (raw ?? {}) as Record<string, unknown>
  const clamp = (v: unknown) => Math.min(100, Math.max(0, Math.round(Number(v)) || 0))
  let easy = clamp(obj.easy)
  let hard = clamp(obj.hard)
  if (easy + hard > 100) {
    // easy/hard 만으로 100 초과 시 hard 부터 줄여 100 이내로
    hard = Math.max(0, 100 - easy)
    if (easy > 100) { easy = 100; hard = 0 }
  }
  const medium = 100 - easy - hard // 잔여분은 medium
  return { easy, medium, hard }
}

export function normalizeQuestion(q: unknown): NormalizedQuestion {
  const obj = (q ?? {}) as Record<string, unknown>
  const rawOptions = Array.isArray(obj.options) ? obj.options : []
  const options = rawOptions.map((o) => {
    const oo = (o ?? {}) as Record<string, unknown>
    return { id: String(oo.id ?? ''), text: String(oo.text ?? '') }
  })
  const codeSnippet = obj.code_snippet ?? obj.codeSnippet ?? null
  const rawDiff = String(obj.difficulty ?? '').toLowerCase() as Difficulty
  return {
    type: (obj.type as string) || 'multiple-choice',
    question_text: String(obj.question_text ?? obj.question ?? '').trim(),
    code_snippet: codeSnippet === null ? null : String(codeSnippet),
    options,
    answer_id: String(obj.answer_id ?? obj.answerId ?? ''),
    explanation: String(obj.explanation ?? '').trim(),
    difficulty: DIFFICULTIES.includes(rawDiff) ? rawDiff : 'medium',
  }
}

// null = 유효 / 문자열 = 오류 사유
export function validateQuestion(q: NormalizedQuestion): string | null {
  if (!q.question_text) return '문제 내용(question_text)이 비어 있습니다.'
  if (!Array.isArray(q.options) || q.options.length < 2) return '보기(options)가 2개 미만입니다.'
  if (q.options.some((o) => !o.id || !o.text)) return '보기의 id 또는 text가 비어 있습니다.'
  const ids = q.options.map((o) => o.id)
  if (new Set(ids).size !== ids.length) return '보기 id가 중복됩니다.'
  if (!ids.includes(q.answer_id)) return '정답(answer_id)이 보기 목록에 없습니다.'
  if (!q.explanation) return '해설(explanation)이 비어 있습니다.'
  return null
}

// 파싱 결과(배열)를 정규화만 수행(검증은 안 함). 화면 검수용.
export function normalizeList(raw: unknown): NormalizedQuestion[] {
  if (!Array.isArray(raw)) return []
  return raw.map(normalizeQuestion)
}

// 정규화 + 검증. 하나라도 무효면 실패(어디가 문제인지 사유 포함).
export function normalizeAndValidate(
  raw: unknown
): { ok: true; questions: NormalizedQuestion[] } | { ok: false; error: string } {
  if (!Array.isArray(raw)) return { ok: false, error: 'AI 응답이 JSON 배열 형식이 아닙니다.' }
  if (raw.length === 0) return { ok: false, error: '생성된 문제가 없습니다.' }

  const questions: NormalizedQuestion[] = []
  for (let i = 0; i < raw.length; i++) {
    const n = normalizeQuestion(raw[i])
    const err = validateQuestion(n)
    if (err) return { ok: false, error: `${i + 1}번 문제 오류: ${err}` }
    questions.push(n)
  }
  return { ok: true, questions }
}
