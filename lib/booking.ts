/**
 * 항공권·숙소 보기 링크.
 * 숙소: 아고다 도시 페이지 주소가 확인된 도시는 아고다 제휴 링크(CID), 나머지는 부킹닷컴 일반 검색.
 */
export const AGODA_CID = "1978877";

/** 참고용: 아고다 도시 페이지 슬러그 (날짜가 안 넘어가서 지금은 안 씀) */
export const AGODA_SLUG: Record<string, string> = {
  "방콕": "bangkok-th", "치앙마이": "chiang-mai-th", "푸껫": "phuket-th",
  "다낭·호이안": "da-nang-vn", "나트랑": "nha-trang-vn", "푸꾸옥": "phu-quoc-island-vn", "하노이": "hanoi-vn",
  "세부": "cebu-ph", "보라카이": "boracay-island-ph", "발리": "bali-id", "코타키나발루": "kota-kinabalu-my",
  "싱가포르": "singapore-sg", "사이판": "saipan-mp", "오키나와": "okinawa-main-island-jp",
  "타이베이": "taipei-tw", "홍콩": "hong-kong-hk", "도쿄": "tokyo-jp", "교토·오사카": "osaka-jp",
  "삿포로": "sapporo-jp", "후쿠오카": "fukuoka-jp", "상하이": "shanghai-cn", "제주": "jeju-kr",
  "하얼빈": "harbin-cn", "울란바토르": "ulaanbaatar-mn", "호놀룰루": "honolulu-hi-us",
};

/** 아고다 공식 파트너 링크용 도시 번호 (링크 만들기 도구에서 확인). 있으면 이걸 우선 써요 */
const AGODA_CITY_ID: Record<string, number> = {
  "삿포로": 3435,
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
