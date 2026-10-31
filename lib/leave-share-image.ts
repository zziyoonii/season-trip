"use client";
import { EMOJI, FONT, plane, rr } from "./share-image";
import { PUBLIC_HOLIDAYS, addDays, iso } from "./holidays";
import { fmtDays, rest, type LeaveWindow } from "./leave";

export interface LeaveShareInput {
  windows: LeaveWindow[];
  /** 연차 총 사용 일수 */
  used: number;
  /** 그때 갈 곳 (첫 구간의 추천지) */
  city?: { name: string; emoji: string } | null;
}

const BG = "#F1F3F7", NAVY = "#1D3F9E", ORANGE = "#F28C28", INK = "#191F28", MUTED = "#6B7684", RED = "#E5484D";
const dayNum = (d: Date) => Math.round(d.getTime() / 864e5);

/** 인스타 스토리 크기(1080×1920) "연차 ○일로 ○일 쉰다" 달력 이미지 */
export async function drawLeaveShareImage({ windows, used, city }: LeaveShareInput): Promise<Blob> {
  try { await Promise.all(["900 100px", "800 40px", "700 30px", "500 30px"].map((f) => document.fonts.load(`${f} ${FONT}`, "가나다0123"))); } catch { /* 기본 폰트로 그림 */ }
  const W = 1080, H = 1920;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const x = c.getContext("2d")!;
  x.fillStyle = BG; x.fillRect(0, 0, W, H);

  const total = windows.reduce((s, w) => s + rest(w), 0);
  const usedTxt = `${used}`;
  const totalTxt = fmtDays(total);

  // 헤드라인: 연차 8일로 / 16일 쉰다
  x.textBaseline = "alphabetic"; x.textAlign = "left";
  x.fillStyle = INK; x.font = `900 108px ${FONT}`;
  x.fillText("연차 ", 80, 280);
  let px = 80 + x.measureText("연차 ").width;
  x.fillStyle = ORANGE; x.fillText(`${usedTxt}일`, px, 280);
  px += x.measureText(`${usedTxt}일`).width;
  x.fillStyle = INK; x.fillText("로", px, 280);
  x.fillStyle = ORANGE; x.fillText(totalTxt, 80, 410);
  px = 80 + x.measureText(totalTxt).width;
  x.fillStyle = INK; x.fillText(" 쉰다", px, 410);
  x.fillStyle = "#4E5968"; x.font = `500 36px ${FONT}`;
  x.fillText(windows.length > 1 ? `${windows.length}번에 나눠서, 주말·공휴일 꽉 채워 쉬기` : "주말·공휴일 꽉 채워서 쉬기", 80, 490);

  // 달력: 구간이 걸친 주만 (사이에 빈 주가 길면 "⋯"로 건너뜀)
  const inWin = (d: Date) => windows.find((w) => d >= w.start && d <= w.end);
  const weekStart = (d: Date) => addDays(d, -d.getDay());
  const weeks: (Date | null)[] = [];
  const sorted = [...windows].sort((a, b) => a.start.getTime() - b.start.getTime());
  sorted.forEach((w, i) => {
    const from = weekStart(w.start), to = weekStart(w.end);
    if (i > 0) {
      const last = weeks[weeks.length - 1];
      if (last && dayNum(from) - dayNum(last) > 7) weeks.push(null);
    }
    for (let d = from; d <= to; d = addDays(d, 7)) if (!weeks.some((v) => v && dayNum(v) === dayNum(d))) weeks.push(d);
  });

  const cx = 80, cw = 920, top = 580;
  const rows = weeks.length, rowH = Math.min(118, Math.floor(560 / Math.max(rows, 1))); // 카드가 1410px 안에서 끝나게
  const cardH = 150 + rows * rowH + 120;
  x.save(); x.shadowColor = "rgba(29,63,158,.18)"; x.shadowBlur = 60; x.shadowOffsetY = 24;
  x.fillStyle = "#fff"; rr(x, cx, top, cw, cardH, 44); x.fill(); x.restore();

  const gx = cx + 40, gw = cw - 80, cell = gw / 7;
  x.textAlign = "center"; x.font = `700 28px ${FONT}`;
  "일월화수목금토".split("").forEach((h, i) => { x.fillStyle = i === 0 ? RED : i === 6 ? NAVY : MUTED; x.fillText(h, gx + cell * i + cell / 2, top + 80); });

  let y = top + 110;
  let labelNext = true; // 첫 칸과 "⋯" 다음 첫 칸에는 월을 표시
  for (const ws of weeks) {
    if (!ws) {
      labelNext = true;
      x.fillStyle = MUTED; x.font = `800 40px ${FONT}`; x.textAlign = "center"; x.fillText("⋯", gx + gw / 2, y + rowH / 2 + 12);
      y += rowH; continue;
    }
    for (let i = 0; i < 7; i++) {
      const d = addDays(ws, i);
      const w = inWin(d);
      const hol = PUBLIC_HOLIDAYS.has(iso(d));
      const wkend = d.getDay() === 0 || d.getDay() === 6;
      const half = !!(w && w.half && dayNum(d) === dayNum(w.start));
      const leave = !!(w && !hol && !wkend && !half);
      let bg = "#F7F8FA", fg = "#C3C9D1";
      if (w) {
        if (half) { bg = "#FBD7B0"; fg = "#9A4A08"; }
        else if (leave) { bg = ORANGE; fg = "#fff"; }
        else if (hol) { bg = "#FDE7E8"; fg = RED; }
        else { bg = "#E8EEFC"; fg = NAVY; }
      }
      const bx = gx + cell * i + 5, by = y + 5, bw = cell - 10, bh = rowH - 10;
      x.fillStyle = bg; rr(x, bx, by, bw, bh, 18); x.fill();
      const newMonth = (labelNext && i === 0) || d.getDate() === 1;
      x.fillStyle = fg; x.font = `800 ${Math.round(rowH * 0.32)}px ${FONT}`;
      x.fillText(String(d.getDate()), bx + bw / 2, by + bh / 2 + rowH * 0.11 + (newMonth || half ? 6 : 0));
      if (newMonth || half) {
        x.font = `700 ${Math.round(rowH * 0.16)}px ${FONT}`;
        x.fillText(half ? "반차" : `${d.getMonth() + 1}월`, bx + bw / 2, by + rowH * 0.24);
      }
    }
    labelNext = false;
    y += rowH;
  }

  // 범례
  const ly = y + 50;
  const legend: [string, string][] = [[ORANGE, "연차"], ["#FBD7B0", "반차"], ["#E8EEFC", "주말"], ["#FDE7E8", "공휴일"]];
  const hasHalf = windows.some((w) => w.half);
  let lx = gx; x.textAlign = "left"; x.font = `600 28px ${FONT}`;
  legend.filter(([, t]) => t !== "반차" || hasHalf).forEach(([col, t]) => {
    x.fillStyle = col; rr(x, lx, ly - 24, 28, 28, 7); x.fill();
    x.fillStyle = "#4E5968"; x.fillText(t, lx + 40, ly);
    lx += 40 + x.measureText(t).width + 40;
  });

  // 그때 갈 곳
  const cy = top + cardH + 120;
  if (city) {
    x.textAlign = "left";
    x.fillStyle = MUTED; x.font = `600 34px ${FONT}`; x.fillText("그때 날씨 좋은 곳", 80, cy);
    x.font = `100px ${EMOJI}`; x.fillText(city.emoji, 76, cy + 120);
    x.fillStyle = INK; x.font = `900 76px ${FONT}`; x.fillText(`${withRo(city.name)} 나가요`, 210, cy + 108);
  }

  // 하단 로고
  const fx = 80, fy = 1720;
  x.save(); x.translate(fx + 60, fy + 34); x.rotate((-4 * Math.PI) / 180); x.translate(-60, -34);
  x.fillStyle = NAVY; rr(x, 0, 0, 120, 68, 10); x.fill();
  x.fillStyle = BG; [0, 120].forEach((cx2) => { x.beginPath(); x.arc(cx2, 34, 8.5, 0, Math.PI * 2); x.fill(); });
  x.strokeStyle = "rgba(255,255,255,.5)"; x.lineWidth = 2; x.setLineDash([4, 4]); x.beginPath(); x.moveTo(83, 10); x.lineTo(83, 58); x.stroke(); x.setLineDash([]);
  plane(x, 45, 34, 36, 45, ORANGE);
  x.fillStyle = "rgba(255,255,255,.9)"; [24, 44].forEach((cy2) => { x.beginPath(); x.arc(100, cy2, 3.5, 0, Math.PI * 2); x.fill(); });
  x.restore();
  x.textAlign = "left";
  x.fillStyle = INK; x.font = `900 44px ${FONT}`; x.fillText("나가요", fx + 144, fy + 30);
  x.fillStyle = MUTED; x.font = `500 26px ${FONT}`; x.fillText("내 연차로 며칠 쉴까? · nagayo.vercel.app", fx + 144, fy + 72);

  return new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("이미지를 만들지 못했어요"))), "image/png"));
}

/** 받침에 맞춰 '로/으로' (ㄹ 받침은 '로') */
function withRo(word: string) {
  const c = word.charCodeAt(word.length - 1) - 0xac00;
  const jong = c >= 0 && c <= 11171 ? c % 28 : 0;
  return word + (jong === 0 || jong === 8 ? "로" : "으로");
}
