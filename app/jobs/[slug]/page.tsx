import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import JobPosting from "@/components/JobPosting";
import { createClient } from "@/lib/supabase/public";
import { jobRowToJob, stripMarkdown } from "@/lib/jobs";

export const revalidate = 60;

async function getPublishedJob(slug: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("jobs")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  return data;
}

export async function generateStaticParams() {
  const supabase = createClient();
  const { data } = await supabase.from("jobs").select("slug").eq("status", "published");

  return (data ?? []).map((job) => ({ slug: job.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const row = await getPublishedJob(slug);
  if (!row) return {};

  const job = jobRowToJob(row);
  const description = stripMarkdown(job.description);
  return {
    title: job.title,
    description,
    openGraph: {
      title: `${job.title} | Inspire Columbia`,
      description,
      url: `https://inspirecolumbia.org/jobs/${job.slug}`,
    },
    twitter: {
      title: `${job.title} | Inspire Columbia`,
      description,
    },
  };
}

export default async function JobPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const row = await getPublishedJob(slug);
  if (!row) notFound();

  return (
    <>
      <SiteHeader currentPath={`/jobs/${slug}`} />
      <JobPosting job={jobRowToJob(row)} />
    </>
  );
}
