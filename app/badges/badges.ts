// 배지/업적 정의 + 진척 계산 (파생형: 기존 통계에서 계산, 별도 테이블 없음)

export interface BadgeStats {
  xp: number
  streak: number
  totalSolved: number
  totalCorrect: number
  accuracy: number // 0~100
  categoriesPlayed: number
  maxCategoryCorrect: number
}

export interface BadgeDef {
  key: string
  icon: string
  title: string
  desc: string
  target: number
  unit: string
  value: (s: BadgeStats) => number
}

// 카테고리 순서대로 표시. 같은 계열은 난이도 오름차순.
export const BADGES: BadgeDef[] = [
  { key: 'first-correct', icon: '🎯', title: '첫걸음', desc: '첫 문제를 맞혔어요', target: 1, unit: '개', value: (s) => s.totalCorrect },
  { key: 'correct-10', icon: '✅', title: '워밍업', desc: '정답 10개 달성', target: 10, unit: '개', value: (s) => s.totalCorrect },
  { key: 'correct-50', icon: '🏅', title: '꾸준함', desc: '정답 50개 달성', target: 50, unit: '개', value: (s) => s.totalCorrect },
  { key: 'correct-100', icon: '🏆', title: '백전백승', desc: '정답 100개 달성', target: 100, unit: '개', value: (s) => s.totalCorrect },

  { key: 'streak-3', icon: '🔥', title: '불씨', desc: '3일 연속 학습', target: 3, unit: '일', value: (s) => s.streak },
  { key: 'streak-7', icon: '🔥', title: '열정', desc: '7일 연속 학습', target: 7, unit: '일', value: (s) => s.streak },
  { key: 'streak-30', icon: '🔥', title: '화신', desc: '30일 연속 학습', target: 30, unit: '일', value: (s) => s.streak },

  { key: 'xp-100', icon: '⭐', title: '새내기', desc: '100 XP 달성', target: 100, unit: 'XP', value: (s) => s.xp },
  { key: 'xp-500', icon: '🌟', title: '숙련가', desc: '500 XP 달성', target: 500, unit: 'XP', value: (s) => s.xp },
  { key: 'xp-2000', icon: '💫', title: '고수', desc: '2000 XP 달성', target: 2000, unit: 'XP', value: (s) => s.xp },

  { key: 'explorer-3', icon: '🧭', title: '탐험가', desc: '서로 다른 3개 분야 도전', target: 3, unit: '분야', value: (s) => s.categoriesPlayed },
  { key: 'master-30', icon: '👑', title: '분야 정복자', desc: '한 분야에서 정답 30개', target: 30, unit: '개', value: (s) => s.maxCategoryCorrect },
  { key: 'sharp-80', icon: '🎓', title: '명사수', desc: '20문제 이상 풀고 정확도 80%', target: 80, unit: '%', value: (s) => (s.totalSolved >= 20 ? s.accuracy : 0) },
]

export interface BadgeProgress {
  value: number
  earned: boolean
  pct: number
}

export function badgeProgress(b: BadgeDef, s: BadgeStats): BadgeProgress {
  const value = b.value(s)
  const earned = value >= b.target
  const pct = b.target > 0 ? Math.min(100, Math.round((value / b.target) * 100)) : 0
  return { value, earned, pct }
}
