import type { MetadataRoute } from "next";
import { siteOrigin } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = await siteOrigin();
  return [
    {
      url: `${origin}/`,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${origin}/join`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${origin}/support`,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];
}