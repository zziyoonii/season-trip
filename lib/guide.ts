import data from "@/data/cities.json";
import { TASTES, evaluate, isResult, isShoulder, whyLine } from "@/lib/climate";
import type { AlertMap, City, Result, Taste } from "@/lib/types";

/** 월별 가이드: 그 달 한 달 동안 취향별로 날씨가 좋은 곳 (기후 평년값 기준) */
export interface GuidePick { r: Result; why: string; shoulder: "before" | "after" | null; festivals: string[] }
export interface GuideSection { taste: Taste; name: string; range: string; picks: GuidePick[] }

const cities = data.cities as City[];
export const SEOUL_HI: number[] = data.seoulHi;

export function monthGuide(month: number, year: number, alerts: AlertMap): GuideSection[] {
  const m = month - 1;
  const weights = Array(12).fill(0); weights[m] = 1;
  const start = new Date(year, m, 1), end = new Date(year, m + 1, 0);
  return (Object.keys(TASTES) as Taste[]).map((taste) => {
    const picks = cities
      .map((c) => evaluate(c, { weights, mid: new Date(year, m, 15), taste, maxFlight: 99, alerts, seoulHi: SEOUL_HI, start, end }))
      .filter(isResult).sort((a, b) => b.score - a.score).slice(0, 5)
      .map((r) => ({ r, why: whyLine(r, taste), shoulder: isShoulder(r.city, taste, m, year, SEOUL_HI), festivals: r.festivals.map((f) => f.title) }));
    return { taste, name: TASTES[taste].name, range: TASTES[taste].range, picks };
  });
}

/** 지금 기준으로 다가오는 그 달의 연도 (지난달이면 내년) */
export function guideYear(month: number, now = new Date()) {
  const y = now.getFullYear();
  return month - 1 < now.getMonth() ? y + 1 : y;
}

/** 그 달에 빠지는 대표 이유 (우기·태풍·폭염 등) 몇 개 */
export function monthHazards(month: number): { city: string; label: string }[] {
  return cities.flatMap((c) => c.hazards.filter((h) => h.months.includes(month)).map((h) => ({ city: c.name, label: h.label }))).slice(0, 8);
}
