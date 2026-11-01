/**
 * 첫 화면 아래 소개 (서버에서 바로 그려져서 결과 전에도 읽을거리가 있어요).
 * 화면엔 월별 가이드 칩 한 줄만 보이고, 설명·FAQ는 접어둬요.
 */
export default function About() {
  return (
    <section className="about" aria-label="나가요 소개">
      <p className="aboutlab">달마다 날씨 좋은 곳</p>
      <nav className="gmonths" aria-label="월별 해외여행 날씨 가이드">
        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <a key={m} href={`/guide/${m}`}>{m}월</a>)}
      </nav>
      <details className="aboutmore">
        <summary>나가요는 어떻게 고르나요?</summary>
        <p>같은 도시도 언제 가느냐에 따라 우기, 태풍, 폭염일 수 있어요. 나가요는 <b>내 휴가 날짜에 실제로 날씨가 좋은 곳</b>만 골라요.</p>
        <p><b>실제 기후 기록</b> · 69개 도시의 2021~2024년 월별 기온, 비 오는 날, 습도(Open-Meteo ERA5)로 계산해요.</p>
        <p><b>망하는 날씨 빼기</b> · 우기, 태풍·허리케인, 36도 넘는 폭염, 해가 8시간도 안 뜨는 곳은 추천하지 않아요.</p>
        <p><b>외교부 여행경보</b> · 매일 받아서 출국 권고 이상인 곳은 빼고, 여행자제 지역은 따로 알려드려요.</p>
        <p><b>연차 계산</b> · 남은 연차와 기한으로 주말·공휴일을 붙여 가장 길게 쉬는 날짜를 짜요. 반차도 0.5일로 계산해요.</p>
        <p><b>올해 실제 날씨랑 같나요?</b> 최근 4년 평균이라 다를 수 있어요. 출발 직전엔 일기예보를 꼭 확인하세요.</p>
        <p><b>출발지는요?</b> 지금은 인천 출발 기준이에요.</p>
      </details>
    </section>
  );
}
