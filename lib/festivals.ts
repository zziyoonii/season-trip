/**
 * Gemini + Google 검색 연동으로 "그 도시, 그 기간"의 실제 행사를 찾아요. (서버 전용)
 * 환경변수 GEMINI_API_KEY 가 없으면 null → 화면은 data/cities.json 의 대표 행사를 보여줘요.
 */
/** start/end: YYYY-MM-DD. 여행 날짜로 다시 거를 때 써요 */
export interface LiveFestival { title: string; when: string; desc: string; start: string; end: string }
/** suggestionsHtml: 구글 검색 연동 사용 조건상 화면에 그대로 보여줘야 하는 "Google 검색 추천" 칩 */
export interface FestivalAnswer {
  items: LiveFestival[];
  sources: { title: string; url: string }[];
  suggestionsHtml: string | null;
  /** 실제로 구글 검색을 돌렸는지 (검색어가 있으면 true) */
  grounded: boolean;
  queries: string[];
  model: string;
}

// 2.5 계열은 지원 종료 예정이라 3.5 Flash-Lite(빠르고 저렴, 검색 연동 지원)를 기본으로
const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
const ENDPOINT = (m: string) => `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`;

const SYSTEM = "너는 한국인 여행자를 돕는 여행 정보 리서처야. 반드시 google_search 도구로 검색해서 확인한 사실만 쓰고, 모든 답은 한국어로 써. 현지어(일본어, 영어 등) 행사 이름도 한국어로 옮겨 써.";

function prompt(city: string, country: string, start: string, end: string) {
  return `${country} ${city}에서 ${start}부터 ${end} 사이에 열리는(또는 기간이 겹치는) 축제, 공연, 시즌 행사를 최대 6개 찾아줘.
- 올해 실제 날짜가 검색으로 확인된 것만. 날짜를 못 찾았으면 넣지 마.
- 한국인 여행자에게 의미 있는 순서로.
- title, desc는 반드시 한국어. 예: "さっぽろホワイトイルミネーション" → "삿포로 화이트 일루미네이션"
- start, end는 YYYY-MM-DD. 하루짜리면 둘이 같게.
- 답은 아래 JSON만, 다른 말 없이:
{"items":[{"title":"행사 이름","start":"YYYY-MM-DD","end":"YYYY-MM-DD","desc":"한 줄 설명(30자 이내)"}]}
없으면 {"items":[]}`;
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const md = (s: string) => { const [, m, d] = s.split("-").map(Number); return { m, d }; };
/** "12월 25일" / "11월 20일~12월 25일" / "12월 5일~7일" */
export function whenText(start: string, end: string) {
  const a = md(start), b = md(end);
  if (start === end) return `${a.m}월 ${a.d}일`;
  return a.m === b.m ? `${a.m}월 ${a.d}일~${b.d}일` : `${a.m}월 ${a.d}일~${b.m}월 ${b.d}일`;
}

function parseItems(text: string): LiveFestival[] {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return [];
  try {
    const j = JSON.parse(m[0]);
    return (Array.isArray(j.items) ? j.items : [])
      .filter((x: any) => x && typeof x.title === "string" && ISO.test(x.start) && ISO.test(x.end ?? x.start))
      .map((x: any) => {
        const start = x.start, end = x.end && x.end >= x.start ? x.end : x.start;
        return { title: x.title.slice(0, 40), start, end, when: whenText(start, end), desc: String(x.desc ?? "").slice(0, 60) };
      })
      .slice(0, 6);
  } catch { return []; }
}

/** 여행 기간과 하루라도 겹치는 행사만 */
export function inTrip(items: LiveFestival[], start: string, end: string) {
  return items.filter((f) => f.start <= end && f.end >= start).slice(0, 4);
}

export async function findFestivals(city: string, country: string, start: string, end: string): Promise<FestivalAnswer | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const res = await fetch(ENDPOINT(MODEL), {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: "user", parts: [{ text: prompt(city, country, start, end) }] }],
      tools: [{ google_search: {} }],
      generationConfig: { temperature: 0.2 },
    }),
    // 같은 도시·같은 달 질문은 일주일 동안 다시 검색하지 않아요
    next: { revalidate: 60 * 60 * 24 * 7 },
  });
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const cand = data.candidates?.[0];
  const text: string = (cand?.content?.parts ?? []).map((p: any) => p.text ?? "").join("");
  const gm = cand?.groundingMetadata ?? {};
  const queries: string[] = Array.isArray(gm.webSearchQueries) ? gm.webSearchQueries : [];
  const chunks: any[] = gm.groundingChunks ?? [];
  const seen = new Set<string>();
  const sources = chunks
    .map((c) => c.web).filter((w) => w?.uri)
    .filter((w) => { const k = String(w.title ?? w.uri); if (seen.has(k)) return false; seen.add(k); return true; })
    .slice(0, 4)
    .map((w) => ({ title: String(w.title ?? "출처"), url: String(w.uri) }));
  const suggestionsHtml: string | null = gm.searchEntryPoint?.renderedContent ?? null;
  if (!queries.length && !chunks.length) console.warn(`[festivals] ${city} ${start}~${end}: 검색 없이 답했어요 (groundingMetadata 없음)`);
  return { items: parseItems(text), sources, suggestionsHtml, grounded: queries.length > 0 || chunks.length > 0, queries, model: MODEL };
}
