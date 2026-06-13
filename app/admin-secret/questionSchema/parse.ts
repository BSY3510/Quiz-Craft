// LLM 응답 파싱 유틸 (느슨한 JSON 추출 + 검증 응답 파서)

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
