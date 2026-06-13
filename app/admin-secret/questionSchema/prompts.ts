// 생성/검증 프롬프트 빌더 (공통 치환 · 유형 · 난이도 · 검증 · 중복 회피)

import type { Difficulty, DifficultyRatio, NormalizedQuestion } from './types'

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

// OX 전용 기본 지시(관리자가 prompt_true_false 를 비워두면 이 값을 사용).
// 관리자 프롬프트 화면의 'OX' 탭 '기본값 불러오기' 가 채우는 텍스트이기도 하다.
export const DEFAULT_TRUE_FALSE_PROMPT = `[중요·문제 유형 강제] 위 지시 중 보기 개수에 관한 내용은 무시하고, 이번에는 반드시 모든 문제를 OX(참/거짓) 형식으로 출제하세요:
- type: "true-false"
- question_text: 참인지 거짓인지 판별 가능한 단정적 진술문 (질문형·의문문 금지)
- options: 정확히 2개 — [{"id":"O","text":"맞다 (O)"},{"id":"X","text":"틀리다 (X)"}]
- answer_id: "O" 또는 "X" 중 하나
- explanation: 왜 맞거나 틀린지에 대한 근거`

// 출제 유형 지시(공통 프롬프트 뒤에 덧붙임). 관리자가 유형별 프롬프트를 편집할 수 있다.
//  - 객관식: prompt_multiple_choice 가 있으면 덧붙이고, 비우면 미적용(공통 프롬프트가 담당 = 현행).
//  - OX:     prompt_true_false 가 있으면 그 값, 비우면 DEFAULT_TRUE_FALSE_PROMPT 를 강제 적용.
export function buildTypeNote(
  type: string,
  prompts?: { multipleChoice?: string | null; trueFalse?: string | null }
): string {
  if (type === 'true-false') {
    const body = (prompts?.trueFalse ?? '').trim() || DEFAULT_TRUE_FALSE_PROMPT
    return `\n\n${body}`
  }
  const mc = (prompts?.multipleChoice ?? '').trim()
  return mc ? `\n\n${mc}` : ''
}

const DIFFICULTY_LABELS: Record<Difficulty, string> = { easy: '쉬움', medium: '보통', hard: '어려움' }

// 난이도 지시(생성 프롬프트 뒤에 덧붙임). 객관식·OX 공통. 세 가지 모드:
//  - fixed: 모든 문제를 지정 난이도로 강제(2번 — 관리자 난이도 지정 출제).
//  - ratio: 지정 비율로 분포(3번 — cron 난이도 비율). 배치를 쪼개지 않고 프롬프트로 유도.
//  - (없음): 자연 분포(현행 기본).
export function buildDifficultyNote(opts?: { fixed?: Difficulty; ratio?: DifficultyRatio }): string {
  if (opts?.fixed) {
    const d = opts.fixed
    return `\n\n[난이도 지정] 모든 문제를 "${d}"(${DIFFICULTY_LABELS[d]}) 난이도로 출제하세요. 각 문제의 difficulty 필드를 반드시 "${d}"로 설정하세요.`
  }
  if (opts?.ratio) {
    const { easy, medium, hard } = opts.ratio
    return `\n\n[난이도 분포] 생성하는 문제들의 난이도를 대략 easy ${easy}% · medium ${medium}% · hard ${hard}% 비율이 되도록 분포시키세요. 각 문제에 difficulty 필드("easy"/"medium"/"hard")를 실제 난이도에 맞게 반드시 포함하세요.`
  }
  return `\n\n[난이도 부여] 각 문제에 difficulty 필드를 반드시 포함하세요. 문제의 실제 난이도에 맞춰 "easy"(기초·정의), "medium"(응용·이해), "hard"(심화·함정/예외) 중 하나로 정하고, 한쪽에 치우치지 말고 자연스럽게 분포시키세요.`
}

// AI 2차 검증용 프롬프트. 생성된 문제를 별도 AI 호출로 검수한다.
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

// 프롬프트 주입용: 기존 문제 목록을 "이런 건 또 내지 말라"는 회피 지시로 변환.
export function buildAvoidanceNote(existingTexts: string[], max = 40): string {
  const list = existingTexts.filter(Boolean).slice(0, max)
  if (list.length === 0) return ''
  const bullets = list
    .map((t) => `- ${t.replace(/\s+/g, ' ').trim().slice(0, 120)}`)
    .join('\n')
  return `\n\n[중복 회피] 아래는 이미 출제된 문제들입니다. 의미가 중복되거나 사실상 동일한 문제는 절대 출제하지 말고, 새로운 개념·관점·난이도로 출제하세요:\n${bullets}`
}
