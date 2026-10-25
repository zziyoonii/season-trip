import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

// GA4 측정 ID는 공개돼도 되는 값이라 기본값으로 둬요. 로컬 개발(npm run dev)에서는 안 붙여요
const GA_ID = process.env.NEXT_PUBLIC_GA_ID || (process.env.NODE_ENV === "production" ? "G-HXYXYNVZET" : undefined);

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
      <body>
        {children}
        {GA_ID && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
            <Script id="ga" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');`}</Script>
          </>
        )}
      </body>
    </html>
  );
}
