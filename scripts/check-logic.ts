// 추천 로직 회귀 테스트: npm run check:logic
import data from "../data/cities.json" with { type: "json" };
import snap from "../data/alerts-snapshot.json" with { type: "json" };
import { evaluate, isExcluded, isResult, monthWeights } from "../lib/climate.ts";
import { cityAlerts } from "../lib/alerts.ts";
import { bestWindow, iso } from "../lib/holidays.ts";
import { planLeave } from "../lib/leave.ts";
import type { City, Taste } from "../lib/types.ts";

const alerts = cityAlerts(snap as any);
console.log("2단계 이상:", JSON.stringify(alerts));
const cases: [Taste, string, string][] = [["cool", "2026-10-20", "2026-10-27"], ["warm", "2026-11-07", "2026-11-14"], ["hot", "2026-11-07", "2026-11-14"], ["snow", "2026-12-20", "2026-12-27"], ["cool", "2027-09-11", "2027-09-19"]];
for (const [t, s, e] of cases) {
  const { weights } = monthWeights(new Date(s), new Date(e));
  const all = (data.cities as City[]).map((c) => evaluate(c, { weights, mid: new Date(s), taste: t, maxFlight: 99, alerts, seoulHi: data.seoulHi, start: new Date(s), end: new Date(e) }));
  const ok = all.filter(isResult).sort((a, b) => b.score - a.score);
  const mo = all.find((r) => r && (r as any).city.name === "모스크바");
  console.log(t, s, `${ok.length}곳 →`, ok.slice(0, 6).map((r) => `${r.city.name} ${r.score}`).join(", "), "| 모스크바:", isExcluded(mo!) ? mo.reasons[0] : "추천");
}
const w = bestWindow("2027-09-14", "2027-09-16", 3);
console.log("추석+연차3:", iso(w.start), iso(w.end), w.len, w.used);

// 행사 날짜 매칭: 12/25~1/3 멜버른에 호주 오픈(1월 중후반)이 나오면 안 돼요
{
  const s = new Date(2026, 11, 25), e = new Date(2027, 0, 3);
  const { weights } = monthWeights(s, e);
  const mel = (data.cities as City[]).find((c) => c.name === "멜버른")!;
  const r = evaluate(mel, { weights, mid: s, taste: "warm", maxFlight: 99, alerts, seoulHi: data.seoulHi, start: s, end: e });
  console.log("멜버른 12/25~1/3 행사:", isResult(r) ? r.festivals.map((f) => f.title) : r);
}

// 출근해야 하는 날 제외: 어떤 계획도 그 날을 포함하면 안 되고, 빼기 전과 결과가 달라야 해요
{
  const today = new Date(2026, 10, 6), deadline = new Date(2026, 11, 31);
  const inRange = (w: { start: Date; end: Date }, d: string) => iso(w.start) <= d && d <= iso(w.end);
  const base = planLeave(today, deadline, 4);
  console.log("연차4 기본:", base.map((p) => `${p.kind} ${p.windows.map((w) => `${iso(w.start)}~${iso(w.end)}`).join("/")}`).join(" | "));
  for (const work of [["2026-12-30"], ["2026-12-29", "2026-12-31"], ["2026-12-26"], ["2026-12-28", "2026-12-24"]]) {
    const plans = planLeave(today, deadline, 4, work);
    const bad = plans.filter((p) => p.windows.some((w) => work.some((d) => inRange(w, d))));
    console.log("출근", work.join(","), "→", plans.map((p) => `${p.kind} ${p.windows.map((w) => `${iso(w.start)}~${iso(w.end)}`).join("/")}`).join(" | ") || "(없음)", bad.length ? "❌ 출근일 포함" : "✅");
    if (bad.length) process.exitCode = 1;
  }
}
