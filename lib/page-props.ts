import data from "@/data/cities.json";
import { cityAlerts, loadAlertSource } from "@/lib/alerts";
import type { City } from "@/lib/types";

/** 첫 화면(/)과 연차 화면(/leave)이 같이 쓰는 서버 데이터 */
export async function loadPageProps() {
  const src = await loadAlertSource();
  const alerts = cityAlerts(src);
  const d = new Date(src.fetchedAt);
  const alertDate = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  // 오늘 날짜는 한국 시간 기준
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
  return { today, cities: data.cities as City[], seoulHi: data.seoulHi, alerts, alertDate, alertLive: src.live };
}
