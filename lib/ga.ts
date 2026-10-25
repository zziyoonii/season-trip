"use client";
/** GA4 이벤트. NEXT_PUBLIC_GA_ID 가 없으면 아무것도 안 해요 */
type Params = Record<string, string | number | boolean | undefined>;
declare global { interface Window { gtag?: (...args: unknown[]) => void } }
export function track(event: string, params: Params = {}) {
  if (typeof window !== "undefined" && window.gtag) window.gtag("event", event, params);
}
