import type { Metadata } from "next";
import { Inter } from "next/font/google"; // 폰트 설정 (기존 설정에 맞게 유지)
import "./globals.css";

// ✅ Vercel Analytics 및 Speed Insights 임포트
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "QuizCraft",
  description: "원하는 분야를 퀴즈를 통해 쉽게 배우는 웹서비스",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        {children}
        {/* ✅ 컴포넌트 추가 (UI에는 보이지 않으며 백그라운드에서 동작합니다) */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}