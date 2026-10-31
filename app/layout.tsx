import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

// GA4 측정 ID는 공개돼도 되는 값이라 기본값으로 둬요. 로컬 개발(npm run dev)에서는 안 붙여요
// AdSense 게시자 ID(ca-pub-…). 공개값이라 Vercel 환경변수 NEXT_PUBLIC_ADSENSE_CLIENT 에 넣으면 광고 스크립트가 붙어요
const ADS_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
const GA_ID = process.env.NEXT_PUBLIC_GA_ID || (process.env.NODE_ENV === "production" ? "G-HXYXYNVZET" : undefined);

export const metadata: Metadata = {
  title: "나가요 · 휴가는 정했고, 어디 가지?",
  description: "날짜만 넣으면, 그때 날씨 좋은 해외 여행지를 골라드려요. 남은 연차로 가장 길게 쉬는 계획도 짜드려요.",
  metadataBase: new URL("https://nagayo.vercel.app"),
  openGraph: { title: "나가요 ✈️", description: "휴가는 정했고, 어디 가지? 날짜만 넣으면 그때 날씨 좋은 곳으로 나가요.", url: "https://nagayo.vercel.app", siteName: "나가요", locale: "ko_KR", type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "나가요 · 휴가는 정했고, 어디 가지?" }] },
  twitter: { card: "summary_large_image", title: "나가요 ✈️", description: "휴가는 정했고, 어디 가지?", images: ["/og.png"] },
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
        {ADS_CLIENT && <meta name="google-adsense-account" content={ADS_CLIENT} />}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        {ADS_CLIENT && <script async src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADS_CLIENT}`} crossOrigin="anonymous" />}
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
