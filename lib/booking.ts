/**
 * 항공권·숙소 보기 링크.
 * 숙소: 아고다 공식 파트너 링크(CID + 도시 번호 + 날짜). 번호가 없는 도시만 부킹닷컴 일반 검색.
 */
export const AGODA_CID = "1978877";

/**
 * 아고다 도시 번호 (sherpa.agoda.com/Wordpress/AutoSuggestion 으로 2026-10-31에 확인).
 * 모스크바는 엉뚱한 도시(미국 아이다호)로 나와서 뺐어요 → 부킹닷컴
 */
const AGODA_CITY_ID: Record<string, number> = {
  "방콕": 9395,
  "치앙마이": 7401,
  "푸껫": 16056,
  "다낭·호이안": 16440,
  "나트랑": 2679,
  "푸꾸옥": 17188,
  "하노이": 2758,
  "세부": 4001,
  "보라카이": 15903,
  "발리": 17193,
  "코타키나발루": 5070,
  "싱가포르": 4064,
  "괌": 6126,
  "사이판": 16932,
  "오키나와": 717899,
  "타이베이": 4951,
  "홍콩": 16808,
  "도쿄": 5085,
  "교토·오사카": 9590,
  "삿포로": 3435,
  "후쿠오카": 16527,
  "상하이": 3987,
  "제주": 16901,
  "하얼빈": 2772,
  "울란바토르": 79630,
  "런던": 233,
  "파리": 15470,
  "바르셀로나": 2002,
  "리스본": 16364,
  "로마": 16594,
  "아테네": 16571,
  "산토리니": 16084,
  "이스탄불": 14932,
  "트빌리시": 647,
  "두바이": 2994,
  "마라케시": 11825,
  "카이로": 7923,
  "몰디브": 17759,
  "시드니": 14370,
  "멜버른": 10372,
  "퀸스타운": 2566,
  "호놀룰루": 10921,
  "칸쿤": 5954,
  "로스앤젤레스": 12772,
  "뉴욕": 318,
  "밴쿠버": 9023,
  "프라하": 15977,
  "비엔나": 16582,
  "체르마트": 4498,
  "레이캬비크": 13864,
  "로바니에미": 8486,
  "쿠스코·마추픽추": 16970,
  "케이프타운": 1063,
  "세비야": 16577,
  "마드리드": 5531,
  "포르투": 8738,
  "테네리페": 17379,
  "몰타": 5923,
  "니스": 5277,
  "나폴리·아말피": 9286,
  "피렌체": 16573,
  "베네치아": 17164,
  "두브로브니크": 4839,
  "부다페스트": 10647,
  "뮌헨": 16017,
  "암스테르담": 13868,
  "에든버러": 18924,
  "코펜하겐": 16480
};

export function flightUrl(code: string, start: string, end: string) {
  const ymd = (s: string) => s.slice(2).replace(/-/g, "");
  return `https://www.skyscanner.co.kr/transport/flights/icn/${code.toLowerCase()}/${ymd(start)}/${ymd(end)}/?adultsv2=1&cabinclass=economy`;
}

/** affiliate: 제휴 링크인지 (제휴 고지 표시용) */
export function hotelLink(city: string, start: string, end: string): { url: string; vendor: "agoda" | "booking"; affiliate: boolean } {
  const id = AGODA_CITY_ID[city];
  if (id) {
    return { url: `https://www.agoda.com/partners/partnersearch.aspx?pcs=1&cid=${AGODA_CID}&hl=ko-kr&city=${id}&checkin=${start}&checkout=${end}&NumberofAdults=2&NumberofChildren=0&Rooms=1`, vendor: "agoda", affiliate: true };
  }
  // 도시 페이지(agoda.com/city/…)는 날짜가 안 넘어가서 쓰지 않아요. 도시 번호가 생기면 위 AGODA_CITY_ID 에 추가
  return { url: `https://www.booking.com/searchresults.ko.html?ss=${encodeURIComponent(city)}&checkin=${start}&checkout=${end}&group_adults=2&no_rooms=1&group_children=0`, vendor: "booking", affiliate: false };
}
