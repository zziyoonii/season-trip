import { NextResponse } from "next/server";
import { cityAlerts, loadAlertSource } from "@/lib/alerts";

export const revalidate = 86400;

/** 도시별 여행경보(2단계 이상) JSON. 다른 화면이나 앱에서 재사용할 때 */
export async function GET() {
  const src = await loadAlertSource();
  return NextResponse.json({ fetchedAt: src.fetchedAt, live: src.live, cities: cityAlerts(src) });
}
