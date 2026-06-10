# 🎯 QuizCraft (퀴즈크래프트)

> **"원하는 분야를 퀴즈를 통해 쉽게 배우는 웹서비스"**

QuizCraft는 자투리 시간을 활용해 프로그래밍 지식을 부담 없이 점검하고 학습하는 퀴즈 플랫폼입니다. 운영자는 AI(Google Gemini)로 양질의 문제를 적은 비용으로 공급하고, 사용자는 즉각적인 피드백·간격 반복 복습·게이미피케이션으로 약점을 보완합니다.

## ✨ 주요 기능 (Key Features)

### 🧑‍💻 학습자 (User)
* **세션형 퀴즈:** 10문항 단위 세션 → 정답·정답률·획득 XP 결과 요약. 진행률 바와 즉각적인 정오답 피드백·해설.
* **문제 유형·난이도:** 객관식(4지선다)과 **OX(참/거짓)** 유형, 문제별 난이도(쉬움/보통/어려움) 표시.
* **SRS 오답노트:** 틀린 문제를 망각곡선 기반 **간격 반복**(Leitner)으로 다시 풀어 완전히 익힘.
* **북마크 · 도움됨:** 다시 볼 문제 🔖 북마크(분야 필터·정렬), 좋은 문제엔 👍 도움됨 피드백.
* **게이미피케이션:** 경험치(XP)·연속 학습(Streak), **전체/주간 리더보드**, **배지/업적**.
* **학습 통계:** 분야별 정답률·약점 진단.
* **코드 하이라이팅 · 다크모드 · PWA(설치 가능) · 모바일 우선 UI · 온보딩 튜토리얼.**

### 🛠️ 운영자 (Admin)
* **안전한 관리자 센터:** 경로 난독화 + 서버사이드 권한(Role) 검증 + RLS 이중 방어. **KPI 대시보드**(회원/검증 대기/문제/신고).
* **AI 출제 (반자동 + 완전 자동):** Gemini로 분야별 문제 생성. **AI 2차 검증**(독립 호출 교차검증) 통과분만 즉시 노출, 나머지는 **검증 큐**로. 구조 강제(`responseSchema`)·중복 방지(프롬프트 회피 + 근접중복 필터).
* **야간 자동 출제(Cron):** 매일 새벽 자동 생성. 활성화 토글, 분야 선정(자동 로테이션/직접 선택), 분야당 문항 수, **객관식·OX 비율**을 관리자가 설정.
* **운영 도구:** 분야 관리(아이콘 선택), 문제 관리(검색·필터·수정·검증), 가입 승인(Closed Beta), 신고 처리, AI 모델/프롬프트 설정.

## 🛠 기술 스택 (Tech Stack)

* **Framework:** Next.js 16 (App Router) · React 19
* **Language:** TypeScript
* **Styling:** Tailwind CSS v4 (class 기반 다크모드)
* **Database & Auth:** Supabase (PostgreSQL, Row Level Security, SECURITY DEFINER 함수)
* **AI:** Google Generative AI SDK — 기본 `gemini-3.1-flash-lite`(관리자 설정에서 모델 선택)
* **Code Highlighting:** highlight.js
* **Scheduling:** Vercel Cron
* **Deployment:** Vercel

## 🚀 로컬 실행 방법 (Getting Started)

### 1. 클론 및 설치
```bash
git clone https://github.com/본인계정/quizcraft.git
cd quizcraft
npm install
```

### 2. 환경 변수 (`.env.local`)
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
# 야간 cron 자동 출제용(서버 전용 — NEXT_PUBLIC_ 접두어 금지)
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Gemini AI (GEMINI_MODEL_VERSION은 폴백, 실제 모델은 관리자 설정값 우선)
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL_VERSION=gemini-3.1-flash-lite

# 관리자 경로 난독화
ADMIN_PATH_SUFFIX=your_secret_admin_path_suffix
NEXT_PUBLIC_ADMIN_PATH_SUFFIX=your_secret_admin_path_suffix

# Vercel Cron 인증(임의의 긴 랜덤 문자열)
CRON_SECRET=your_random_cron_secret
# (선택) cron 1회 처리량
# CRON_CATEGORIES_PER_RUN=2
# CRON_COUNT_PER_CATEGORY=5
```

### 3. 데이터베이스
Supabase 프로젝트에 RLS 정책·보안 함수·스키마가 필요합니다. 마이그레이션 SQL은 `docs/`(내부 문서, gitignore)에 단계별로 정리되어 있습니다 — `phase-1-migration.sql`(보안 토대) → 난이도·자동출제 컬럼 → `phase-10-reactions.sql`(북마크/좋아요) 순으로 Supabase SQL Editor에서 적용합니다.

### 4. 개발 서버
```bash
npm run dev
```
[http://localhost:3000](http://localhost:3000) 에서 확인.

## 🔒 보안 및 아키텍처 특징
* **서버 권위(Server-authoritative):** 정답 판정·XP 적립·권한 변경은 클라이언트가 아닌 `SECURITY DEFINER` 함수/서버 액션이 결정. 정답 컬럼은 일반 사용자 SELECT 권한을 회수해 노출 차단.
* **RLS 이중 방어:** 서버 액션의 `checkAdmin()` 권한 검증 + Supabase RLS를 함께 유지(앱은 anon key만 사용).
* **XP 파밍 차단:** 문항당 첫 정답에만 XP를 원자적으로 적립.
* **AI 견고화:** 구조 강제(`responseSchema`) + 관대한 JSON 파싱 + 재시도로 잘못된 응답이 DB를 오염시키지 않음. 토큰 소진(429)도 안전하게 안내.

## 🔐 로그인 관련 참고
현재 인증은 **이메일 기반(Supabase Auth)** 입니다. 구글 소셜 로그인은 관리자 사이트 설정에 **토글이 준비**되어 있으며 OAuth 연동은 추후 활성화 예정입니다.
