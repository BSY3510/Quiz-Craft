// XP → 레벨 환산 (9-2). 점증형 곡선: 레벨이 오를수록 다음 레벨까지 필요한 XP가 늘어난다.
// 기존 profiles.xp 를 그대로 재사용하므로 스키마 변경이 없다(파생 계산).
//
// 레벨 L 의 "구간 XP"(L→L+1 에 필요한 양) = 50 + (L-1)*25
//   L1=50, L2=75, L3=100, L4=125 ... 처럼 점점 커진다.

export interface LevelInfo {
  level: number
  title: string
  intoLevel: number   // 현재 레벨 안에서 쌓은 XP
  span: number        // 현재 레벨의 전체 구간 XP (다음 레벨까지 총량)
  toNext: number      // 다음 레벨까지 남은 XP
  progressPct: number // 현재 레벨 진행률 0~100
}

function spanForLevel(level: number): number {
  return 50 + (level - 1) * 25
}

// 레벨대별 칭호
export function titleForLevel(level: number): string {
  if (level >= 50) return '마스터'
  if (level >= 30) return '고수'
  if (level >= 20) return '전문가'
  if (level >= 10) return '숙련자'
  if (level >= 5) return '학습자'
  return '새내기'
}

export function levelFromXp(xp: number): LevelInfo {
  const safeXp = Math.max(0, Math.floor(Number(xp) || 0))
  let level = 1
  let start = 0
  let span = spanForLevel(level)
  // 누적 구간을 넘는 동안 레벨업
  while (safeXp >= start + span) {
    start += span
    level += 1
    span = spanForLevel(level)
  }
  const intoLevel = safeXp - start
  const progressPct = span > 0 ? Math.min(100, Math.round((intoLevel / span) * 100)) : 0
  return {
    level,
    title: titleForLevel(level),
    intoLevel,
    span,
    toNext: span - intoLevel,
    progressPct,
  }
}
