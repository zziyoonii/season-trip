import type { AlertMap, City, Excluded, Result, Taste } from "./types";

export const TASTES: Record<Taste, { name: string; range: string; ideal: [number, number]; ok: [number, number] }> = {
  hot:  { name: "더운 곳",   range: "29~33°", ideal: [29, 33], ok: [26, 35.5] },
  warm: { name: "따뜻한 곳", range: "23~28°", ideal: [23, 28], ok: [20, 30.5] },
  cool: { name: "선선한 곳", range: "15~22°", ideal: [15, 22], ok: [11.5, 25] },
  snow: { name: "눈 오는 곳", range: "영하권", ideal: [-6, 5], ok: [-13, 9] },
};

const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const blend = (arr: number[], w: number[]) => arr.reduce((s, v, i) => s + v * w[i], 0);

/** 기간 → 월별 가중치(그 달에 머무는 날 수 비율). 최대 62일까지 계산 */
export function monthWeights(start: Date, end: Date) {
  const w = Array(12).fill(0);
  let n = 0;
  for (let d = new Date(start); d <= end && n < 62; d.setDate(d.getDate() + 1)) { w[d.getMonth()]++; n++; }
  return { weights: w.map((x) => x / n), days: n };
}

function dayOfYear(d: Date) { return Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 864e5); }
/** 위도·날짜로 계산한 해 떠 있는 시간 */
export function daylight(lat: number, d: Date) {
  const decl = (23.44 * Math.sin((2 * Math.PI * (284 + dayOfYear(d))) / 365) * Math.PI) / 180;
  const c = clamp(-Math.tan((lat * Math.PI) / 180) * Math.tan(decl), -1, 1);
  return (2 * Math.acos(c) * 180) / Math.PI / 15;
}

export interface EvalContext { weights: number[]; mid: Date; taste: Taste; maxFlight: number; alerts: AlertMap; seoulHi: number[] }

export function evaluate(c: City, ctx: EvalContext): Result | Excluded | null {
  const { weights: w, mid, taste, alerts } = ctx;
  if (c.flight > ctx.maxFlight) return null;
  const T = TASTES[taste];
  const hi = blend(c.hi, w), lo = blend(c.lo, w), rain = blend(c.rain, w), day = daylight(c.lat, mid);
  const hum = c.hum ? blend(c.hum, w) : null;
  const out: string[] = [], notes: string[] = [];

  const al = alerts[c.name];
  if (al && al.level >= 3) out.push(al.label ?? `외교부 여행경보 ${al.level}단계(${al.level >= 4 ? "여행금지" : "출국권고"})`);
  if (hi > 36.5) out.push(`낮 ${hi.toFixed(0)}° 폭염`);
  if (hi < T.ok[0]) out.push(`낮 ${hi.toFixed(0)}°, 생각보다 추워요`);
  else if (hi > T.ok[1] && hi <= 36.5) out.push(`낮 ${hi.toFixed(0)}°, 생각보다 더워요`);
  if (taste === "snow") {
    if (lo > -1) out.push(`밤 ${lo.toFixed(0)}°, 아직 눈은 일러요`);
    if (lo < -25) out.push(`밤 ${lo.toFixed(0)}° 혹한`);
    if (rain > 19.5) out.push(`눈비가 한 달에 ${rain.toFixed(0)}일`);
  } else {
    if (day < 8) out.push(`해가 ${day.toFixed(1)}시간뿐`);
    if (rain > 16.5) out.push(`우기, 한 달에 ${rain.toFixed(0)}일 비`);
  }
  let hzPen = 0;
  for (const h of c.hazards) {
    const f = h.months.reduce((s, m) => s + w[m - 1], 0);
    if (f >= 0.5) out.push(h.label);
    else if (f > 0) { hzPen += (18 * f) / 0.5; notes.push(`${h.label} 시기와 일부 겹쳐요`); }
  }
  if (out.length) return { city: c, reasons: out };

  let humPen = 0;
  if (hum !== null && hi >= 28 && hum >= 80) {
    humPen = Math.min(12, (hum - 78) * 1.2) * (taste === "hot" ? 0.4 : 1);
    notes.push(`습도 ${hum.toFixed(0)}%라 체감은 더 더워요`);
  }
  let alertPen = 0;
  if (al && al.level === 2) { alertPen = 10; notes.unshift(`⚠️ 외교부 여행경보 2단계(여행자제) · ${al.note}`); }

  const festivals = c.festivals.filter((f) => f.months.some((m) => w[m - 1] > 0));
  const [a, b] = T.ideal, [oa, ob] = T.ok;
  const center = (a + b) / 2, half = (b - a) / 2;
  const tScore = hi < a ? 0.85 * (1 - (a - hi) / (a - oa)) : hi > b ? 0.85 * (1 - (hi - b) / (ob - b)) : 1 - (0.15 * Math.abs(hi - center)) / half;
  const rScore = taste === "snow" ? clamp(1 - (rain - 8) / 14) : clamp(1 - (rain - 2) / 14);
  const dScore = taste === "snow" ? 1 : clamp((day - 8) / 4);
  const score = 100 * (0.55 * tScore + 0.3 * rScore + 0.15 * dScore) - hzPen - humPen - alertPen + Math.min(10, festivals.length * 5);
  return { city: c, hi, lo, rain, hum, day, score: Math.round(clamp(score, 0, 100)), seoul: hi - blend(ctx.seoulHi, w), weights: w, festivals, notes };
}

export const isResult = (r: Result | Excluded | null): r is Result => !!r && "score" in r;
export const isExcluded = (r: Result | Excluded | null): r is Excluded => !!r && "reasons" in r;

/** 일정 길이에 맞는 비행시간 상한: 왕복 비행이 일정의 1/4을 넘지 않게 */
export const autoFlight = (days: number) => (days <= 4 ? 5 : days <= 7 ? 10 : days <= 10 ? 15 : 25);

export function whyLine(r: Result, taste: Taste) {
  const tp = taste === "hot" ? (r.hi >= 31 ? "한낮엔 바다에 뛰어들고 싶은 더위" : "뜨겁지만 숨 막히진 않는 더위")
    : taste === "warm" ? (r.hi >= 26 ? "반팔 하나면 충분한 날씨" : "반팔에 얇은 겉옷 하나면 되는 날씨")
    : taste === "cool" ? (r.hi >= 19 ? "하루 종일 걸어도 땀 안 나는 날씨" : "트렌치코트 꺼내기 좋은 쌀쌀함")
    : r.lo <= -10 ? "코끝이 찡한 제대로 된 한겨울" : "눈 쌓인 거리를 걷기 좋은 겨울";
  const rp = taste === "snow"
    ? (r.rain >= 12 ? "눈 오는 날이 잦아 설경 보기 좋아요" : "눈 소식이 종종 있어요")
    : r.rain <= 3 ? "비 걱정은 거의 없어요" : r.rain <= 7 ? "가끔 소나기가 지나가는 정도예요" : "비 오는 날이 조금 있으니 우산은 챙기세요";
  return `${tp}에, ${rp}.`;
}
export const seoulDiff = (d: number) => { const v = Math.round(d); return v === 0 ? "±0°" : `${v > 0 ? "+" : ""}${v}°`; };
const hue = (t: number) => 222 - clamp((t + 10) / 48) * 212;
export const tempColor = (t: number) => `hsl(${hue(t)} 72% 48%)`;
