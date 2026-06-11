import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '이용약관 | QuizCraft',
}

// ⚠️ 표준 초안입니다. 운영 주체/연락처는 반영됨. 정식 공개 전 법률 전문가의 검토 권장.
export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900 px-4 py-12">
      <article className="mx-auto max-w-2xl bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 sm:p-10">
        <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 mb-2">QuizCraft 이용약관</h1>
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-8">시행일: 2026년 6월 11일</p>

        <div className="space-y-6 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          <section>
            <h2 className="font-bold text-slate-800 dark:text-slate-100 mb-2">제1조 (목적)</h2>
            <p>본 약관은 QuizCraft(이하 “서비스”)가 제공하는 학습용 퀴즈 및 관련 제반 서비스의 이용과 관련하여 서비스와 이용자 간의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.</p>
          </section>

          <section>
            <h2 className="font-bold text-slate-800 dark:text-slate-100 mb-2">제2조 (정의)</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>“이용자”란 본 약관에 따라 서비스에 가입하여 서비스를 이용하는 회원을 말합니다.</li>
              <li>“계정”이란 이용자 식별과 서비스 이용을 위해 이용자가 등록한 이메일 및 비밀번호 등의 정보를 말합니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-slate-800 dark:text-slate-100 mb-2">제3조 (약관의 효력 및 변경)</h2>
            <p>본 약관은 서비스 화면에 게시함으로써 효력이 발생합니다. 서비스는 관련 법령을 위반하지 않는 범위에서 약관을 변경할 수 있으며, 변경 시 적용일자 및 변경사유를 명시하여 사전에 공지합니다.</p>
          </section>

          <section>
            <h2 className="font-bold text-slate-800 dark:text-slate-100 mb-2">제4조 (회원가입 및 이용)</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>이용자는 본 약관 및 개인정보 수집·이용에 동의하고 가입을 신청합니다.</li>
              <li>본 서비스는 만 14세 이상인 자만 가입할 수 있습니다.</li>
              <li>서비스는 운영 정책에 따라 가입 신청에 대한 승인을 보류하거나 거부할 수 있습니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-slate-800 dark:text-slate-100 mb-2">제5조 (이용자의 의무)</h2>
            <p>이용자는 계정 정보를 안전하게 관리할 책임이 있으며, 타인의 권리를 침해하거나 법령·약관에 위반되는 행위를 하여서는 안 됩니다.</p>
          </section>

          <section>
            <h2 className="font-bold text-slate-800 dark:text-slate-100 mb-2">제6조 (서비스의 제공 및 변경·중단)</h2>
            <p>서비스는 안정적인 제공을 위해 노력하나, 운영상·기술상 필요에 따라 서비스의 전부 또는 일부를 변경하거나 중단할 수 있습니다.</p>
          </section>

          <section>
            <h2 className="font-bold text-slate-800 dark:text-slate-100 mb-2">제7조 (계약 해지 및 탈퇴)</h2>
            <p>이용자는 언제든지 탈퇴를 요청할 수 있으며, 서비스는 관련 법령에 따른 보존 의무가 있는 경우를 제외하고 지체 없이 이용자의 정보를 파기합니다.</p>
          </section>

          <section>
            <h2 className="font-bold text-slate-800 dark:text-slate-100 mb-2">제8조 (면책)</h2>
            <p>본 서비스에서 제공하는 퀴즈·해설 등의 학습 콘텐츠는 정확성을 보장하지 않으며, 이를 신뢰하여 발생한 결과에 대한 책임은 이용자에게 있습니다.</p>
          </section>

          <section>
            <h2 className="font-bold text-slate-800 dark:text-slate-100 mb-2">제9조 (문의처)</h2>
            <p>본 약관과 관련한 문의는 QuizCraft 운영자(<a href="mailto:sirohk0513@gmail.com" className="text-blue-600 dark:text-blue-400 hover:underline">sirohk0513@gmail.com</a>)로 연락하실 수 있습니다.</p>
          </section>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-100 dark:border-slate-700 flex gap-4 text-sm">
          <Link href="/privacy" className="text-blue-600 dark:text-blue-400 hover:underline">개인정보처리방침</Link>
          <Link href="/login" className="text-slate-500 dark:text-slate-400 hover:underline">로그인으로 돌아가기</Link>
        </div>
      </article>
    </main>
  )
}
