// AI 출제 결과 정규화·검증 (BUG-4)
// 반자동(generateQuizDraft)과 자동(runAutoPipeline)의 JSON 컨벤션이 달랐던 문제를
// 한 곳에서 흡수한다: snake_case(question_text/answer_id/code_snippet)와
// camelCase(question/answerId/codeSnippet)를 모두 수용해 DB 컬럼 형태로 정규화.

// 마스터 프롬프트에 변수 치환 (분야별 가이드 포함). 반자동·자동 출제 공용.
export function buildPrompt(
  master: string,
  opts: { categoryName: string; count: number; guide: string }
): string {
  return master
    .replace(/\{\{category\}\}/g, opts.categoryName)
    .replace(/\{\{count\}\}/g, String(opts.count))
    .replace(/\{\{category_guide\}\}/g, opts.guide || '')
}

export interface NormalizedQuestion {
  type: string
  question_text: string
  code_snippet: string | null
  options: { id: string; text: string }[]
  answer_id: string
  explanation: string
}

export function normalizeQuestion(q: unknown): NormalizedQuestion {
  const obj = (q ?? {}) as Record<string, unknown>
  const rawOptions = Array.isArray(obj.options) ? obj.options : []
  const options = rawOptions.map((o) => {
    const oo = (o ?? {}) as Record<string, unknown>
    return { id: String(oo.id ?? ''), text: String(oo.text ?? '') }
  })
  const codeSnippet = obj.code_snippet ?? obj.codeSnippet ?? null
  return {
    type: (obj.type as string) || 'multiple-choice',
    question_text: String(obj.question_text ?? obj.question ?? '').trim(),
    code_snippet: codeSnippet === null ? null : String(codeSnippet),
    options,
    answer_id: String(obj.answer_id ?? obj.answerId ?? ''),
    explanation: String(obj.explanation ?? '').trim(),
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
