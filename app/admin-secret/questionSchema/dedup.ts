// 중복 방지 (Phase 8C/8D) — 생성 결과에서 기존/배치 내부 근접 중복 제거.

import type { NormalizedQuestion } from './types'
import { DUPLICATE_THRESHOLD } from '@/app/lib/constants'

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

// threshold(기본 0.82) 이상 유사하면 중복으로 간주. 보수적으로 잡아 정상 신규는 살린다.
export function filterNearDuplicates(
  candidates: NormalizedQuestion[],
  existingTexts: string[],
  threshold = DUPLICATE_THRESHOLD
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
