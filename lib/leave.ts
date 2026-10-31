import { PUBLIC_HOLIDAYS, addDays, iso } from "./holidays";

/** 연차 소진 계획: 남은 연차를 기한 안에 써서 가장 길게 쉬는 조합 */
/** half: start 날이 "오후 반차"(그날 저녁 출발). len 은 그날까지 센 날짜 수라, 실제로 쉬는 건 len - 0.5일 */
export interface LeaveWindow { start: Date; end: Date; len: number; used: number; half?: boolean }
export interface LeavePlan { kind: "all" | "split" | "short" | "half"; title: string; desc: string; windows: LeaveWindow[] }

const isOff = (d: Date) => d.getDay() === 0 || d.getDay() === 6 || PUBLIC_HOLIDAYS.has(iso(d));
const dayNum = (d: Date) => Math.round(d.getTime() / 864e5);
/** 실제로 쉬는 날 수 (오후 반차 날은 반나절) */
export const rest = (w: LeaveWindow) => w.len - (w.half ? 0.5 : 0);

/**
 * from~deadline 사이에서 연차 cap일 이하로 쓰는 구간 중 가장 좋은 것.
 * - 연차(평일)는 deadline 안에 있어야 하고, 여행은 deadline 뒤 주말·공휴일까지 이어질 수 있어요 (예: 1/1 신정)
 * - 구간은 앞뒤 쉬는 날까지 꽉 채운 형태만 봐요
 */
function bestWindow(from: Date, deadline: Date, cap: number, minUsed: number, avoid: LeaveWindow[] = [], prefer: "long" | "efficient" = "long"): LeaveWindow | null {
  let best: LeaveWindow | null = null;
  const limit = addDays(deadline, 10);
  const clash = (s: Date, e: Date) => avoid.some((w) => !(dayNum(e) < dayNum(w.start) - 1 || dayNum(s) > dayNum(w.end) + 1));
  for (let s = new Date(from); s <= deadline; s = addDays(s, 1)) {
    // 앞쪽 쉬는 날에서 시작하는 구간만 (시작 전날이 쉬는 날이면 더 당길 수 있으니 건너뜀)
    if (isOff(addDays(s, -1)) && addDays(s, -1) >= from) continue;
    let used = 0;
    for (let e = new Date(s); e <= limit; e = addDays(e, 1)) {
      if (!isOff(e)) { if (e > deadline) break; used++; }
      if (used > cap) break;
      if (isOff(addDays(e, 1)) && addDays(e, 1) <= limit) continue; // 뒤쪽 쉬는 날까지 꽉 채운 끝에서만 평가
      let w: LeaveWindow = { start: new Date(s), end: new Date(e), len: dayNum(e) - dayNum(s) + 1, used };
      // 남은 연차가 반나절 이상이면 앞날(평일)에 오후 반차를 붙여 그날 저녁에 떠나요
      const pre = addDays(s, -1);
      if (cap - used >= 0.5 && !isOff(pre) && pre >= from && pre <= deadline) w = { start: pre, end: w.end, len: w.len + 1, used: used + 0.5, half: true };
      if (w.used < minUsed) continue;
      const eff = rest(w);
      if (eff < 2.5 || clash(w.start, w.end)) continue;
      const better = !best ? true
        : prefer === "long" ? (eff > rest(best) || (eff === rest(best) && w.used < best.used))
        : (eff - w.used > rest(best) - best.used || (eff - w.used === rest(best) - best.used && eff > rest(best)));
      if (better) best = w;
    }
  }
  return best;
}

export function planLeave(today: Date, deadline: Date, n: number): LeavePlan[] {
  const from = addDays(today, 7); // 예약할 시간은 있어야 하니 일주일 뒤부터
  const plans: LeavePlan[] = [];
  const days = (w: LeaveWindow) => fmtDays(rest(w));
  const all = bestWindow(from, deadline, n, Math.max(0.5, n - 1), [], "long");
  if (all) plans.push({ kind: "all", title: "몰아쓰기", desc: `연차 ${all.used}일로 ${days(all)} 쉬어요`, windows: [all] });

  if (n >= 2) {
    const a = Math.ceil(n) / 2, b = n - a;
    const w1 = bestWindow(from, deadline, a, 0.5, [], "efficient");
    const w2 = w1 ? bestWindow(from, deadline, b, 0.5, [w1], "efficient") : null;
    if (w1 && w2) {
      const ws = [w1, w2].sort((x, y) => x.start.getTime() - y.start.getTime());
      plans.push({ kind: "split", title: "두 번 나눠 쓰기", desc: `연차 ${w1.used + w2.used}일로 ${fmtDays(rest(w1) + rest(w2))} 쉬어요`, windows: ws });
    }
  }
  // 반차 하나로: 주말·연휴 앞날 오후 반차 쓰고 그날 저녁에 떠나기
  const half = n >= 0.5 ? bestWindow(from, deadline, 0.5, 0.5, [], "long") : null;
  if (half) plans.push({ kind: "half", title: "반차 하나로 떠나기", desc: `${WD[half.start.getDay()]}요일 오후 반차 쓰고 저녁에 출발, ${days(half)} 쉬어요${n - 0.5 > 0 ? ` · 남은 ${n - 0.5}일은 또 쓸 수 있어요` : ""}`, windows: [half] });
  const short = n >= 1 ? bestWindow(from, deadline, 1, 1, [], "efficient") : null;
  if (short) {
    const left = n - short.used;
    plans.push({ kind: "short", title: "짧게 먼저 다녀오기", desc: `연차 ${short.used}일로 ${days(short)}${left > 0 ? `, 남은 ${left}일은 또 쓸 수 있어요` : ""}`, windows: [short] });
  }
  // 같은 구간이 겹치면 하나만
  const seen = new Set<string>();
  return plans.filter((p) => { const k = p.windows.map((w) => iso(w.start) + iso(w.end)).join("|"); if (seen.has(k)) return false; seen.add(k); return true; });
}

const WD = "일월화수목금토";
/** 2.5 → "2일 반", 3 → "3일" */
export function fmtDays(x: number) { return Number.isInteger(x) ? `${x}일` : `${Math.floor(x)}일 반`; }

/** 실제로 연차를 쓰는 날을 묶어서 "12/21~24, 12/28~31" 처럼 */
export function leaveRanges(w: LeaveWindow): string {
  const days: Date[] = [];
  for (let d = w.half ? addDays(w.start, 1) : new Date(w.start); d <= w.end; d = addDays(d, 1)) if (!isOff(d)) days.push(new Date(d));
  const runs: [Date, Date][] = [];
  for (const d of days) {
    const last = runs[runs.length - 1];
    // 사이에 쉬는 날만 끼어 있으면(예: 주말) 다른 묶음으로 나눠요 — 하루 차이일 때만 이어 붙임
    if (last && dayNum(d) - dayNum(last[1]) === 1) last[1] = d; else runs.push([d, d]);
  }
  const md = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
  const full = runs.map(([a, b]) => a.getTime() === b.getTime() ? md(a) : a.getMonth() === b.getMonth() ? `${md(a)}~${b.getDate()}` : `${md(a)}~${md(b)}`);
  return [w.half ? `${md(w.start)}\u00a0오후\u00a0반차` : "", ...full].filter(Boolean).join(", ");
}

/**
 * 연휴 피크 힌트 (항공권 가격 데이터 없이 경험칙으로).
 * - 연휴(공휴일이 낀 3일 이상 쉬는 날 묶음) 전날 출발 = 출국 피크 → 연휴 첫날 출발 권유 (연차도 아낌)
 * - 연휴 마지막 날 귀국 = 귀국 피크 → 하루 일찍 귀국 권유
 */
export interface PeakHint { text: string; window: LeaveWindow }
function holidayBlock(d: Date): { start: Date; end: Date } | null {
  if (!isOff(d)) return null;
  let s = new Date(d), e = new Date(d);
  while (isOff(addDays(s, -1))) s = addDays(s, -1);
  while (isOff(addDays(e, 1))) e = addDays(e, 1);
  let hol = false;
  for (let x = new Date(s); x <= e; x = addDays(x, 1)) if (PUBLIC_HOLIDAYS.has(iso(x))) hol = true;
  return hol && dayNum(e) - dayNum(s) >= 2 ? { start: s, end: e } : null;
}
function rebuild(start: Date, end: Date): LeaveWindow {
  let used = 0;
  for (let d = new Date(start); d <= end; d = addDays(d, 1)) if (!isOff(d)) used++;
  return { start, end, len: dayNum(end) - dayNum(start) + 1, used };
}
const mdw = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}(${WD[d.getDay()]})`;
export function peakHint(w: LeaveWindow): PeakHint | null {
  // 출발: 연휴 바로 전날이면 연휴 첫날로
  const next = holidayBlock(addDays(w.start, 1));
  if (!isOff(w.start) && next && dayNum(next.start) === dayNum(w.start) + 1) {
    const nw = rebuild(next.start, w.end);
    if (rest(nw) >= 2) {
      const saved = w.used - nw.used;
      return { text: `${mdw(next.start)} 당일 출발하면 덜 붐벼요${saved > 0 ? ` · ${saved === 0.5 ? "반차" : `연차 ${saved}일`} 아껴요` : ""}`, window: nw };
    }
  }
  // 귀국: 연휴 마지막 날이면 하루 일찍
  const blk = holidayBlock(w.end);
  if (blk && dayNum(blk.end) === dayNum(w.end) && dayNum(w.end) - dayNum(w.start) >= 3) {
    const nw = { ...w, end: addDays(w.end, -1), len: w.len - 1 };
    return { text: `하루 일찍 ${mdw(nw.end)} 귀국하면 덜 붐벼요`, window: nw };
  }
  return null;
}
