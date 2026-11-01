import type { MetadataRoute } from "next";

const BASE = "https://nagayo.vercel.app";
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: BASE, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${BASE}/leave`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/guide`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    ...Array.from({ length: 12 }, (_, i) => ({ url: `${BASE}/guide/${i + 1}`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.7 })),
    { url: `${BASE}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];
}
