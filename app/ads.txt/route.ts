// AdSense 승인용 ads.txt. NEXT_PUBLIC_ADSENSE_CLIENT(ca-pub-…)가 있으면 그 번호로 만들어요
export const dynamic = "force-static";
export function GET() {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  const body = client ? `google.com, ${client.replace(/^ca-/, "")}, DIRECT, f08c47fec0942fa0\n` : "";
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
