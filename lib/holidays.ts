/** 한국 공휴일·대체공휴일 (2026-27). 매년 특일 정보 API로 갱신 예정 */
export const PUBLIC_HOLIDAYS = new Set([
  "2026-12-25", "2027-01-01", "2027-02-06", "2027-02-07", "2027-02-08", "2027-02-09", "2027-03-01",
  "2027-05-01", "2027-05-03", "2027-05-05", "2027-05-13", "2027-06-06", "2027-07-17", "2027-07-19",
  "2027-08-15", "2027-08-16", "2027-09-14", "2027-09-15", "2027-09-16", "2027-10-03", "2027-10-04",
  "2027-10-09", "2027-10-11", "2027-12-25", "2027-12-27",
]);
export const HOLIDAYS: [string, string, string][] = [
  ["크리스마스", "2026-12-25", "2026-12-27"], ["신정", "2027-01-01", "2027-01-03"],
  ["설 연휴", "2027-02-06", "2027-02-09"], ["3·1절", "2027-02-27", "2027-03-01"],
  ["노동절", "2027-05-01", "2027-05-03"], ["어린이날", "2027-05-05", "2027-05-05"],
  ["부처님오신날", "2027-05-13", "2027-05-13"], ["제헌절", "2027-07-17", "2027-07-19"],
  ["광복절", "2027-08-14", "2027-08-16"], ["추석 연휴", "2027-09-14", "2027-09-16"],
  ["개천절", "2027-10-02", "2027-10-04"], ["한글날", "2027-10-09", "2027-10-11"],
  ["크리스마스", "2027-12-25", "2027-12-27"],
];

export const parseDate = (t: string) => { const [y, m, d] = t.split("-").map(Number); return new Date(y, m - 1, d); };
export const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const isOff = (d: Date) => d.getDay() === 0 || d.getDay() === 6 || PUBLIC_HOLIDAYS.has(iso(d));
const daysBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 864e5) + 1;

/** 연차 n일 안에서 (쉬는 날 − 쓴 연차)가 가장 큰 구간. 같으면 연차를 덜 쓰는 쪽 */
export function bestWindow(a: string, b: string, n: number) {
  const A = parseDate(a), B = parseDate(b), base = daysBetween(A, B);
  let best = { start: A, end: B, len: base, used: 0 };
  for (let x = 0; x <= 12; x++) for (let y = 0; y <= 12; y++) {
    const s = addDays(A, -x), e = addDays(B, y);
    let used = 0;
    for (let d = new Date(s); d <= e; d = addDays(d, 1)) if (!isOff(d)) used++;
    if (used > n) continue;
    const len = base + x + y;
    if (len - used > best.len - best.used || (len - used === best.len - best.used && used < best.used)) best = { start: s, end: e, len, used };
  }
  return best;
}

export interface HolidayOption { names: string[]; start: Date; end: Date; len: number; used: number }

export function holidayOptions(today: Date, leaveOn: boolean, leaveDays: number): HolidayOption[] {
  const list = HOLIDAYS.filter((h) => parseDate(h[2]) >= today).map(([name, a, b]) => {
    if (!leaveOn) return { names: [name], start: parseDate(a), end: parseDate(b), len: daysBetween(parseDate(a), parseDate(b)), used: 0 };
    const w = bestWindow(a, b, leaveDays);
    return { names: [name], ...w };
  }).filter((o) => o.start >= today);
  const merged = new Map<string, HolidayOption>();
  for (const o of list) {
    const k = iso(o.start) + iso(o.end);
    const prev = merged.get(k);
    if (prev) o.names.forEach((n) => { if (!prev.names.includes(n)) prev.names.push(n); });
    else merged.set(k, o);
  }
  return [...merged.values()];
}
