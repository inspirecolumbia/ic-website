import type { Metadata } from "next";
import Footer from "@/components/Footer";
import SiteHeader from "@/components/SiteHeader";
import JobPosting, { type Job } from "@/components/JobPosting";
import jobs from "@/data/jobs.json";

const job = (jobs as Job[]).find((j) => j.slug === "associate-2026")!;

export const metadata: Metadata = {
  title: "Associate 2026",
  description: job.description,
  openGraph: {
    title: "Associate 2026 | Inspire Columbia",
    description: job.description,
    url: "https://inspirecolumbia.org/jobs/associate-2026",
  },
  twitter: {
    title: "Associate 2026 | Inspire Columbia",
    description: job.description,
  },
};

export default function Associate2026Page() {
  return (
    <>
      <SiteHeader currentPath="/jobs/associate-2026" />
      <JobPosting job={job} />
      <Footer />
    </>
  );
}
