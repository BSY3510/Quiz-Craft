import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google"; // 폰트 설정 (기존 설정에 맞게 유지)
import "./globals.css";

// ✅ Vercel Analytics 및 Speed Insights 임포트
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ToastProvider } from "./components/Toast";
import { ConfirmProvider } from "./components/Confirm";

const inter = Inter({ subsets: ["latin"] });

const title = "QuizCraft";
const description = "원하는 분야를 퀴즈를 통해 쉽게 배우는 웹서비스";

export const metadata: Metadata = {
  title,
  description,
  applicationName: title,
  appleWebApp: { capable: true, title, statusBarStyle: "default" },
  openGraph: { title, description, siteName: title, type: "website", locale: "ko_KR" },
  twitter: { card: "summary", title, description },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

// 플래시(FOUC) 방지: 페인트 전에 저장된 테마/시스템 설정으로 .dark 클래스를 적용
const themeScript = `(function(){try{var t=localStorage.getItem('theme')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme:dark)').matches);if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={inter.className}>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <ToastProvider>
          <ConfirmProvider>
            {children}
          </ConfirmProvider>
        </ToastProvider>
        {/* ✅ 컴포넌트 추가 (UI에는 보이지 않으며 백그라운드에서 동작합니다) */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}