import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "제철 여행지",
  description: "여행 기간과 원하는 날씨를 고르면, 그때 딱 제철인 해외 여행지를 찾아드려요.",
  openGraph: { title: "제철 여행지", description: "너의 휴가엔 어디가 제철일까?", locale: "ko_KR", type: "website" },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#F1F3F7" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;800;900&display=swap" />
      </head>
      <body>{children}</body>
    </html>
  );
}
