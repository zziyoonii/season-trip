import { PUBLIC_HOLIDAYS, addDays, iso } from "./holidays";

/** 연차 소진 계획: 남은 연차를 기한 안에 써서 가장 길게 쉬는 조합 */
export interface LeaveWindow { start: Date; end: Date; len: number; used: number }
export interface LeavePlan { kind: "all" | "split" | "short"; title: string; desc: string; windows: LeaveWindow[] }

const isOff = (d: Date) => d.getDay() === 0 || d.getDay() === 6 || PUBLIC_HOLIDAYS.has(iso(d));
const dayNum = (d: Date) => Math.round(d.getTime() / 864e5);

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
      if (used < minUsed) continue;
      const len = dayNum(e) - dayNum(s) + 1;
      if (len < 3 || clash(s, e)) continue;
      const w = { start: new Date(s), end: new Date(e), len, used };
      const better = !best ? true
        : prefer === "long" ? (len > best.len || (len === best.len && used < best.used))
        : (len - used > best.len - best.used || (len - used === best.len - best.used && len > best.len));
      if (better) best = w;
    }
  }
  return best;
}

export function planLeave(today: Date, deadline: Date, n: number): LeavePlan[] {
  const from = addDays(today, 7); // 예약할 시간은 있어야 하니 일주일 뒤부터
  const plans: LeavePlan[] = [];
  const all = bestWindow(from, deadline, n, Math.max(1, n - 1), [], "long");
  if (all) plans.push({ kind: "all", title: "몰아쓰기", desc: `연차 ${all.used}일로 ${all.len}일 쉬어요`, windows: [all] });

  if (n >= 2) {
    const a = Math.ceil(n / 2), b = n - a;
    const w1 = bestWindow(from, deadline, a, 1, [], "efficient");
    const w2 = w1 ? bestWindow(from, deadline, b, 1, [w1], "efficient") : null;
    if (w1 && w2) {
      const ws = [w1, w2].sort((x, y) => x.start.getTime() - y.start.getTime());
      plans.push({ kind: "split", title: "두 번 나눠 쓰기", desc: `연차 ${w1.used + w2.used}일로 ${w1.len + w2.len}일 쉬어요`, windows: ws });
    }
  }
  const short = bestWindow(from, deadline, 1, 1, [], "efficient");
  if (short && n >= 1) {
    const left = n - short.used;
    plans.push({ kind: "short", title: "짧게 먼저 다녀오기", desc: `연차 ${short.used}일로 ${short.len}일${left > 0 ? `, 남은 ${left}일은 또 쓸 수 있어요` : ""}`, windows: [short] });
  }
  // 같은 구간이 겹치면 하나만
  const seen = new Set<string>();
  return plans.filter((p) => { const k = p.windows.map((w) => iso(w.start) + iso(w.end)).join("|"); if (seen.has(k)) return false; seen.add(k); return true; });
}
