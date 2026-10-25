import { CITY_REGIONS } from "../data/city-regions.ts";
import type { AlertMap } from "./types";

export interface AlarmRow { country_iso_alp2: string; country_nm: string; alarm_lvl: string | number | null; region_ty: string | null; remark: string | null }
export interface SpecialRow { country_iso_alp2: string; country_nm: string; evacuate_region_ty: string | null; evacuate_rcmnd_remark: string | null; forbidden_region_ty: string | null; forbidden_rcmnd_remark: string | null }
export interface AlertSource { fetchedAt: string; alarms: AlarmRow[]; special: SpecialRow[] }

const isDefaultRow = (t: string) => /제외한|이외|그 외|전 ?지역/.test(t);
const hasKey = (t: string, keys: string[] = []) => keys.some((k) => t.includes(k));

/** 외교부 원본 행 → 도시별 경보. 1단계는 표시하지 않으므로 2단계 이상만 담아요 */
export function cityAlerts(src: AlertSource): AlertMap {
  const out: AlertMap = {};
  for (const [city, { iso, keys }] of Object.entries(CITY_REGIONS)) {
    const rows = src.alarms.filter((r) => r.country_iso_alp2 === iso);
    let level = 0, note = "";
    const whole = rows.filter((r) => r.region_ty === "전체");
    const specific = rows.filter((r) => r.region_ty !== "전체" && hasKey(r.remark ?? "", keys));
    const deflt = rows.filter((r) => r.region_ty !== "전체" && isDefaultRow(r.remark ?? ""));
    const pick = whole.length ? whole : specific.length ? specific : deflt;
    for (const r of pick) {
      const l = Number(r.alarm_lvl) || 0;
      if (l > level) { level = l; note = r.region_ty === "전체" ? `${r.country_nm} 전역` : specific.includes(r) ? (r.remark ?? "") : `${r.country_nm} 대부분 지역`; }
    }
    // 특별여행주의보: 해당 지역이면 출국권고(3단계)에 준해서 처리
    for (const s of src.special.filter((r) => r.country_iso_alp2 === iso)) {
      const forb = s.forbidden_rcmnd_remark ?? "", evac = s.evacuate_rcmnd_remark ?? "";
      const hit = (t: string, ty: string | null) => !!t && (ty === "전 지역" || isDefaultRow(t) || hasKey(t, keys));
      const where = (t: string) => (hasKey(t, keys) ? t : t.includes("전 지역") || t === "전지역" ? `${s.country_nm} 전역` : `${s.country_nm} 대부분 지역`);
      if (hit(forb, s.forbidden_region_ty)) { level = 4; out[city] = { level, note: where(forb), label: "외교부 특별여행주의보(여행금지 권고)" }; }
      else if (hit(evac, s.evacuate_region_ty) && level < 4) { out[city] = { level: 3, note: where(evac), label: "외교부 특별여행주의보(여행 취소·연기 권고)" }; }
    }
    if (!out[city] && level >= 2) out[city] = { level, note };
  }
  return out;
}

const API = {
  alarm: "https://apis.data.go.kr/1262000/TravelAlarmService2/getTravelAlarmList2",
  special: "https://apis.data.go.kr/1262000/SptravelWarningServiceV2/getSpTravelWarningListV2",
};

async function fetchAll<T>(url: string, key: string): Promise<T[]> {
  const rows: T[] = [];
  for (let page = 1; page < 10; page++) {
    const q = new URLSearchParams({ serviceKey: key, returnType: "JSON", numOfRows: "300", pageNo: String(page) });
    const res = await fetch(`${url}?${q}`, { next: { revalidate: 60 * 60 * 24 } }); // 하루 한 번만 새로 받아요
    if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
    const data = await res.json();
    const body = data.response?.body ?? data;
    let items = body.items?.item ?? body.items ?? body.data ?? [];
    if (!Array.isArray(items)) items = [items];
    rows.push(...items);
    const total = Number(body.totalCount ?? data.totalCount ?? 0);
    if (!items.length || (total && rows.length >= total)) break;
  }
  return rows;
}

/** 서버에서만 호출. 키가 없거나 실패하면 스냅샷으로 대신해요 */
export async function loadAlertSource(): Promise<AlertSource & { live: boolean }> {
  const key = process.env.DATA_GO_KR_KEY;
  if (key) {
    try {
      const [alarms, specialAll] = await Promise.all([fetchAll<AlarmRow>(API.alarm, key), fetchAll<SpecialRow>(API.special, key)]);
      if (alarms.length) {
        const special = specialAll.filter((r) => r.evacuate_rcmnd_remark || r.forbidden_rcmnd_remark);
        return { fetchedAt: new Date().toISOString(), alarms, special, live: true };
      }
    } catch (e) {
      console.error("[alerts] 공공데이터포털 조회 실패, 스냅샷 사용:", e);
    }
  }
  const snap = (await import("../data/alerts-snapshot.json")).default as AlertSource;
  return { ...snap, live: false };
}
