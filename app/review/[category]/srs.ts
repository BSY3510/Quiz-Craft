// 무상태 Leitner SRS: 본인 attempts 기록만으로 복습 일정을 계산한다(별도 테이블 없음).
// 박스 = 마지막 오답 이후 "연속 정답 수". 박스가 커질수록 복습 간격이 길어진다.

const INTERVALS_DAYS = [0, 1, 3, 7, 14, 30] // box(streak) → 간격(일). 0이면 즉시 복습.
export const GRADUATE_STREAK = 5 // 연속 정답 5회 도달 시 졸업(복습 목록에서 제외)
const DAY_MS = 86_400_000

export interface AttemptLite {
  question_id: string
  is_correct: boolean
  created_at: string
}

export interface SrsCard {
  questionId: string
  box: number // 0~4 (현재 연속 정답 수)
  dueAt: number // epoch ms
  isDue: boolean
}

// attempts(시간 오름차순 정렬 불필요 — 내부에서 정렬)로부터 복습 카드 산출.
// 한 번이라도 틀린 적 있고 아직 졸업하지 않은 문제만 카드가 된다.
export function computeCards(attempts: AttemptLite[], now: number): SrsCard[] {
  const byQ = new Map<string, AttemptLite[]>()
  for (const a of attempts) {
    if (!a.question_id) continue
    const arr = byQ.get(a.question_id)
    if (arr) arr.push(a)
    else byQ.set(a.question_id, [a])
  }

  const cards: SrsCard[] = []
  for (const [qid, list] of byQ) {
    list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    if (!list.some((a) => !a.is_correct)) continue // 한 번도 안 틀림 → 복습 대상 아님

    // 마지막부터 연속 정답 수
    let streak = 0
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i].is_correct) streak++
      else break
    }
    if (streak >= GRADUATE_STREAK) continue // 졸업

    const lastAt = new Date(list[list.length - 1].created_at).getTime()
    const interval = INTERVALS_DAYS[Math.min(streak, INTERVALS_DAYS.length - 1)]
    const dueAt = lastAt + interval * DAY_MS
    cards.push({ questionId: qid, box: streak, dueAt, isDue: now >= dueAt })
  }
  return cards
}
