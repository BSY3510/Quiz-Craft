// 프로젝트 전역 상수 (매직 넘버 집약 — 리팩토링 10-3)
// 서버/클라이언트 양쪽에서 import 가능한 순수 상수만 둔다.

// AI 출제에 사용할 기본 Gemini 모델. site_settings.gemini_model / env 미설정 시 폴백.
export const DEFAULT_GEMINI_MODEL = 'gemini-3.1-flash-lite'

// AI 생성 결과(JSON)가 깨졌을 때 최대 재시도 횟수.
export const GENERATION_MAX_RETRIES = 3

// 퀴즈 한 세션의 문항 수.
export const SESSION_SIZE = 10

// 신규 문제 근접 중복 판정 임계값(Jaccard). 이 값 이상이면 중복으로 간주.
export const DUPLICATE_THRESHOLD = 0.82
