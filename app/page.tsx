import data from "@/data/cities.json";
import Planner from "@/components/Planner";
import { cityAlerts, loadAlertSource } from "@/lib/alerts";
import type { City } from "@/lib/types";

// 여행경보는 서버에서 받아 하루 동안 캐시해요
export const revalidate = 86400;

export default async function Home() {
  const src = await loadAlertSource();
  const alerts = cityAlerts(src);
  const d = new Date(src.fetchedAt);
  const alertDate = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  // 오늘 날짜는 한국 시간 기준
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
  return <Planner today={today} cities={data.cities as City[]} seoulHi={data.seoulHi} alerts={alerts} alertDate={alertDate} alertLive={src.live} />;
}
