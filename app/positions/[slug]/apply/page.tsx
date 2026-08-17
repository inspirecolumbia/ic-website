import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import JobApplicationForm from "@/components/JobApplicationForm";
import { createClient } from "@/lib/supabase/public";
import { jobRowToJob } from "@/lib/jobs";

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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const row = await getPublishedJob(slug);
  if (!row) return {};

  const job = jobRowToJob(row);
  return {
    title: `Apply | ${job.title}`,
    description: `Apply for ${job.title} at Inspire Columbia.`,
  };
}

export default async function ApplyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const row = await getPublishedJob(slug);
  if (!row) notFound();

  const job = jobRowToJob(row);

  // Staff opted for an external application form for this job -- send a
  // stray/bookmarked link to /apply somewhere useful instead of a dead end.
  if (job.applyUrl) redirect(job.applyUrl);

  return (
    <>
      <SiteHeader currentPath={`/positions/${slug}/apply`} />
      <JobApplicationForm jobId={job.id} jobTitle={job.title} jobSlug={job.slug} />
    </>
  );
}
