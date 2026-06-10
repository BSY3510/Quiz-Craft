// AI 출제 결과 정규화·검증 (BUG-4)
// 반자동(generateQuizDraft)과 자동(runAutoPipeline)의 JSON 컨벤션이 달랐던 문제를
// 한 곳에서 흡수한다: snake_case(question_text/answer_id/code_snippet)와
// camelCase(question/answerId/codeSnippet)를 모두 수용해 DB 컬럼 형태로 정규화.

import { SchemaType, type ResponseSchema } from '@google/generative-ai'

// Gemini 구조 강제 출력 스키마. responseSchema 로 넘기면 모델이 따옴표 누락·
// 이스케이프 깨짐 같은 무효 JSON을 만들지 못하도록 생성 자체를 제약한다(오류 #2/#3 예방).
export const QUESTION_RESPONSE_SCHEMA: ResponseSchema = {
  type: SchemaType.ARRAY,
  items: {
    type: SchemaType.OBJECT,
    properties: {
      type: { type: SchemaType.STRING },
      question_text: { type: SchemaType.STRING },
      code_snippet: { type: SchemaType.STRING, nullable: true },
      options: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            id: { type: SchemaType.STRING },
            text: { type: SchemaType.STRING },
          },
          required: ['id', 'text'],
        },
      },
      answer_id: { type: SchemaType.STRING },
      explanation: { type: SchemaType.STRING },
    },
    required: ['question_text', 'options', 'answer_id', 'explanation'],
  },
}

// AI 2차 검증 응답용 스키마. [{ index, valid, reason }]
export const VALIDATION_RESPONSE_SCHEMA: ResponseSchema = {
  type: SchemaType.ARRAY,
  items: {
    type: SchemaType.OBJECT,
    properties: {
      index: { type: SchemaType.INTEGER },
      valid: { type: SchemaType.BOOLEAN },
      reason: { type: SchemaType.STRING, nullable: true },
    },
    required: ['index', 'valid'],
  },
}

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

// LLM 응답에서 JSON 본문만 추출해 파싱(코드펜스·앞뒤 잡텍스트·설명 덧붙임 대비).
// 첫 '[' 또는 '{' 에서 시작해 문자열·이스케이프를 고려한 "균형 잡힌 닫힘"까지만
// 잘라낸다. 뒤따르는 설명 문장이나 그 안의 ']' 같은 잡브래킷에 휘둘리지 않는다.
// "Unexpected non-whitespace character after JSON" 류 오류를 방지한다.
export function parseJsonLoose(text: string): unknown {
  let t = (text ?? '').trim()
  if (t.startsWith('```')) {
    t = t.replace(/^```(?:json)?/i, '').replace(/```\s*$/i, '').trim()
  }

  const aIdx = t.indexOf('[')
  const oIdx = t.indexOf('{')
  let start = -1
  if (aIdx === -1) start = oIdx
  else if (oIdx === -1) start = aIdx
  else start = Math.min(aIdx, oIdx)

  if (start !== -1) {
    const open = t[start]
    const close = open === '[' ? ']' : '}'
    let depth = 0
    let inStr = false
    let esc = false
    for (let i = start; i < t.length; i++) {
      const ch = t[i]
      if (inStr) {
        if (esc) esc = false
        else if (ch === '\\') esc = true
        else if (ch === '"') inStr = false
        continue
      }
      if (ch === '"') { inStr = true; continue }
      if (ch === open) depth++
      else if (ch === close) {
        depth--
        if (depth === 0) return JSON.parse(t.slice(start, i + 1))
      }
    }
  }
  return JSON.parse(t)
}

// ── AI 2차 검증 (독립 호출용 프롬프트 + 결과 파서) ──
// 생성된 문제를 별도 AI 호출로 검수하기 위한 프롬프트.
export function buildValidationPrompt(questions: NormalizedQuestion[]): string {
  const list = questions.map((q, i) => ({
    index: i,
    question_text: q.question_text,
    code_snippet: q.code_snippet,
    options: q.options,
    answer_id: q.answer_id,
    explanation: q.explanation,
  }))
  return `당신은 매우 엄격한 프로그래밍 퀴즈 검수자입니다. 아래 문제들을 하나씩 검토하세요.
각 문제에 대해 다음을 모두 만족하면 valid=true, 하나라도 어긋나면 valid=false 로 판정하세요:
1) 표시된 정답(answer_id)이 기술적으로 정확하다.
2) 정답이 정확히 1개이며, 복수 정답이거나 논란의 여지가 없다.
3) 문제와 보기가 명확하고 오해의 소지가 없다.
4) 해설이 정답을 올바르게 뒷받침한다.

반드시 아래 JSON 배열 형식으로만 응답하세요(다른 텍스트·마크다운 금지):
[{ "index": 0, "valid": true, "reason": "간단한 사유" }]

검토할 문제 목록(JSON):
${JSON.stringify(list)}`
}

// 검증 응답을 boolean[] 로 변환. AI가 명시적으로 valid=true 라고 한 인덱스만 통과(보수적).
export function parseValidation(raw: unknown, count: number): boolean[] {
  const flags = new Array<boolean>(count).fill(false)
  if (!Array.isArray(raw)) throw new Error('validation response is not an array')
  for (const item of raw) {
    const obj = (item ?? {}) as Record<string, unknown>
    const idx = Number(obj.index)
    if (Number.isInteger(idx) && idx >= 0 && idx < count) {
      flags[idx] = obj.valid === true
    }
  }
  return flags
}

// ── 중복 방지 (Phase 8C/8D) ──
// (1) 프롬프트 주입용: 기존 문제 목록을 "이런 건 또 내지 말라"는 회피 지시로 변환.
export function buildAvoidanceNote(existingTexts: string[], max = 40): string {
  const list = existingTexts.filter(Boolean).slice(0, max)
  if (list.length === 0) return ''
  const bullets = list
    .map((t) => `- ${t.replace(/\s+/g, ' ').trim().slice(0, 120)}`)
    .join('\n')
  return `\n\n[중복 회피] 아래는 이미 출제된 문제들입니다. 의미가 중복되거나 사실상 동일한 문제는 절대 출제하지 말고, 새로운 개념·관점·난이도로 출제하세요:\n${bullets}`
}

// 텍스트를 비교용 토큰 집합으로 정규화(소문자·기호 제거·공백 분리).
function dupTokens(s: string): Set<string> {
  return new Set(
    (s || '')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter(Boolean)
  )
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let inter = 0
  for (const x of a) if (b.has(x)) inter++
  return inter / (a.size + b.size - inter)
}

// (2) 생성 결과에서 기존 문제 및 배치 내부와 근접 중복인 항목을 제거.
// threshold(기본 0.82) 이상 유사하면 중복으로 간주. 보수적으로 잡아 정상 신규는 살린다.
export function filterNearDuplicates(
  candidates: NormalizedQuestion[],
  existingTexts: string[],
  threshold = 0.82
): NormalizedQuestion[] {
  const existingSets = existingTexts.filter(Boolean).map(dupTokens)
  const acceptedSets: Set<string>[] = []
  const out: NormalizedQuestion[] = []
  for (const q of candidates) {
    const s = dupTokens(q.question_text)
    const dup =
      existingSets.some((e) => jaccard(s, e) >= threshold) ||
      acceptedSets.some((e) => jaccard(s, e) >= threshold)
    if (!dup) {
      out.push(q)
      acceptedSets.push(s)
    }
  }
  return out
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
