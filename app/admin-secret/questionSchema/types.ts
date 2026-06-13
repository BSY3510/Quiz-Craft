// 출제 결과 도메인 타입 (questionSchema 모듈 분리 — 리팩토링 10-1)

export type GenQuestionType = 'multiple-choice' | 'true-false'

export type Difficulty = 'easy' | 'medium' | 'hard'
export interface DifficultyRatio { easy: number; medium: number; hard: number }

export interface NormalizedQuestion {
  type: string
  question_text: string
  code_snippet: string | null
  options: { id: string; text: string }[]
  answer_id: string
  explanation: string
  difficulty: Difficulty
}
