"use client";
import { useEffect, useRef } from "react";
import { ADS_CLIENT, ADS_SLOT } from "@/lib/ads";

declare global { interface Window { adsbygoogle?: unknown[] } }

/**
 * AdSense 광고 한 칸. 게시자 ID와 광고 단위 ID가 둘 다 있어야 보여요.
 * 탑승권·연차 카드 사이에는 넣지 않고, 결과 맨 아래에만 둬요.
 */
export default function AdSlot({ slot }: { slot?: string }) {
  const client = ADS_CLIENT;
  const id = slot || ADS_SLOT;
  const pushed = useRef(false);
  useEffect(() => {
    if (!client || !id || pushed.current) return;
    pushed.current = true;
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch { /* 광고 차단 등 */ }
  }, [client, id]);
  if (!client || !id) return null;
  return (
    <div className="adslot" aria-label="광고">
      <span className="adlabel">광고</span>
      <ins className="adsbygoogle" style={{ display: "block" }} data-ad-client={client} data-ad-slot={id} data-ad-format="auto" data-full-width-responsive="true" />
    </div>
  );
}
