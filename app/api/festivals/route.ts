import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import data from "@/data/cities.json";
import { findFestivals, inTrip } from "@/lib/festivals";

const pad = (n: number) => String(n).padStart(2, "0");
const lastDay = (y: number, m: number) => new Date(y, m, 0).getDate();

// 도시 × (시작 월 ~ 끝 월) 단위로 일주일 캐시 → 같은 "11월 홍콩"은 한 번만 검색
const cached = unstable_cache(
  async (city: string, country: string, from: string, to: string) => findFestivals(city, country, from, to),
  ["festivals-v3"], // v3: 한국어·날짜(start/end) 형식으로 바뀌어서 버전 올림
  { revalidate: 60 * 60 * 24 * 7 },
);

export async function GET(req: Request) {
  const u = new URL(req.url);
  const name = u.searchParams.get("city") ?? "";
  const start = u.searchParams.get("start") ?? "";
  const end = u.searchParams.get("end") ?? "";
  const city = data.cities.find((c) => c.name === name);
  if (!city || !/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
    return NextResponse.json({ error: "도시나 날짜가 올바르지 않아요" }, { status: 400 });
  }
  const [sy, sm] = start.split("-").map(Number), [ey, em] = end.split("-").map(Number);
  const from = `${sy}-${pad(sm)}-01`, to = `${ey}-${pad(em)}-${pad(lastDay(ey, em))}`;
  // 키가 없으면 캐시에 넣지 않고 바로 알려줘요 (나중에 키를 넣었을 때 빈 결과가 남아 있지 않게)
  if (!process.env.GEMINI_API_KEY) {
    console.warn("[festivals] GEMINI_API_KEY 가 없어서 대표 행사만 보여줘요");
    return NextResponse.json({ live: false, reason: "no_key" });
  }
  try {
    const ans = await cached(city.name, city.country, from, to);
    if (!ans) return NextResponse.json({ live: false, reason: "no_key" });
    // 검색 없이 기억으로 답한 건 날짜를 믿기 어려워서 대표 행사로 대신해요
    if (!ans.grounded) return NextResponse.json({ live: false, reason: "ungrounded", model: ans.model });
    // 캐시는 한 달 단위라, 실제 여행 날짜와 겹치는 것만 다시 골라요
    const items = inTrip(ans.items, start, end);
    if (!items.length) console.info(`[festivals] ${city.name} ${start}~${end}: 검색은 됐지만 여행 기간과 겹치는 행사 없음 (월 전체 ${ans.items.length}개)`);
    return NextResponse.json({ live: true, reason: items.length ? "ok" : "empty", from, to, ...ans, items });
  } catch (e) {
    console.error("[festivals] Gemini 호출 실패:", e);
    return NextResponse.json({ live: false, reason: "error", error: String(e).slice(0, 300) });
  }
}
