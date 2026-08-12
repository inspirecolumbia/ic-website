import Link from "next/link";
import { notFound } from "next/navigation";
import { createClerkSupabaseClient } from "@/lib/supabase/clerk";
import { jobRowToJob } from "@/lib/jobs";
import JobPosting from "@/components/JobPosting";
import SiteHeader from "@/components/SiteHeader";

export default async function PreviewJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createClerkSupabaseClient();
  const { data: job } = await supabase.from("jobs").select("*").eq("id", id).maybeSingle();

  if (!job) notFound();

  return (
    <>
      <div className="flex items-center justify-between bg-yellow-100 px-6 py-2 text-sm font-medium text-yellow-900">
        <span>Preview mode, this job is not live at this URL. Status: {job.status}</span>
        <Link href="/admin/jobs" className="underline">
          ← Back to jobs
        </Link>
      </div>
      <SiteHeader currentPath={`/jobs/${job.slug}`} />
      <JobPosting job={jobRowToJob(job)} />
    </>
  );
}
