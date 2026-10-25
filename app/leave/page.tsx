import type { Metadata } from "next";
import Planner from "@/components/Planner";
import { loadPageProps } from "@/lib/page-props";

export const revalidate = 86400;

const title = "나가요 · 남은 연차로 가장 길게 쉬기";
const description = "남은 연차만 넣으면, 주말·공휴일을 붙여 가장 길게 쉬는 날짜와 그때 날씨 좋은 해외 여행지를 골라드려요.";
export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/leave" },
  openGraph: {
    title: "연차 남았어? 몰아서 나가요 🔥", description, url: "https://nagayo.vercel.app/leave", siteName: "나가요", locale: "ko_KR", type: "website",
    images: [{ url: "/og-leave.png", width: 1200, height: 630, alt: "연차 8일로 16일 쉬기" }],
  },
  twitter: { card: "summary_large_image", title: "연차 남았어? 몰아서 나가요 🔥", description, images: ["/og-leave.png"] },
};

/** /leave 로 들어오면 🔥 연차 소진 탭이 바로 열려요 (GA에서도 이 주소로 따로 잡혀요) */
export default async function Leave() {
  return <Planner {...await loadPageProps()} initialMode="leave" />;
}
