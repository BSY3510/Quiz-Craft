// QuizCraft 도메인 타입 (Phase 0.3에서 검증한 실제 스키마 기준, 2026-06-09)
// Supabase 자동 생성 타입 대신 손으로 작성 — 스키마가 안정적이고 토큰이 불필요.

export type UserRole = 'user' | 'admin'
export type UserStatus = 'pending' | 'approved' | 'rejected' | 'suspended'

// questions.status: 현재 'active'. AI 검증 큐 도입 시 'pending_review' 등 추가(Phase 8).
export type QuestionStatus = 'active' | 'pending_review' | 'archived' | (string & {})
// questions.type: 'multiple-choice'. OX 도입 시 'true-false' 추가(Phase 9).
export type QuestionType = 'multiple-choice' | 'true-false' | (string & {})

// questions.difficulty: 'easy' | 'medium' | 'hard' (Phase 9). 기본 'medium'.
export type Difficulty = 'easy' | 'medium' | 'hard'

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
  // 9-1 월간 목표(이번 달 N문제). null이면 미설정.
  monthly_goal: number | null
  // 1번 즐겨찾기 분야 id 배열. 비어 있으면 전체 노출.
  favorite_categories: string[]
  created_at: string
}

// 9-3 데일리 미션 (get_or_create_today_missions RPC 반환 행)
export interface DailyMissionRow {
  id: string
  kind: 'solve_any' | 'solve_category' | 'solve_type' | 'solve_difficulty' | (string & {})
  param: string | null
  target: number
  reward_xp: number
  claimed: boolean
  progress: number
}

export interface Category {
  id: string
  name: string
  active: boolean
  icon: string | null
  prompt: string | null
  // 사용자에게 보일 한 줄 부제(카드 부제). null이면 미표시.
  description: string | null
  // 출제 시 {{category}} 치환에 쓰는 AI용 정밀 표현(동명이인 구분 등). null이면 name으로 폴백.
  ai_name: string | null
  // 상위 그룹(7번). null이면 미분류(기타).
  group_id: string | null
  created_at: string
}

// 상위 카테고리(그룹) — 7번
export interface CategoryGroup {
  id: string
  name: string
  icon: string | null
  sort_order: number
  created_at: string
}

// 분야 신청 — 4번
export type CategoryRequestStatus = 'pending' | 'approved' | 'rejected' | (string & {})
export interface CategoryRequest {
  id: string
  user_id: string | null
  name: string
  description: string | null
  group_id: string | null
  reason: string | null
  status: CategoryRequestStatus
  admin_note: string | null
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
  difficulty: Difficulty
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
  auto_approve_signup: boolean
  // 가입 허용 이메일 도메인 화이트리스트. 빈 배열이면 제한 없음(모든 도메인 허용).
  allowed_email_domains: string[]
  // 공통(마스터) 프롬프트. {{category}}/{{count}}/{{category_guide}} 치환자 포함.
  system_prompt: string | null
  // 유형별 보조 프롬프트(공통 뒤에 덧붙임). null/빈값이면 객관식은 미적용, OX는 코드 기본값 사용.
  prompt_multiple_choice: string | null
  prompt_true_false: string | null
  // 자동 출제(cron) 난이도 비율(합 100). 예: { easy: 30, medium: 50, hard: 20 }
  auto_generate_difficulty_ratio: { easy: number; medium: number; hard: number }
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
