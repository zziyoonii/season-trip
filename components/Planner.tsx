"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { TASTES, autoFlight, evaluate, isExcluded, isResult, monthWeights, seoulDiff, tempColor, whyLine } from "@/lib/climate";
import { holidayOptions, iso, parseDate, addDays } from "@/lib/holidays";
import { drawShareImage } from "@/lib/share-image";
import { planLeave, type LeavePlan, type LeaveWindow } from "@/lib/leave";
import { track } from "@/lib/ga";
import ScrollPlane from "./ScrollPlane";
import type { AlertMap, City, Result, Taste } from "@/lib/types";

const PLANE_D = "M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z";
const WD = "일월화수목금토";
const md = (d: Date) => `${d.getMonth() + 1}.${String(d.getDate()).padStart(2, "0")}`;
const dl = (d: Date) => `${d.getMonth() + 1}.${d.getDate()}(${WD[d.getDay()]})`;

interface Props { cities: City[]; seoulHi: number[]; alerts: AlertMap; alertDate: string; alertLive: boolean; today: string }
interface Query { start: string; end: string; taste: Taste; flight: number }

export default function Planner({ cities, seoulHi, alerts, alertDate, today }: Props) {
  const todayD = parseDate(today);

  // 처음엔 비어 있어요. 날짜·날씨를 고르고 "찾기"를 눌러야 결과가 나와요
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [taste, setTaste] = useState<Taste | null>(null);
  const [flight, setFlight] = useState(25);
  const [flightNote, setFlightNote] = useState("날짜를 고르면 일정 길이에 맞춰 자동으로 정해줘요.");
  const [query, setQuery] = useState<Query | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [holOpen, setHolOpen] = useState(false);
  const [shareFor, setShareFor] = useState<Result | null>(null);
  const lastLen = useRef(7);
  // 연차 소진 모드
  const [mode, setMode] = useState<"dates" | "leave">("dates");
  const [leaveN, setLeaveN] = useState(0);
  const [deadline, setDeadline] = useState(`${today.slice(0, 4)}-12-31`);
  const [leaveQ, setLeaveQ] = useState<{ n: number; deadline: string; taste: Taste } | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const codes = useMemo(() => cities.map((c) => c.code), [cities]);

  const hasDates = !!start && !!end;
  const s = start ? parseDate(start) : null, e = end ? parseDate(end) : null;
  const dateErr = !!s && !!e && e < s;
  const days = s && e ? Math.round((e.getTime() - s.getTime()) / 864e5) + 1 : 0;
  const ready = hasDates && !dateErr && !!taste;

  const [pending, setPending] = useState<Query | null>(null);
  function compute(q: Query) {
    const qs = parseDate(q.start), qe = parseDate(q.end);
    const { weights, days } = monthWeights(qs, qe);
    const mid = new Date((qs.getTime() + Math.min(qe.getTime(), qs.getTime() + 61 * 864e5)) / 2);
    const maxFlight = q.flight >= 25 ? 99 : q.flight + 0.5;
    const all = cities.map((c) => evaluate(c, { weights, mid, taste: q.taste, maxFlight, alerts, seoulHi }));
    return {
      results: all.filter(isResult).sort((a, b) => b.score - a.score),
      excluded: all.filter(isExcluded),
      hidden: all.filter((r) => r === null).length,
      qDays: days, qStart: qs, rangeText: `${md(qs)}–${md(qe)}`,
    };
  }
  // 출발 안내판이 마지막에 멈출 곳 = 실제 1순위
  const target = useMemo(() => (pending ? compute(pending).results[0]?.city ?? null : null), [pending]); // eslint-disable-line react-hooks/exhaustive-deps

  function run(q: Query, scroll: boolean) {
    setPending(q);
    setLoading(true);
    if (scroll) setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    return setTimeout(() => { setQuery(q); setShowAll(false); setLoading(false); }, reduce ? 250 : 1500);
  }
  function search() {
    if (!ready || !taste) return;
    track("search", { taste, days, flight, start, holiday: holidayLabel || undefined });
    run({ start, end, taste, flight }, true);
  }
  const leaveReady = leaveN >= 1 && !!taste && !!deadline && parseDate(deadline) > todayD;
  function planSearch() {
    if (!leaveReady || !taste) return;
    track("leave_plan", { leave_days: leaveN, deadline, taste });
    setLoading(true);
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    setTimeout(() => { setLeaveQ({ n: leaveN, deadline, taste }); setLoading(false); }, 1500);
  }
  // 계획 중 하나를 고르면 그 날짜로 일반 검색 결과(탑승권)를 보여줘요
  function pickWindow(w: LeaveWindow) {
    if (!taste) return;
    const a = iso(w.start), b = iso(w.end);
    track("leave_pick", { start: a, days: w.len, leave_used: w.used, taste });
    setMode("dates"); applyDates(a, b);
    const f = autoFlight(w.len);
    run({ start: a, end: b, taste, flight: f }, true);
  }
  const plans = useMemo(() => {
    if (!leaveQ) return null;
    return planLeave(todayD, parseDate(leaveQ.deadline), leaveQ.n).map((p) => ({
      ...p,
      picks: p.windows.map((w) => {
        const { weights } = monthWeights(w.start, w.end);
        const mid = new Date((w.start.getTime() + w.end.getTime()) / 2);
        const f = autoFlight(w.len);
        const best = cities.map((c) => evaluate(c, { weights, mid, taste: leaveQ.taste, maxFlight: f >= 25 ? 99 : f + 0.5, alerts, seoulHi }))
          .filter(isResult).sort((x, y) => y.score - x.score)[0] ?? null;
        return { w, best };
      }),
    }));
  }, [leaveQ, cities, alerts, seoulHi]); // eslint-disable-line react-hooks/exhaustive-deps

  // 한 번 찾은 뒤에는 조건을 바꾸면 바로 다시 찾아요
  useEffect(() => {
    if (!query || !ready || !taste) return;
    if (query.start === start && query.end === end && query.taste === taste && query.flight === flight) return;
    const t = run({ start, end, taste, flight }, false);
    return () => clearTimeout(t);
  }, [start, end, taste, flight]); // eslint-disable-line react-hooks/exhaustive-deps

  function applyDates(a: string, b: string) {
    setStart(a); setEnd(b);
    if (!a || !b) return;
    const n = Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / 864e5) + 1;
    if (n >= 1) {
      lastLen.current = n - 1;
      const v = autoFlight(n);
      setFlight(v);
      setFlightNote(`${n}일 일정이라 ${v >= 25 ? "제한 없이" : `${v}시간 이내로`} 맞췄어요. 직접 바꿔도 돼요.`);
    }
  }
  function onStart(v: string) {
    if (!v) return;
    // 가는 날을 오는 날 뒤로 옮기면 일정 길이를 유지한 채 오는 날도 밀어줘요
    const b = end && parseDate(end) < parseDate(v) ? iso(addDays(parseDate(v), lastLen.current)) : end;
    applyDates(v, b);
  }

  const out = useMemo(() => (query ? compute(query) : null), [query, cities, alerts, seoulHi]); // eslint-disable-line react-hooks/exhaustive-deps
  const results = out?.results ?? [];

  const holidayLabel = useMemo(() => {
    const hit = holidayOptions(todayD, false, 0).concat(holidayOptions(todayD, true, 5))
      .find((o) => iso(o.start) === start && iso(o.end) === end);
    return hit ? hit.names.join("·") : "";
  }, [start, end, today]); // eslint-disable-line react-hooks/exhaustive-deps

  const rest = results.slice(1, showAll ? results.length : 5);
  const missing = !hasDates ? "여행 날짜를 골라주세요" : dateErr ? "날짜를 다시 확인해 주세요" : !taste ? "원하는 날씨를 골라주세요" : "";

  return (
    <>
      <div className="app">
        <header className="bar">
          <div className="logo"><Logo /><span>나가요<small>제철 여행지</small></span></div>
          <span className="from">인천 출발</span>
        </header>

        <section className="card" aria-label="여행 조건">
          <div className="tabs" role="tablist" aria-label="찾는 방법">
            <button type="button" role="tab" aria-selected={mode === "dates"} onClick={() => setMode("dates")}>날짜로 찾기</button>
            <button type="button" role="tab" aria-selected={mode === "leave"} onClick={() => { setMode("leave"); track("tab_leave"); }}>🔥 연차 소진</button>
          </div>
          {mode === "leave" ? (
            <>
              <h1>남은 연차,<br />어디서 쓸까요?</h1>
              <div className="block">
                <p className="lab">남은 연차</p>
                <div className="leaven">
                  <button type="button" aria-label="하루 줄이기" disabled={leaveN <= 0} onClick={() => setLeaveN(leaveN - 1)}>−</button>
                  <label className="leavein">
                    <input type="number" inputMode="numeric" min={0} max={30} placeholder="0" aria-label="남은 연차 일수"
                      value={leaveN || ""} onChange={(ev) => { const v = parseInt(ev.target.value, 10); setLeaveN(Number.isNaN(v) ? 0 : Math.max(0, Math.min(30, v))); }}
                      onFocus={(ev) => ev.target.select()} />
                    <span>일</span>
                  </label>
                  <button type="button" aria-label="하루 늘리기" disabled={leaveN >= 30} onClick={() => setLeaveN(leaveN + 1)}>+</button>
                </div>
              </div>
              <div className="block">
                <p className="lab">언제까지 써야 해요?</p>
                <label className="dbox"><span>소진 기한</span><input type="date" value={deadline} min={today} aria-label="연차 소진 기한" onChange={(ev) => setDeadline(ev.target.value)} /></label>
                <div className="days"><span className="hint">기한 안의 평일에만 연차를 쓰고, 기한 뒤 주말·공휴일까지 이어서 쉬게 짜드려요</span></div>
              </div>
            </>
          ) : (
          <>
          <h1>언제, 어떤 날씨로<br />떠나고 싶어요?</h1>
          <div className="block">
            <p className="lab">여행 기간</p>
            <div className="dates">
              <label className="dbox"><span>가는 날</span><input type="date" value={start} min={today} aria-label="가는 날" onChange={(ev) => onStart(ev.target.value)} /></label>
              <label className={`dbox${dateErr ? " err" : ""}`}><span>오는 날</span><input type="date" value={end} min={start || today} aria-label="오는 날" onChange={(ev) => ev.target.value && applyDates(start, ev.target.value)} /></label>
            </div>
            <div className={`days${dateErr ? " err" : ""}`}>{dateErr ? "오는 날이 가는 날보다 빨라요. 날짜를 다시 골라주세요." : hasDates ? `${days - 1}박 ${days}일${days >= 62 ? " · 최대 62일까지 계산해요" : ""}` : <span className="hint">가는 날과 오는 날을 골라주세요</span>}</div>
            <button type="button" className="hollink" onClick={() => setHolOpen(true)}>
              <span aria-hidden="true">🗓</span> 연휴로 채우기 {holidayLabel && <small>· {holidayLabel}</small>}<span className="chev" aria-hidden="true">›</span>
            </button>
          </div>
          </>
          )}

          <div className="block">
            <p className="lab">원하는 날씨</p>
            <div className="tastes">
              {(Object.keys(TASTES) as Taste[]).map((k) => (
                <button key={k} type="button" aria-pressed={taste === k} onClick={() => setTaste(k)}>
                  <TasteIcon k={k} /><b>{TASTES[k].name}</b><small>{TASTES[k].range}</small>
                </button>
              ))}
            </div>
          </div>

          {mode === "dates" && <div className="block">
            <div className="fl-head"><label className="lab" htmlFor="flight">비행시간</label><b>{flight >= 25 ? "제한 없음" : `${flight}시간 이내`}</b></div>
            <input id="flight" className="flightbar" type="range" min={5} max={25} step={5} value={flight}
              style={{ ["--p" as string]: `${((flight - 5) / 20) * 100}%` }}
              onChange={(ev) => { setFlight(+ev.target.value); setFlightNote("직접 정한 비행시간이에요."); }} />
            <div className="ticks" aria-hidden="true"><span>5시간</span><span>10</span><span>15</span><span>20</span><span>제한 없음</span></div>
            <div className="auto">{flightNote}</div>
          </div>}

          {mode === "leave" && !leaveQ && (
            <div className="block">
              <button type="button" className="go" disabled={!leaveReady || loading} onClick={planSearch}>🔥 연차 계획 짜기</button>
              <p className="gohint" aria-live="polite">{leaveN < 1 ? "남은 연차를 알려주세요" : !taste ? "원하는 날씨를 골라주세요" : "준비 완료! 눌러서 계획을 받아보세요"}</p>
            </div>
          )}
          {mode === "leave" && leaveQ && (leaveQ.n !== leaveN || leaveQ.deadline !== deadline || leaveQ.taste !== taste) && (
            <div className="block"><button type="button" className="go" disabled={!leaveReady || loading} onClick={planSearch}>바뀐 조건으로 다시 짜기</button></div>
          )}

          {mode === "dates" && !query && (
            <div className="block">
              <button type="button" className="go" disabled={!ready || loading} onClick={search}>✈️ 제철 여행지 찾기</button>
              <p className="gohint" aria-live="polite">{missing || "준비 완료! 눌러서 찾아보세요"}</p>
            </div>
          )}
        </section>

        <div ref={resultsRef} className="anchor" />
        {mode === "leave" ? (
          loading ? <Loader codes={codes} target={null} label="연차 계획 짜는 중" /> :
          !plans ? (
            <div className="intro">
              <span className="em" aria-hidden="true">🔥</span>
              <b>올해 연차, 그냥 날리지 마세요</b>
              <p>남은 연차와 원하는 날씨만 알려주시면<br />주말·공휴일을 붙여 가장 길게 쉬는 계획과 그때 제철인 곳을 찾아드려요.</p>
            </div>
          ) : plans.length === 0 ? (
            <div className="empty">기한 안에 쓸 수 있는 평일이 부족해요.<br />소진 기한을 늘려보세요.</div>
          ) : (
            <>
              <div className="sumline"><h2>연차 계획</h2><span>연차 {leaveQ?.n}일 · {leaveQ && dl(parseDate(leaveQ.deadline))}까지</span></div>
              <div className="plans">{plans.map((p) => <PlanCard key={p.kind} plan={p} onPick={pickWindow} />)}</div>
            </>
          )
        ) : !query && !loading ? (
          <div className="intro">
            <span className="em" aria-hidden="true">🧳</span>
            <b>날짜와 날씨만 골라주세요</b>
            <p>그 기간에 우기·태풍·폭염을 피해서 딱 좋은 곳을 찾아드려요.<br />설·추석 같은 연휴에 떠난다면 <button type="button" className="linkbtn" onClick={() => setHolOpen(true)}>연휴 목록</button>에서 고르면 날짜가 바로 채워져요.</p>
          </div>
        ) : (
        <>
        <div className="sumline">
          <h2>추천 여행지</h2>
          <span>{loading || !out ? "찾는 중…" : `${results.length}곳 찾았어요${out.hidden ? ` · 먼 곳 ${out.hidden}곳 숨김` : ""}`}</span>
        </div>

        {loading || !out || !query ? <Loader codes={codes} target={target} label={`${TASTES[(taste ?? "warm")].name} 찾는 중`} /> : results.length === 0 ? (
          <div className="empty">이 기간엔 원하는 날씨인 곳이 없어요.<br />날씨를 바꾸거나 비행시간을 늘려보세요.</div>
        ) : (
          <>
            <BoardingPass r={results[0]} taste={query.taste} rangeText={out.rangeText} alertDate={alertDate} q={query} onShare={() => { track("share_open", { city: results[0].city.name, taste: query.taste }); setShareFor(results[0]); }} />
            <div className="list">
              {rest.map((r, i) => <ResultItem key={r.city.name} r={r} rank={i + 2} taste={query.taste} alertDate={alertDate} q={query} />)}
            </div>
            {results.length > 5 && <button type="button" className="more" onClick={() => setShowAll((v) => !v)}>{showAll ? "접기" : `${results.length - 5}곳 더 보기`}</button>}
          </>
        )}

        {out && !loading && (
          <details className="card log">
            <summary>날씨·안전 때문에 빠진 곳 <span>{out.excluded.length}곳</span></summary>
            <ul>{out.excluded.map((x) => <li key={x.city.name}><b>{x.city.name}</b><span>{x.reasons.join(" · ")}</span></li>)}</ul>
          </details>
        )}
        </>
        )}
        <p className="foot">
          기후는 <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo</a>(ERA5, CC BY 4.0)의 2021–2024년 일별 기록으로 낸 월 평균이에요.
          여행경보는 외교부 공공데이터({alertDate} 기준)로, 출국권고(3단계) 이상이거나 특별여행주의보가 내려진 곳은 추천에서 빼요.
          출발 전 <a href="https://www.0404.go.kr/" target="_blank" rel="noopener">해외안전여행</a>에서 최신 정보를 꼭 확인하세요.
        </p>
      </div>

      <ScrollPlane />
      {holOpen && <HolidaySheet today={todayD} start={start} end={end} onPick={(a, b) => { track("holiday_pick", { start: a, end: b }); applyDates(a, b); setHolOpen(false); }} onClose={() => setHolOpen(false)} />}
      {shareFor && out && query && <ShareSheet r={shareFor} start={out.qStart} days={out.qDays} rangeText={out.rangeText} rainWord={query.taste === "snow" ? "눈·비" : "비"} onClose={() => setShareFor(null)} />}
    </>
  );
}

/* ───────── 연차 계획 ───────── */

function PlanCard({ plan, onPick }: { plan: LeavePlan & { picks: { w: LeaveWindow; best: Result | null }[] }; onPick: (w: LeaveWindow) => void }) {
  const tag = plan.kind === "all" ? "🧳" : plan.kind === "split" ? "✌️" : "⚡";
  return (
    <article className="plan">
      <header><span className="ptag" aria-hidden="true">{tag}</span><div><b>{plan.title}</b><span>{plan.desc}</span></div></header>
      {plan.picks.map(({ w, best }) => (
        <button key={iso(w.start)} type="button" className="trip" onClick={() => onPick(w)}>
          <span className="when"><b>{dl(w.start)} – {dl(w.end)}</b><small>{w.len}일 쉬고 연차 {w.used}일</small></span>
          {best ? (
            <span className="dest"><i aria-hidden="true">{best.city.emoji}</i><span><b>{best.city.name}</b><small>{best.hi.toFixed(0)}° · {best.city.flight}시간</small></span></span>
          ) : <span className="dest none">맞는 곳이 없어요</span>}
          <span className="chev" aria-hidden="true">›</span>
        </button>
      ))}
    </article>
  );
}

/* ───────── 결과 ───────── */

function BoardingPass({ r, taste, rangeText, alertDate, q, onShare }: { r: Result; taste: Taste; rangeText: string; alertDate: string; q: Query; onShare: () => void }) {
  const { city } = r;
  return (
    <article className="pass">
      <div className="ptop">
        <div className="prow"><span className="k">딱 그때, 제철 여행지</span><span className="s">적합도 {r.score}</span></div>
        <div className="city"><h3>{city.name} <span aria-hidden="true">{city.emoji}</span></h3><span>{city.country}</span></div>
        <div className="route" aria-label={`인천에서 ${city.name}까지 약 ${city.flight}시간`}>
          <div><b>ICN</b><span>인천</span></div>
          <div className="mid"><i /><svg viewBox="0 0 24 24" aria-hidden="true"><path d={PLANE_D} fill="#F28C28" /></svg><i /><span>{city.flight}시간</span></div>
          <div className="dest"><b>{city.code}</b><span>{city.name}</span></div>
        </div>
        <div className="pgrid">
          <div><span>날짜</span><b>{rangeText}</b></div>
          <div><span>낮 / 밤</span><b>{r.hi.toFixed(0)}° / {r.lo.toFixed(0)}°</b></div>
          <div><span>서울 대비</span><b className="o">{seoulDiff(r.seoul)}</b></div>
        </div>
      </div>
      <div className="perf" aria-hidden="true"><i /><i /></div>
      <div className="pbody">
        <p className="why">{whyLine(r, taste)}</p>
        <div className="pchips">
          <div><b>{r.rain.toFixed(0)}일</b><span>한 달 중 {taste === "snow" ? "눈·비" : "비"} 오는 날</span></div>
          <div><b>{r.day.toFixed(1)}시간</b><span>해 떠 있는 시간</span></div>
        </div>
        <Notes r={r} alertDate={alertDate} />
        <Festivals r={r} q={q} />
        <Ribbon r={r} />
        <button type="button" className="sharebtn" onClick={onShare}>✈️ 탑승권 자랑하기</button>
      </div>
    </article>
  );
}

function ResultItem({ r, rank, taste, alertDate, q }: { r: Result; rank: number; taste: Taste; alertDate: string; q: Query }) {
  const [open, setOpen] = useState(false);
  const alert = r.notes.some((n) => n.startsWith("⚠️"));
  return (
    <details className="item" onToggle={(ev) => { const o = (ev.target as HTMLDetailsElement).open; setOpen(o); if (o) track("result_open", { city: r.city.name, rank }); }}>
      <summary>
        <span className="tbadge" style={{ ["--t" as string]: tempColor(r.hi) }}>{r.hi.toFixed(0)}°</span>
        <span className="nm"><b>{rank}. {r.city.name} {r.city.emoji}</b>
          <span>{r.city.code} · {r.city.flight}시간 · 서울보다 {seoulDiff(r.seoul)}{r.festivals.length ? ` · 축제 ${r.festivals.length}개` : ""}{alert ? " · ⚠️ 여행자제" : ""}</span>
        </span>
        <span className="rk"><b>{r.score}</b><svg className="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg></span>
      </summary>
      <div className="body">
        <p className="why">{whyLine(r, taste)} 한 달 중 {taste === "snow" ? "눈·비" : "비"} 오는 날 {r.rain.toFixed(0)}일, 해는 {r.day.toFixed(1)}시간 떠 있어요.</p>
        <Notes r={r} alertDate={alertDate} />
        {open && <Festivals r={r} q={q} />}
        <Ribbon r={r} />
      </div>
    </details>
  );
}

function Notes({ r, alertDate }: { r: Result; alertDate: string }) {
  return <>{r.notes.map((n) => <div key={n} className="warn">{n}{n.startsWith("⚠️") && <small> ({alertDate} 기준)</small>}</div>)}</>;
}

interface LiveFest { live: boolean; items?: { title: string; when: string; desc: string }[]; sources?: { title: string; url: string }[]; suggestionsHtml?: string | null }

/** 실시간 행사(Gemini 검색) → 없으면 대표 행사 목록 */
function Festivals({ r, q }: { r: Result; q: Query }) {
  const [live, setLive] = useState<LiveFest | null>(null);
  const [busy, setBusy] = useState(true);
  useEffect(() => {
    let alive = true;
    setBusy(true); setLive(null);
    fetch(`/api/festivals?${new URLSearchParams({ city: r.city.name, start: q.start, end: q.end })}`)
      .then((res) => res.json()).then((j) => { if (alive) setLive(j); })
      .catch(() => { if (alive) setLive({ live: false }); })
      .finally(() => { if (alive) setBusy(false); });
    return () => { alive = false; };
  }, [r.city.name, q.start, q.end]);

  if (busy) return <div className="none">🔎 이 기간에 열리는 행사를 찾는 중…</div>;
  if (live?.live && live.items?.length) {
    return (
      <div className="fests">
        {live.items.map((f) => (
          <div className="fest" key={f.title}><span className="em" aria-hidden="true">🎉</span>
            <div><b>{f.title}</b><span>{f.when}{f.desc ? ` · ${f.desc}` : ""}</span></div>
          </div>
        ))}
        {!!live.sources?.length && (
          <div className="src">출처 {live.sources.map((s, i) => <a key={s.url} href={s.url} target="_blank" rel="noopener">{i ? ", " : " "}{s.title}</a>)}</div>
        )}
        {live.suggestionsHtml && <SearchSuggestions html={live.suggestionsHtml} />}
      </div>
    );
  }
  if (!r.festivals.length) return <div className="none">이 기간에 알려진 큰 축제는 없어요.</div>;
  return (
    <div className="fests">
      {r.festivals.map((f) => (
        <div className="fest" key={f.title}><span className="em" aria-hidden="true">🎉</span><div><b>{f.title}</b><span>{f.when} · 매년 열리는 행사라 올해 날짜를 확인하세요</span></div></div>
      ))}
    </div>
  );
}

/** Google 검색 추천 칩: 구글이 준 HTML을 그대로, 페이지와 분리된 iframe 안에서 보여줘요 */
function SearchSuggestions({ html }: { html: string }) {
  const [h, setH] = useState(64);
  return (
    <iframe className="gsugg" title="Google 검색 추천" srcDoc={`<!doctype html><meta charset="utf-8"><base target="_blank"><body style="margin:0">${html}</body>`}
      sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin" style={{ height: h }}
      onLoad={(e) => { const d = (e.target as HTMLIFrameElement).contentDocument; if (d) setH(Math.min(160, d.body.scrollHeight + 4)); }} />
  );
}

function Ribbon({ r }: { r: Result }) {
  return (
    <div>
      <p className="cap">월별 낮 최고기온</p>
      <div className="ribbon">
        {r.city.hi.map((t, m) => <div key={m} className={r.weights[m] > 0 ? "on" : ""} style={{ background: tempColor(t) }} title={`${m + 1}월 낮 ${t}°`}>{r.weights[m] > 0 ? `${t}°` : ""}</div>)}
      </div>
      <div className="mlab">{r.city.hi.map((_, m) => <span key={m} className={r.weights[m] > 0 ? "on" : ""}>{m + 1}월</span>)}</div>
    </div>
  );
}

/** 받침에 맞춰 '로/으로' (ㄹ 받침은 '로') */
function withRo(word: string) {
  const c = word.charCodeAt(word.length - 1) - 0xac00;
  const jong = c >= 0 && c <= 11171 ? c % 28 : 0;
  return word + (jong === 0 || jong === 8 ? "로" : "으로");
}

/** 공항 출발 안내판: 공항 코드가 촤르륵 넘어가다가 실제 1순위에서 멈춰요 */
const LOAD_MSGS = ["설레는 중…", "출발편 뒤적이는 중…", "여권 찾는 중…", "창가 자리 고르는 중…", "캐리어 꺼내는 중…"];
function Loader({ codes, target, label }: { codes: string[]; target: City | null; label: string }) {
  const [code, setCode] = useState("ICN");
  const [tick, setTick] = useState(0);
  const [landed, setLanded] = useState(false);
  const [k, setK] = useState(0);
  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { if (target) { setCode(target.code); setLanded(true); } return; }
    const flip = setInterval(() => { setCode(codes[Math.floor(Math.random() * codes.length)]); setTick((t) => t + 1); }, 90);
    const msg = setInterval(() => setK((v) => (v + 1) % LOAD_MSGS.length), 520);
    const land = target ? setTimeout(() => { clearInterval(flip); setCode(target.code); setTick((t) => t + 1); setLanded(true); }, 1050) : null;
    return () => { clearInterval(flip); clearInterval(msg); if (land) clearTimeout(land); };
  }, [codes, target]);
  return (
    <div className="loader board" role="status" aria-live="polite">
      <div className="bhead"><span>DEPARTURES</span><span>출발</span></div>
      <div className="brow">
        <span className="from">ICN</span>
        <svg className="bplane" viewBox="0 0 24 24" aria-hidden="true"><path d={PLANE_D} fill="var(--orange)" /></svg>
        <span className="flaps" aria-hidden="true">
          {code.split("").map((ch, i) => <span key={`${i}-${tick}`} className="flap">{ch}</span>)}
        </span>
        <span className={`bstat${landed ? " on" : ""}`}>{landed ? "탑승 확정" : "탐색 중"}</span>
      </div>
      <p className="lmsg">{landed && target ? <>{target.emoji} {withRo(target.name)} 나가요!</> : LOAD_MSGS[k]}</p>
      <span className="lsub">{label}</span>
    </div>
  );
}

/* ───────── 시트 ───────── */

function useSheet(onClose: () => void) {
  useEffect(() => {
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", k);
    return () => { document.body.style.overflow = prev; document.removeEventListener("keydown", k); };
  }, [onClose]);
}

function HolidaySheet({ today, start, end, onPick, onClose }: { today: Date; start: string; end: string; onPick: (a: string, b: string) => void; onClose: () => void }) {
  const [on, setOn] = useState(false);
  const [n, setN] = useState(3);
  useSheet(onClose);
  const list = useMemo(() => holidayOptions(today, on, n), [today, on, n]);
  return (
    <div className="scrim" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="holTitle">
        <h3 id="holTitle">연휴로 채우기</h3>
        <div className="leave">
          <label className="sw"><input type="checkbox" checked={on} onChange={(e) => setOn(e.target.checked)} /><span className="knob" aria-hidden="true" />연차 붙이기</label>
          {on && (
            <div className="step">
              <button type="button" aria-label="연차 하루 줄이기" disabled={n <= 1} onClick={() => setN(n - 1)}>−</button>
              <b aria-live="polite">연차 {n}일</b>
              <button type="button" aria-label="연차 하루 늘리기" disabled={n >= 5} onClick={() => setN(n + 1)}>+</button>
            </div>
          )}
        </div>
        <p className="holhint">연차를 붙이면 주말·공휴일과 이어지는 가장 긴 연휴를 찾아줘요.</p>
        {[...new Set(list.map((o) => o.start.getFullYear()))].map((y) => (
          <section key={y} className="holyear" aria-label={`${y}년 연휴`}>
            <h4>{y}년{y === today.getFullYear() ? " · 올해" : y === today.getFullYear() + 1 ? " · 내년" : ""}</h4>
            <div className="hollist">
              {list.filter((o) => o.start.getFullYear() === y).map((o) => {
                const a = iso(o.start), b = iso(o.end);
                const cross = o.end.getFullYear() !== o.start.getFullYear();
                return (
                  <button key={a + b} type="button" className={`hrow${o.used ? " gold" : ""}`} aria-pressed={a === start && b === end} onClick={() => onPick(a, b)}>
                    <span><b>{o.names.join("·")}</b><small>{dl(o.start)} – {cross ? `${o.end.getFullYear()}.` : ""}{dl(o.end)}</small></span>
                    <span className="hd"><b>{o.len}일</b>{o.used ? <i>연차 {o.used}일</i> : null}</span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
        <button type="button" className="holclose" onClick={onClose}>닫기</button>
      </div>
    </div>
  );
}

function ShareSheet({ r, start, days, rangeText, rainWord, onClose }: { r: Result; start: Date; days: number; rangeText: string; rainWord: string; onClose: () => void }) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [msg, setMsg] = useState("탑승권 발권 중…");
  const [canShare, setCanShare] = useState(false);
  const blobRef = useRef<Blob | null>(null);
  const seq = useRef(0);
  useSheet(onClose);

  async function render(passenger: string) {
    const my = ++seq.current;
    const blob = await drawShareImage({ r, start, days, rangeText, rainWord, passenger });
    if (my !== seq.current) return null; // 더 최신 이름으로 다시 그리는 중이면 버림
    blobRef.current = blob;
    setUrl((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(blob); });
    setMsg("");
    const file = new File([blob], "x.png", { type: "image/png" });
    setCanShare(!!navigator.canShare?.({ files: [file] }));
    return blob;
  }
  useEffect(() => { const t = setTimeout(() => render(name.trim()), name ? 300 : 0); return () => clearTimeout(t); }, [name]); // eslint-disable-line react-hooks/exhaustive-deps

  const filename = `나가요_${r.city.name}.png`;
  async function share() {
    const blob = (await render(name.trim())) ?? blobRef.current;
    if (!blob) return;
    track("share", { method: "web_share", city: r.city.name, with_name: !!name.trim() });
    try {
      await navigator.share({ files: [new File([blob], filename, { type: "image/png" })], text: `나 ${start.getMonth() + 1}월에 ${r.city.name} 가요 ✈️ #나가요여행 nagayo.vercel.app` });
    } catch (e) {
      if ((e as Error).name !== "AbortError") setMsg("공유를 열지 못했어요. 이미지 저장을 눌러주세요.");
    }
  }
  async function save() {
    const blob = (await render(name.trim())) ?? blobRef.current;
    if (!blob) return;
    track("share", { method: "download", city: r.city.name, with_name: !!name.trim() });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    setMsg("저장했어요. 휴대폰에서는 미리보기 이미지를 길게 눌러도 사진에 저장돼요.");
  }

  return (
    <div className="scrim" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="shareTitle">
        <h3 id="shareTitle">탑승권 자랑하기</h3>
        <div className="prev">{url ? <img src={url} alt={`${r.city.name} 탑승권 이미지 미리보기`} /> : <div className="none">발권 중…</div>}</div>
        <label htmlFor="pax">탑승객 이름 (선택)
          <input id="pax" maxLength={12} value={name} onChange={(e) => setName(e.target.value)} placeholder="이름을 넣으면 탑승권에 찍혀요" />
        </label>
        <div className="row">
          <button type="button" className="ghost" onClick={canShare ? save : onClose}>{canShare ? "이미지 저장" : "닫기"}</button>
          <button type="button" className="primary" onClick={canShare ? share : save}>{canShare ? "인스타·카톡으로 공유" : "이미지 저장"}</button>
        </div>
        <p className="msg">{msg}</p>
      </div>
    </div>
  );
}

/* ───────── 아이콘 ───────── */

function Logo() {
  return (
    <svg viewBox="0 0 170 96" aria-hidden="true">
      <defs><mask id="lgT"><rect width="170" height="96" rx="14" fill="#fff" /><circle cx="0" cy="48" r="12" fill="#000" /><circle cx="170" cy="48" r="12" fill="#000" /></mask></defs>
      <rect width="170" height="96" rx="14" fill="#1D3F9E" mask="url(#lgT)" />
      <line x1="118" y1="14" x2="118" y2="82" stroke="#fff" strokeOpacity=".5" strokeWidth="4" strokeDasharray="7 7" />
      <g transform="translate(64 48) rotate(45) scale(2.6) translate(-12 -12)"><path d={PLANE_D} fill="#F28C28" /></g>
      <circle cx="142" cy="34" r="5" fill="#fff" opacity=".9" /><circle cx="142" cy="62" r="5" fill="#fff" opacity=".9" />
    </svg>
  );
}

function TasteIcon({ k }: { k: Taste }) {
  const p = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (k === "hot") return <svg {...p}><circle cx="12" cy="12" r="4.5" /><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" /></svg>;
  if (k === "warm") return <svg {...p}><circle cx="9" cy="9" r="3.5" /><path d="M9 2.5v1.5M2.5 9H4M4.4 4.4l1 1M13.6 4.4l-1 1" /><path d="M8 20h9a4 4 0 0 0 0-8 5 5 0 0 0-9.3 2.2A3 3 0 0 0 8 20z" /></svg>;
  if (k === "cool") return <svg {...p}><path d="M3 8h11a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h8" /></svg>;
  return <svg {...p}><path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7M9 4l3 2 3-2M9 20l3-2 3 2" /></svg>;
}
