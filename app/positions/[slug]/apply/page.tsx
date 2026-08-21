import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import JobApplicationForm from "@/components/JobApplicationForm";
import { createClient } from "@/lib/supabase/public";
import { jobRowToJob } from "@/lib/jobs";

// Every template renders the same fields except this one -- see
// JobApplicationForm's showTeamPreferences prop. Matched by name, the same
// way JobForm's template picker already surfaces template.name to staff.
const GENERAL_APPLICATION_TEMPLATE_NAME = "General Application";

async function getPublishedJob(slug: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("jobs")
    .select("*, application_templates(name)")
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

  // Belt and suspenders: createJob/updateJob already refuse to save a job as
  // published while accepting_applications is false (see app/admin/actions.ts),
  // so a published-but-not-accepting job shouldn't exist -- this is what
  // actually enforces "no working apply form" if that ever changes.
  if (!job.acceptingApplications) notFound();

  // Staff opted for an external application form for this job -- send a
  // stray/bookmarked link to /apply somewhere useful instead of a dead end.
  if (job.applyUrl) redirect(job.applyUrl);

  const showTeamPreferences = row.application_templates?.name !== GENERAL_APPLICATION_TEMPLATE_NAME;

  return (
    <>
      <SiteHeader currentPath={`/positions/${slug}/apply`} />
      <JobApplicationForm
        jobId={job.id}
        jobTitle={job.title}
        jobSlug={job.slug}
        showTeamPreferences={showTeamPreferences}
      />
    </>
  );
}
