import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import data from "@/data/cities.json";
import { findFestivals } from "@/lib/festivals";

const pad = (n: number) => String(n).padStart(2, "0");
const lastDay = (y: number, m: number) => new Date(y, m, 0).getDate();

// 도시 × (시작 월 ~ 끝 월) 단위로 일주일 캐시 → 같은 "11월 홍콩"은 한 번만 검색
const cached = unstable_cache(
  async (city: string, country: string, from: string, to: string) => findFestivals(city, country, from, to),
  ["festivals-v1"],
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
  try {
    const ans = await cached(city.name, city.country, from, to);
    if (!ans) return NextResponse.json({ live: false });
    return NextResponse.json({ live: true, from, to, ...ans });
  } catch (e) {
    console.error("[festivals]", e);
    return NextResponse.json({ live: false, error: "행사 검색에 실패했어요" });
  }
}
