import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/public";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient();
  const { data } = await supabase
    .from("jobs")
    .select("slug, published_at")
    .eq("status", "published");

  const jobEntries: MetadataRoute.Sitemap = (data ?? []).map((job) => ({
    url: `https://inspirecolumbia.org/positions/${job.slug}`,
    lastModified: job.published_at ? new Date(job.published_at) : new Date(),
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [
    {
      url: "https://inspirecolumbia.org",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: "https://inspirecolumbia.org/about",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: "https://inspirecolumbia.org/leadership",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: "https://inspirecolumbia.org/donate",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: "https://inspirecolumbia.org/positions",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...jobEntries,
  ];
}
