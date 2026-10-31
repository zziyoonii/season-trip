import type { Metadata } from "next";

export const metadata: Metadata = { title: "개인정보처리방침 · 나가요", alternates: { canonical: "/privacy" } };

/** 개인정보처리방침. 바뀌면 시행일을 같이 고쳐요 */
export default function Privacy() {
  return (
    <div className="scroller">
      <main className="app doc">
        <a href="/" className="back">← 나가요로 돌아가기</a>
        <h1>개인정보처리방침</h1>
        <p className="muted">시행일 2026년 10월 31일</p>

        <h2>1. 수집하는 정보</h2>
        <p>나가요는 회원가입이 없고, 이름·연락처·이메일 같은 개인정보를 직접 수집하거나 저장하지 않아요.</p>
        <ul>
          <li>입력한 여행 날짜, 원하는 날씨, 연차 일수는 브라우저 안에서만 계산에 쓰이고 서버에 저장하지 않아요.</li>
          <li>탑승권 공유 이미지에 넣는 탑승객 이름은 휴대폰·브라우저 안에서 이미지를 만들 때만 쓰이고 전송되지 않아요.</li>
        </ul>

        <h2>2. 방문 통계 (Google Analytics)</h2>
        <p>서비스 개선을 위해 Google Analytics 4로 방문 수, 화면 이동, 버튼 클릭 같은 이용 기록을 익명으로 모아요. 이 과정에서 쿠키와 기기·브라우저 정보, 대략적인 지역이 Google에 전달될 수 있어요.</p>
        <p>원하지 않으면 브라우저 설정에서 쿠키를 차단하거나 <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener">Google 애널리틱스 차단 부가기능</a>을 쓸 수 있어요.</p>

        <h2>3. 광고 (Google AdSense)</h2>
        <p>나가요에는 Google AdSense 광고가 표시될 수 있어요. Google 등 제3자 광고 업체는 쿠키를 사용해 이용자가 이 사이트나 다른 사이트를 방문한 기록을 바탕으로 광고를 보여줄 수 있어요.</p>
        <p>맞춤 광고는 <a href="https://adssettings.google.com" target="_blank" rel="noopener">Google 광고 설정</a>에서 끌 수 있고, 자세한 내용은 <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener">Google 광고 정책</a>에서 볼 수 있어요.</p>

        <h2>4. 외부 서비스</h2>
        <ul>
          <li><b>행사 검색</b>: 도시 이름과 여행 기간(개인정보 아님)을 Google Gemini API에 보내 그 기간의 행사를 찾아요.</li>
          <li><b>여행경보</b>: 외교부 공공데이터를 받아 보여줘요.</li>
          <li><b>항공권·숙소 보기</b>: 누르면 스카이스캐너·부킹닷컴·아고다 등 외부 사이트로 이동해요. 이동한 뒤의 개인정보 처리는 각 사이트의 방침을 따라요.</li>
        </ul>

        <h2>5. 제휴 링크</h2>
        <p>일부 항공권·숙소 링크는 제휴 링크예요. 이 링크로 예약하면 나가요가 예약 사이트로부터 수수료를 받을 수 있고, 이용자가 내는 가격은 같아요.</p>

        <h2>6. 문의</h2>
        <p>개인정보 관련 문의는 만든 사람 인스타그램 <a href="https://www.instagram.com/zziyoonii/" target="_blank" rel="noopener">@zziyoonii</a>로 DM 주세요.</p>
      </main>
    </div>
  );
}
