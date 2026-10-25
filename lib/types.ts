export type Taste = "hot" | "warm" | "cool" | "snow";

export interface City {
  name: string; country: string; lat: number; flight: number;
  code: string; emoji: string;
  hi: number[]; lo: number[]; rain: number[]; hum: number[] | null;
  hazards: { months: number[]; label: string }[];
  festivals: { months: number[]; title: string; when: string }[];
}

export interface CityAlert { level: number; note: string; label?: string }
export type AlertMap = Record<string, CityAlert>;

export interface Result {
  city: City; hi: number; lo: number; rain: number; hum: number | null; day: number;
  score: number; seoul: number;
  weights: number[]; festivals: City["festivals"];
  notes: string[];          // 경고성 안내 (태풍 일부 겹침, 습도, 여행경보 2단계)
}
export interface Excluded { city: City; reasons: string[] }
