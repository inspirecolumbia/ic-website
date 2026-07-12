import type { Metadata } from "next";
import Footer from "@/components/Footer";
import SiteHeader from "@/components/SiteHeader";
import JobPosting, { type Job } from "@/components/JobPosting";
import jobs from "@/data/jobs.json";

const job = (jobs as Job[]).find((j) => j.slug === "high-school-fellow")!;

export const metadata: Metadata = {
  title: "High School Fellow",
  description: job.description,
  openGraph: {
    title: "High School Fellow | Inspire Columbia",
    description: job.description,
    url: "https://inspirecolumbia.org/jobs/high-school-fellow",
  },
  twitter: {
    title: "High School Fellow | Inspire Columbia",
    description: job.description,
  },
};

export default function HighSchoolFellowPage() {
  return (
    <>
      <SiteHeader currentPath="/jobs/high-school-fellow" />
      <JobPosting job={job} />
      <Footer />
    </>
  );
}
