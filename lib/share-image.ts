"use client";
import { seoulDiff } from "./climate";
import type { Result } from "./types";

const PLANE_D = "M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z";
const FONT = '"Noto Sans KR", sans-serif';
const EMOJI = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

function rr(x: CanvasRenderingContext2D, X: number, Y: number, w: number, h: number, r: number) {
  x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r);
  x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath();
}
function plane(x: CanvasRenderingContext2D, cx: number, cy: number, size: number, rot: number, color: string) {
  x.save(); x.translate(cx, cy); x.rotate((rot * Math.PI) / 180); x.scale(size / 24, size / 24); x.translate(-12, -12);
  x.fillStyle = color; x.fill(new Path2D(PLANE_D)); x.restore();
}
function fit(x: CanvasRenderingContext2D, text: string, weight: number, size: number, maxW: number) {
  let f = size;
  do { x.font = `${weight} ${f}px ${FONT}`; f -= 4; } while (x.measureText(text).width > maxW && f > 40);
}

export interface ShareInput { r: Result; start: Date; days: number; rangeText: string; rainWord: string; passenger: string }

/** 인스타 스토리 크기(1080×1920) "나 ○월에 ○○ 가요" 탑승권 이미지 */
export async function drawShareImage({ r, start, days, rangeText, rainWord, passenger }: ShareInput): Promise<Blob> {
  try { await Promise.all(["900 100px", "800 40px", "700 30px", "500 30px"].map((f) => document.fonts.load(`${f} ${FONT}`, "가나다ICN"))); } catch { /* 폰트 로딩 실패해도 기본 폰트로 그림 */ }
  const W = 1080, H = 1920, BG = "#F1F3F7", NAVY = "#1D3F9E", ORANGE = "#F28C28", INK = "#191F28", MUTED = "#6B7684", SOFT = "#C9D5F5";
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const x = c.getContext("2d")!;
  const { city } = r;
  x.fillStyle = BG; x.fillRect(0, 0, W, H);

  // 헤드라인
  x.fillStyle = INK; x.font = `900 104px ${FONT}`;
  x.fillText(`나 ${start.getMonth() + 1}월에`, 80, 290);
  fit(x, `${city.name} 가요`, 900, 104, 620);
  x.fillText(city.name + " ", 80, 410);
  const nw = x.measureText(city.name + " ").width;
  x.fillStyle = ORANGE; x.fillText("가요", 80 + nw, 410);
  x.fillStyle = "#4E5968"; x.font = `500 34px ${FONT}`;
  x.fillText(`${days - 1}박 ${days}일, 날씨 보고 고른 제철 여행지`, 80, 490);

  // 이모지 스티커
  const sticker = (cx: number, cy: number, rad: number, emo: string, fs: number, rot: number) => {
    x.save(); x.translate(cx, cy); x.rotate((rot * Math.PI) / 180);
    x.shadowColor = "rgba(29,63,158,.25)"; x.shadowBlur = 40; x.shadowOffsetY = 18;
    x.fillStyle = "#fff"; x.beginPath(); x.arc(0, 0, rad, 0, Math.PI * 2); x.fill();
    x.shadowColor = "transparent"; x.font = `${fs}px ${EMOJI}`; x.textAlign = "center"; x.textBaseline = "middle";
    x.fillText(emo, 0, 6); x.restore();
  };
  sticker(870, 250, 125, city.emoji, 140, 8);
  sticker(735, 400, 62, "🧳", 66, -10);

  // 탑승권
  const tx = 80, ty = 640, tw = 920, topH = 560, botH = 230;
  x.save();
  x.translate(tx + tw / 2, ty + (topH + botH) / 2); x.rotate((-1.5 * Math.PI) / 180); x.translate(-(tx + tw / 2), -(ty + (topH + botH) / 2));
  x.shadowColor = "rgba(29,63,158,.35)"; x.shadowBlur = 70; x.shadowOffsetY = 30;
  x.fillStyle = "#fff"; rr(x, tx, ty, tw, topH + botH, 44); x.fill(); x.shadowColor = "transparent";
  x.save(); rr(x, tx, ty, tw, topH + botH, 44); x.clip(); x.fillStyle = NAVY; x.fillRect(tx, ty, tw, topH); x.restore();
  const L = tx + 58, Rt = tx + tw - 58;
  x.textAlign = "left"; x.font = `800 28px ${FONT}`; x.fillStyle = "#F7A456"; x.fillText("BOARDING PASS", L, ty + 78);
  x.textAlign = "right"; x.fillStyle = SOFT; x.font = `700 28px ${FONT}`; x.fillText(passenger ? `탑승객 ${passenger}` : "나가요 탑승권", Rt, ty + 78);
  x.textAlign = "left"; x.font = `500 26px ${FONT}`; x.fillText("출발", L, ty + 168);
  x.fillStyle = "#fff"; x.font = `900 116px ${FONT}`; x.fillText("ICN", L - 4, ty + 282);
  x.fillStyle = SOFT; x.font = `500 30px ${FONT}`; x.fillText("인천", L, ty + 330);
  x.textAlign = "right"; x.font = `500 26px ${FONT}`; x.fillText("도착", Rt, ty + 168);
  x.fillStyle = "#fff"; x.font = `900 116px ${FONT}`; x.fillText(city.code, Rt + 4, ty + 282);
  x.fillStyle = SOFT; fit(x, city.name, 500, 30, 300); x.fillText(city.name, Rt, ty + 330);
  plane(x, tx + tw / 2, ty + 232, 72, 45, ORANGE);
  x.textAlign = "center"; x.fillStyle = SOFT; x.font = `500 26px ${FONT}`; x.fillText(`${city.flight}시간`, tx + tw / 2, ty + 300);
  x.strokeStyle = "rgba(255,255,255,.18)"; x.lineWidth = 2; x.beginPath(); x.moveTo(L, ty + 380); x.lineTo(Rt, ty + 380); x.stroke();
  const cols: [string, string][] = [["날짜", rangeText], ["현지 날씨", `${r.hi.toFixed(0)}° / ${r.lo.toFixed(0)}°`], ["서울 대비", seoulDiff(r.seoul)]];
  cols.forEach(([k, v], i) => {
    const cx = L + i * ((Rt - L) / 3);
    x.textAlign = "left"; x.fillStyle = SOFT; x.font = `500 26px ${FONT}`; x.fillText(k, cx, ty + 440);
    x.fillStyle = i === 2 ? "#F7A456" : "#fff"; x.font = `800 40px ${FONT}`; x.fillText(v, cx, ty + 496);
  });
  // 절취선
  x.strokeStyle = "#DCE1E8"; x.lineWidth = 4; x.setLineDash([16, 14]);
  x.beginPath(); x.moveTo(tx + 44, ty + topH); x.lineTo(tx + tw - 44, ty + topH); x.stroke(); x.setLineDash([]);
  x.fillStyle = BG; [tx, tx + tw].forEach((cx) => { x.beginPath(); x.arc(cx, ty + topH, 28, 0, Math.PI * 2); x.fill(); });
  // 아래 칸: 축제 또는 날씨 한 줄 + 바코드
  const fest = r.festivals[0];
  const by = ty + topH + botH / 2;
  x.textAlign = "left"; x.textBaseline = "middle"; x.font = `64px ${EMOJI}`; x.fillText(fest ? "🎉" : "🌤️", L, by + 4);
  x.fillStyle = MUTED; x.font = `500 26px ${FONT}`; x.fillText(fest ? "마침 이 기간에" : "이 기간 날씨", L + 88, by - 26);
  x.fillStyle = INK; const bt = fest ? fest.title : `한 달 중 ${rainWord} 오는 날 ${r.rain.toFixed(0)}일`;
  fit(x, bt, 900, 38, 520); x.fillText(bt, L + 88, by + 20);
  let bx = Rt - 150; x.fillStyle = INK;
  [4, 2, 6, 2, 2, 5, 3, 2, 6, 2, 4, 2, 2, 5].forEach((bw, i) => { if (i % 2 === 0) x.fillRect(bx, by - 42, bw, 84); bx += bw + 3; });
  x.restore(); x.textBaseline = "alphabetic";

  // 하단 로고
  const fx = 80, fy = 1700;
  x.save(); x.translate(fx + 60, fy + 34); x.rotate((-4 * Math.PI) / 180); x.translate(-60, -34);
  x.fillStyle = NAVY; rr(x, 0, 0, 120, 68, 10); x.fill();
  x.fillStyle = BG; [0, 120].forEach((cx) => { x.beginPath(); x.arc(cx, 34, 8.5, 0, Math.PI * 2); x.fill(); });
  x.strokeStyle = "rgba(255,255,255,.5)"; x.lineWidth = 2; x.setLineDash([4, 4]); x.beginPath(); x.moveTo(83, 10); x.lineTo(83, 58); x.stroke(); x.setLineDash([]);
  x.fillStyle = "#fff"; x.font = `900 20px ${FONT}`; x.textAlign = "left"; x.fillText("나가요", 11, 41);
  plane(x, 102, 34, 20, 45, ORANGE); x.restore();
  x.fillStyle = INK; x.font = `900 44px ${FONT}`; x.fillText("나가요", fx + 144, fy + 30);
  x.fillStyle = MUTED; x.font = `500 26px ${FONT}`; x.fillText("날씨 보고 고르는 제철 여행지 · nagayo.vercel.app", fx + 144, fy + 72);

  return new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("이미지를 만들지 못했어요"))), "image/png"));
}
