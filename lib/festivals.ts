/**
 * Gemini + Google 검색 연동으로 "그 도시, 그 기간"의 실제 행사를 찾아요. (서버 전용)
 * 환경변수 GEMINI_API_KEY 가 없으면 null → 화면은 data/cities.json 의 대표 행사를 보여줘요.
 */
export interface LiveFestival { title: string; when: string; desc: string }
/** suggestionsHtml: 구글 검색 연동 사용 조건상 화면에 그대로 보여줘야 하는 "Google 검색 추천" 칩 */
export interface FestivalAnswer { items: LiveFestival[]; sources: { title: string; url: string }[]; suggestionsHtml: string | null; model: string }

// 2.5 계열은 지원 종료 예정이라 3.5 Flash-Lite(빠르고 저렴, 검색 연동 지원)를 기본으로
const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
const ENDPOINT = (m: string) => `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`;

function prompt(city: string, country: string, start: string, end: string) {
  return `너는 여행 정보 리서처야. 구글 검색으로 확인한 사실만 써.
${country} ${city}에서 ${start}부터 ${end} 사이에 실제로 열리는(또는 기간이 겹치는) 축제, 공연, 시즌 행사를 최대 4개 찾아줘.
- 그 해 실제 날짜가 확인된 것만. 날짜를 못 찾았으면 넣지 마.
- 한국인 여행자에게 의미 있는 순서로.
- 답은 아래 JSON만, 다른 말 없이:
{"items":[{"title":"행사 이름(한국어)","when":"예: 11월 7일~9일","desc":"한 줄 설명(30자 이내)"}]}
없으면 {"items":[]}`;
}

function parseItems(text: string): LiveFestival[] {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return [];
  try {
    const j = JSON.parse(m[0]);
    return (Array.isArray(j.items) ? j.items : [])
      .filter((x: any) => x && typeof x.title === "string" && typeof x.when === "string")
      .slice(0, 4)
      .map((x: any) => ({ title: x.title.slice(0, 40), when: x.when.slice(0, 30), desc: String(x.desc ?? "").slice(0, 60) }));
  } catch { return []; }
}

export async function findFestivals(city: string, country: string, start: string, end: string): Promise<FestivalAnswer | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const res = await fetch(ENDPOINT(MODEL), {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
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
  const chunks: any[] = cand?.groundingMetadata?.groundingChunks ?? [];
  const sources = chunks
    .map((c) => c.web).filter((w) => w?.uri)
    .slice(0, 4)
    .map((w) => ({ title: String(w.title ?? "출처"), url: String(w.uri) }));
  const suggestionsHtml: string | null = cand?.groundingMetadata?.searchEntryPoint?.renderedContent ?? null;
  return { items: parseItems(text), sources, suggestionsHtml, model: MODEL };
}
