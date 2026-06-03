# 🎯 QuizCraft (퀴즈크래프트)

> **"원하는 분야를 퀴즈를 통해 쉽게 배우는 웹서비스"**

QuizCraft는 자투리 시간을 활용하여 프로그래밍 지식을 부담 없이 점검하고 학습할 수 있는 학습용 퀴즈 플랫폼입니다. 운영자는 AI(Gemini)의 힘을 빌려 양질의 문제를 적은 비용으로 무한히 공급할 수 있으며, 사용자는 즉각적인 피드백과 오답 노트를 통해 자신의 약점을 보완할 수 있습니다.

## ✨ 주요 기능 (Key Features)

### 🧑‍💻 학습자 (User)
* **간편한 인증:** Supabase Auth를 활용한 안전한 Google 소셜 및 이메일 로그인 지원
* **모바일 우선 퀴즈 풀이:** 자투리 시간에 최적화된 깔끔한 UI와 즉각적인 정오답 피드백
* **학습 통계 및 오답 노트:** 분야별 정답률 확인 및 내가 틀린 문제만 모아보는 복습 기능
* **게이미피케이션:** 경험치(XP) 차등 획득 및 연속 학습(Streak)에 따른 리더보드(명예의 전당) 시스템

### 🛠️ 운영자 (Admin)
* **안전한 관리자 센터:** 경로 난독화 및 완벽한 서버사이드 권한(Role) 검증으로 철저한 보안 유지
* **AI 자동 출제 파이프라인:** Google Gemini 2.5 Flash 모델을 연동하여 분야별 퀴즈를 AI가 자동 생성 및 정합성 검증
* **효율적인 운영 대시보드:** 활성/비활성 분야 관리, 사용자 가입 승인(Closed Beta), 접수된 문제 오류 신고 및 정정 처리

## 🛠 기술 스택 (Tech Stack)

* **Framework:** Next.js 15 (App Router)
* **Language:** TypeScript
* **Styling:** Tailwind CSS
* **Database & Auth:** Supabase (PostgreSQL, Row Level Security 적용)
* **AI Integration:** Google Gen AI SDK (Gemini 2.5 Flash)
* **Deployment:** Vercel

## 🚀 로컬 실행 방법 (Getting Started)

### 1. 저장소 클론 및 패키지 설치
\`\`\`bash
git clone https://github.com/본인계정/quizcraft.git
cd quizcraft
npm install
\`\`\`

### 2. 환경 변수 설정
루트 디렉토리에 \`.env.local\` 파일을 생성하고 아래의 키값을 채워주세요. (보안상 실제 키는 GitHub에 올리지 않습니다.)

\`\`\`env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Gemini AI Configuration
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL_VERSION=gemini-2.5-flash

# Security Configuration
ADMIN_PATH_SUFFIX=your_secret_admin_path_suffix
NEXT_PUBLIC_ADMIN_PATH_SUFFIX=your_secret_admin_path_suffix
\`\`\`

### 3. 개발 서버 실행
\`\`\`bash
npm run dev
\`\`\`
브라우저에서 [http://localhost:3000](http://localhost:3000)으로 접속하여 서비스를 확인할 수 있습니다.

## 🔒 보안 및 아키텍처 특징
* **RLS (Row Level Security):** Supabase의 RLS 정책을 통해 사용자는 자신의 학습 데이터만 조회/수정할 수 있으며, 관리자 데이터는 철저히 격리됩니다.
* **Graceful Degradation:** AI 토큰 소진 시 429 에러를 안전하게 낚아채어 서버 다운 없이 관리자에게 명확한 안내를 제공합니다.