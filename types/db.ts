// QuizCraft 도메인 타입 (Phase 0.3에서 검증한 실제 스키마 기준, 2026-06-09)
// Supabase 자동 생성 타입 대신 손으로 작성 — 스키마가 안정적이고 토큰이 불필요.

export type UserRole = 'user' | 'admin'
export type UserStatus = 'pending' | 'approved' | 'rejected' | 'suspended'

// questions.status: 현재 'active'. AI 검증 큐 도입 시 'pending_review' 등 추가(Phase 8).
export type QuestionStatus = 'active' | 'pending_review' | 'archived' | (string & {})
// questions.type: 'multiple-choice'. OX 도입 시 'true-false' 추가(Phase 9).
export type QuestionType = 'multiple-choice' | 'true-false' | (string & {})

// reports.status
export type ReportStatus = 'pending' | 'resolved' | 'dismissed' | (string & {})

export interface QuestionOption {
  id: string
  text: string
}

export interface Profile {
  id: string
  email: string
  role: UserRole
  status: UserStatus
  nickname: string | null
  xp: number
  current_streak: number
  last_active_date: string | null
  created_at: string
}

export interface Category {
  id: string
  name: string
  active: boolean
  icon: string | null
  prompt: string | null
  created_at: string
}

export interface Question {
  id: string
  category_id: string | null
  type: QuestionType
  question_text: string
  code_snippet: string | null
  options: QuestionOption[]
  answer_id: string
  explanation: string
  status: QuestionStatus
  created_at: string
}

export interface Attempt {
  id: string
  user_id: string | null
  question_id: string | null
  selected_option_id: string
  is_correct: boolean
  xp_awarded: number
  created_at: string
}

export interface Report {
  id: string
  user_id: string | null
  question_id: string | null
  reason: string
  status: ReportStatus
  created_at: string
}

export interface SiteSettings {
  id: number
  google_login_enabled: boolean
  system_prompt: string | null
  gemini_model: string
}

// 리더보드 RPC(get_leaderboard / get_weekly_leaderboard) 반환 행
export interface LeaderboardRow {
  rank: number
  masked_name: string
  xp: number
  current_streak: number
}
export interface WeeklyLeaderboardRow {
  rank: number
  masked_name: string
  weekly_xp: number
}

// 관리자 대시보드 문제 목록(get_questions_admin) 반환 행
export interface AdminQuestionRow extends Question {
  total_attempts: number
  correct_attempts: number
}

// 채점 RPC(grade_and_award) 반환
export interface GradeResult {
  is_correct: boolean
  answer_id: string
  explanation: string
  xp_awarded: number
}
