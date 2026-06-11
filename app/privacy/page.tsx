import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '개인정보처리방침 | QuizCraft',
}

// ⚠️ 표준 초안입니다. 운영 주체/연락처는 반영됨. 수집 항목·보유기간·수탁자(Supabase 등)를
//    실제 운영에 맞게 검증하고, 정식 공개 전 법률 전문가의 검토 권장.
export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900 px-4 py-12">
      <article className="mx-auto max-w-2xl bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 sm:p-10">
        <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 mb-2">QuizCraft 개인정보처리방침</h1>
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-8">시행일: 2026년 6월 11일</p>

        <div className="space-y-6 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          <section>
            <h2 className="font-bold text-slate-800 dark:text-slate-100 mb-2">1. 수집하는 개인정보 항목 및 방법</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><b>필수:</b> 이메일 주소, 비밀번호(암호화 저장)</li>
              <li><b>서비스 이용 과정에서 생성:</b> 퀴즈 풀이 기록, 경험치(XP), 연속 학습일, 접속 일시</li>
              <li><b>선택:</b> 닉네임, 마케팅 정보 수신 동의 여부</li>
              <li>수집 방법: 회원가입 및 서비스 이용 과정에서 이용자가 직접 입력하거나 자동으로 생성·수집됩니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-slate-800 dark:text-slate-100 mb-2">2. 개인정보의 수집·이용 목적</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>회원 식별 및 본인 확인, 계정 관리</li>
              <li>퀴즈 학습 기록·통계·리더보드 등 서비스 핵심 기능 제공</li>
              <li>서비스 운영·개선 및 부정 이용 방지</li>
              <li>(선택 동의 시) 이벤트·혜택 등 마케팅 정보 안내</li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-slate-800 dark:text-slate-100 mb-2">3. 보유 및 이용 기간</h2>
            <p>회원 탈퇴 시 지체 없이 파기합니다. 다만 관련 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관합니다.</p>
          </section>

          <section>
            <h2 className="font-bold text-slate-800 dark:text-slate-100 mb-2">4. 개인정보 처리의 위탁</h2>
            <p>서비스는 안정적인 인증 및 데이터 저장을 위해 아래와 같이 처리를 위탁하고 있습니다.</p>
            <ul className="list-disc pl-5 space-y-1 mt-1">
              <li><b>Supabase Inc.</b> — 인증(계정·비밀번호 관리) 및 데이터베이스 호스팅</li>
            </ul>
            <p className="mt-1 text-slate-400 text-xs">※ 실제 사용 중인 수탁자·국외 이전 현황에 맞게 갱신하세요.</p>
          </section>

          <section>
            <h2 className="font-bold text-slate-800 dark:text-slate-100 mb-2">5. 이용자의 권리</h2>
            <p>이용자는 언제든지 본인의 개인정보를 열람·정정·삭제하거나 처리 정지를 요청할 수 있으며, 회원 탈퇴를 통해 동의를 철회할 수 있습니다.</p>
          </section>

          <section>
            <h2 className="font-bold text-slate-800 dark:text-slate-100 mb-2">6. 개인정보의 안전성 확보 조치</h2>
            <p>비밀번호는 복호화가 불가능한 방식으로 암호화하여 저장하며, 데이터 접근 권한 통제 등 합리적인 보호 조치를 적용합니다.</p>
          </section>

          <section>
            <h2 className="font-bold text-slate-800 dark:text-slate-100 mb-2">7. 개인정보 보호책임자 및 문의</h2>
            <p>개인정보 보호책임자: QuizCraft 운영자 / 문의: <a href="mailto:sirohk0513@gmail.com" className="text-blue-600 dark:text-blue-400 hover:underline">sirohk0513@gmail.com</a></p>
          </section>

          <section>
            <h2 className="font-bold text-slate-800 dark:text-slate-100 mb-2">8. 고지의 의무</h2>
            <p>본 방침의 내용 추가·삭제·수정이 있을 경우 시행일 전에 서비스 화면을 통해 공지합니다.</p>
          </section>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-100 dark:border-slate-700 flex gap-4 text-sm">
          <Link href="/terms" className="text-blue-600 dark:text-blue-400 hover:underline">이용약관</Link>
          <Link href="/login" className="text-slate-500 dark:text-slate-400 hover:underline">로그인으로 돌아가기</Link>
        </div>
      </article>
    </main>
  )
}
