import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "월별 해외여행 날씨 가이드 · 나가요",
  description: "1월부터 12월까지, 달마다 날씨 좋은 해외 여행지를 더운 곳·따뜻한 곳·선선한 곳·눈 오는 곳으로 정리했어요.",
  alternates: { canonical: "/guide" },
};

const NOTE = ["설 연휴, 따뜻한 동남아", "겨울 끝자락 남반구 여름", "벚꽃 직전 봄 여행", "벚꽃과 봄꽃", "황금연휴 해외여행", "장마 전 마지막 기회", "여름휴가 피서지", "한여름 선선한 곳", "추석 연휴 여행", "가을 단풍과 축제", "연차 쓰기 좋은 늦가을", "연말 연차 소진"];

export default function GuideIndex() {
  return (
    <div className="scroller">
      <main className="app doc guide">
        <a href="/" className="back">← 나가요로 돌아가기</a>
        <h1>월별 해외여행 날씨 가이드</h1>
        <p>휴가 날짜는 정해졌는데 어디로 갈지 고민이라면, 그 달에 날씨가 좋은 곳부터 보세요. 69개 해외 도시의 2021~2024년 실제 기후 기록으로 달마다 정리했어요.</p>
        <ul className="gindex">
          {NOTE.map((n, i) => <li key={i}><a href={`/guide/${i + 1}`}><b>{i + 1}월</b><span>{n}</span></a></li>)}
        </ul>
      </main>
    </div>
  );
}
