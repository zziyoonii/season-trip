"use client";
import { useEffect, useRef, useState } from "react";

const PLANE_D = "M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z";

/**
 * 기본 스크롤바 대신: 오른쪽 점선 항로를 따라 비행기가 미끄러지듯 따라와요.
 * 내리면 아래, 올리면 위를 봐요. 스크롤할 때만 보이고 멈추면 1.5초 뒤 사라져요.
 */
export default function ScrollPlane() {
  const [p, setP] = useState(0);
  const [show, setShow] = useState(false);
  const [can, setCan] = useState(false);
  const [up, setUp] = useState(false);
  const t = useRef<ReturnType<typeof setTimeout>>(undefined);
  const last = useRef(0);
  useEffect(() => {
    const el = document.getElementById("scroller");
    if (!el) return;
    const onScroll = () => {
      const max = el.scrollHeight - el.clientHeight;
      setCan(max > 40);
      setP(max > 0 ? el.scrollTop / max : 0);
      if (Math.abs(el.scrollTop - last.current) > 2) setUp(el.scrollTop < last.current);
      last.current = el.scrollTop;
      setShow(true);
      clearTimeout(t.current);
      t.current = setTimeout(() => setShow(false), 1500);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { el.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); clearTimeout(t.current); };
  }, []);
  if (!can) return null;
  return (
    <div className={`splane${show ? " on" : ""}`} aria-hidden="true">
      <i className="strack" />
      <i className="sdone" style={{ height: `${p * 100}%` }} />
      <span className="sbadge" style={{ top: `${p * 100}%` }}>
        <svg viewBox="0 0 24 24" style={{ transform: `rotate(${up ? -45 : 135}deg)` }}><path d={PLANE_D} fill="var(--accent)" /></svg>
      </span>
    </div>
  );
}
