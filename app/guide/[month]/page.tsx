import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cityAlerts, loadAlertSource } from "@/lib/alerts";
import { SEOUL_HI, guideYear, monthGuide, monthHazards } from "@/lib/guide";
import { seoulDiff } from "@/lib/climate";
import AdSlot from "@/components/AdSlot";

export const revalidate = 86400;
export function generateStaticParams() { return Array.from({ length: 12 }, (_, i) => ({ month: String(i + 1) })); }

const SEASON = ["한겨울", "늦겨울", "초봄", "봄", "늦봄", "초여름", "한여름", "한여름", "초가을", "가을", "늦가을", "초겨울"];

export async function generateMetadata({ params }: { params: Promise<{ month: string }> }): Promise<Metadata> {
  const m = Number((await params).month);
  if (!(m >= 1 && m <= 12)) return {};
  const title = `${m}월 해외여행, 날씨 좋은 곳 추천 · 나가요`;
  const description = `${m}월에 우기·태풍·폭염을 피해서 가기 좋은 해외 여행지를 더운 곳, 따뜻한 곳, 선선한 곳, 눈 오는 곳으로 나눠 정리했어요. 2021~2024년 실제 기후 기록 기준.`;
  return { title, description, alternates: { canonical: `/guide/${m}` }, openGraph: { title, description, url: `https://nagayo.vercel.app/guide/${m}`, siteName: "나가요", locale: "ko_KR", type: "article" } };
}

export default async function MonthGuide({ params }: { params: Promise<{ month: string }> }) {
  const m = Number((await params).month);
  if (!(m >= 1 && m <= 12)) notFound();
  const src = await loadAlertSource();
  const year = guideYear(m);
  const sections = monthGuide(m, year, cityAlerts(src));
  const hazards = monthHazards(m);
  const seoul = SEOUL_HI[m - 1];
  return (
    <div className="scroller">
      <main className="app doc guide">
        <a href="/" className="back">← 나가요에서 내 날짜로 찾기</a>
        <h1>{m}월 해외여행, 날씨 좋은 곳</h1>
        <p className="muted">{year}년 {m}월 기준 · 2021~2024년 실제 기후 기록 · 외교부 여행경보 반영</p>
        <p>{m}월 서울은 낮 최고기온이 평균 {seoul}° 정도인 {SEASON[m - 1]}이에요. 이맘때 해외로 나간다면 어디가 좋을까요? 나가요는 도시마다 {m}월의 낮·밤 기온, 비 오는 날 수, 우기·태풍·폭염 같은 위험 시기를 따져서 &ldquo;가서 날씨 때문에 망하지 않는 곳&rdquo;만 골라요. 원하는 날씨별로 나눠서 정리했어요.</p>

        {sections.map((s) => (
          <section key={s.taste}>
            <h2>{s.name} <small>낮 {s.range}</small></h2>
            {s.picks.length === 0 ? <p>{m}월에는 이 날씨에 딱 맞는 곳이 없어요.</p> : (
              <ol className="glist">
                {s.picks.map(({ r, why, shoulder, festivals }) => (
                  <li key={r.city.name}>
                    <h3>{r.city.emoji} {r.city.name} <span>{r.city.country} · 인천에서 {r.city.flight}시간</span></h3>
                    <p>낮 {r.hi.toFixed(0)}°, 밤 {r.lo.toFixed(0)}°로 서울보다 {seoulDiff(r.seoul)}예요. {why}{shoulder === "before" ? " 날씨가 제일 좋은 시기 바로 전이라 사람이 덜 붐빌 수 있어요." : shoulder === "after" ? " 성수기가 막 끝난 때라 사람은 빠지고 날씨는 아직 좋아요." : ""}</p>
                    {festivals.length > 0 && <p className="gfest">🎉 이 무렵 열리는 행사: {festivals.join(", ")}</p>}
                    {r.notes.map((n) => <p key={n} className="gnote">{n}</p>)}
                  </li>
                ))}
              </ol>
            )}
          </section>
        ))}

        {hazards.length > 0 && (
          <section>
            <h2>{m}월에 피하면 좋은 곳</h2>
            <p>이 시기에는 날씨 위험 때문에 추천에서 빼는 곳들이에요.</p>
            <ul>{hazards.map((h) => <li key={h.city + h.label}><b>{h.city}</b> · {h.label}</li>)}</ul>
          </section>
        )}

        <AdSlot />

        <section className="gcta">
          <h2>내 휴가 날짜로 찾아보기</h2>
          <p>여행 날짜나 남은 연차를 넣으면, 딱 그 기간에 날씨 좋은 곳과 그때 열리는 행사까지 찾아드려요.</p>
          <a href="/" className="gbtn">✈️ 나가요에서 찾기</a>
        </section>

        <nav className="gmonths" aria-label="다른 달 가이드">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((k) => <a key={k} href={`/guide/${k}`} aria-current={k === m ? "page" : undefined}>{k}월</a>)}
        </nav>
        <p className="muted">기후는 Open-Meteo(ERA5) 2021~2024년 평균이라 올해 실제 날씨와 다를 수 있어요. 출발 전에는 꼭 일기예보와 외교부 해외안전여행을 확인하세요.</p>
      </main>
    </div>
  );
}
