# 나가요 ✈️

휴가는 정했고, 어디 가지? — https://nagayo.vercel.app

여행 기간과 원하는 날씨를 고르면, 그때 실제로 여행하기 좋은 해외 여행지를 추천해요.
"가서 망하지 않는 곳"이 핵심이라 기후(우기·태풍·폭염·짧은 해)와 외교부 여행경보로 걸러요.

## 실행

```bash
npm install
cp .env.example .env.local   # 키 넣기 (없어도 돌아가요)
npm run dev                  # http://localhost:3000
```

| 환경변수 | 용도 | 없으면 |
|---|---|---|
| `DATA_GO_KR_KEY` | 공공데이터포털 일반 인증키(Decoding). 외교부 여행경보·특별여행주의보 | `data/alerts-snapshot.json`(2026.10.25) 사용 |
| `GEMINI_API_KEY` | Google AI Studio 키. 그 기간 실제 행사를 구글 검색으로 찾음 | 매년 반복되는 대표 행사만 표시 |
| `NEXT_PUBLIC_GA_ID` | GA4 측정 ID (G-로 시작) | GA 안 붙음 |
| `NEXT_PUBLIC_ADSENSE_CLIENT` | AdSense 게시자 ID (`ca-pub-…`). 넣으면 광고 스크립트·`/ads.txt` 생성 | 광고 없음 |
| `NEXT_PUBLIC_ADSENSE_SLOT` | AdSense 광고 단위 ID. 결과·연차 계획 맨 아래 한 칸 | 광고 칸 없음 |
| `GEMINI_MODEL` | 선택. 기본 `gemini-3.5-flash-lite`, 더 정확하게는 `gemini-3.8-flash` | |

## Vercel 배포

1. GitHub에 올리고 Vercel에서 Import
2. Settings → Environment Variables 에 위 키 입력
3. Deploy

## 구조

```
app/page.tsx              서버: 여행경보 받아 도시별 단계로 변환(하루 캐시) → Planner
app/api/alerts            도시별 여행경보 JSON (하루 캐시)
app/api/festivals         Gemini + 구글 검색 행사 조회 (도시×월 단위 7일 캐시)
components/Planner.tsx    화면 전체 (입력, 연휴 시트, 로딩, 탑승권, 공유 시트)
lib/climate.ts            추천 점수·탈락 규칙
lib/holidays.ts           공휴일, 연차 붙인 최장 연휴 계산
lib/alerts.ts             외교부 데이터 → 도시별 경보 매칭
lib/festivals.ts          Gemini 호출
lib/share-image.ts        1080×1920 공유 탑승권 이미지 (캔버스)
data/cities.json          69개 도시 월별 기후(Open-Meteo ERA5 2021–2024), 공항코드, 이모지, 대표 행사
data/city-regions.ts      도시 → 경보 지역 매칭 키워드
scripts/check-logic.ts    추천 로직 회귀 테스트 (npm run check:logic)
```

## 공유하기

휴대폰에서는 브라우저 기본 공유(Web Share API)로 인스타그램 스토리·카카오톡·사진 저장을 바로 고를 수 있어요.
공유를 지원하지 않는 PC에서는 PNG로 저장돼요.

## 데이터 출처

- 기후: [Open-Meteo](https://open-meteo.com/) Historical Weather API (ERA5), CC BY 4.0 — 무료는 비상업용. 수익화 전 유료 플랜 확인 필요
- 여행경보: 외교부 국가·지역별 여행경보, 특별여행주의보 (공공데이터포털, 이용허락범위 제한 없음)
- 행사: Gemini + Google 검색 결과. 사용 조건에 따라 출처와 "Google 검색 추천" 영역을 화면에 함께 표시
