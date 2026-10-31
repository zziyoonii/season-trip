export type Taste = "hot" | "warm" | "cool" | "snow";

export type Style = "beach" | "city" | "nature";
export interface City {
  name: string; country: string; lat: number; flight: number;
  code: string; emoji: string;
  /** 여행 스타일: beach 휴양, city 도시, nature 자연 (여러 개 가능) */
  styles?: Style[];
  hi: number[]; lo: number[]; rain: number[]; hum: number[] | null;
  hazards: { months: number[]; label: string }[];
  /** ranges: [["MM-DD","MM-DD"], …] 날짜를 아는 행사. 없으면 months(음력 등 해마다 바뀌는 행사)로만 판단 */
  festivals: { months: number[]; title: string; when: string; ranges?: string[][] }[];
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
