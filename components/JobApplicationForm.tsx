"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { submitApplication } from "@/app/jobs/actions";
import { SCREENING_QUESTIONS, availableTeams } from "@/lib/screening";

const SCHOOLS = [
  "Allen University",
  "Benedict College",
  "Columbia College",
  "Columbia International University",
  "Midlands Technical College",
  "University of South Carolina, Columbia",
];

const YEAR_OF_STUDY_OPTIONS = [
  "Freshman",
  "Sophomore",
  "Junior",
  "Senior",
  "Master's student",
  "PhD candidate",
];

// Input/Textarea/SelectTrigger hardcode --admin-border-strong/--admin-brand
// directly rather than the semantic --border/--ring tokens, so on this
// public page they'd otherwise show admin's cool-toned border instead of
// the public site's --line/--brand. Overridden per-instance via className
// (cn() uses tailwind-merge, so this correctly replaces the conflicting
// utility classes) rather than editing the shared components, since those
// are also used, tested, and already shipped for /admin.
const fieldClassName =
  "w-full border-[var(--line)] focus-visible:border-[var(--brand)] focus-visible:ring-[var(--brand)]/25";

export default function JobApplicationForm({
  jobId,
  jobTitle,
  jobSlug,
}: {
  jobId: string;
  jobTitle: string;
  jobSlug: string;
}) {
  const [state, formAction, pending] = useActionState(submitApplication, null);
  const [choice1, setChoice1] = useState<string>("");
  const [choice2, setChoice2] = useState<string>("");
  const [choice3, setChoice3] = useState<string>("");

  if (state && "ok" in state) {
    return (
      <main className="mx-auto w-full max-w-[70ch] px-6 py-16 text-center text-[var(--ink)] md:px-8">
        <h1 className="mb-4 [font-family:var(--font-serif)] text-[clamp(1.8rem,4vw,2.6rem)] font-semibold">
          Application submitted
        </h1>
        <p className="text-[1.05rem] text-[var(--ink-muted)]">
          Thanks for applying to {jobTitle}. We&apos;ll be in touch.
        </p>
        <Link href={`/jobs/${jobSlug}`} className="mt-6 inline-block font-semibold text-[var(--brand)] no-underline hover:underline">
          Back to the job posting
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-[70ch] px-6 py-12 text-[var(--ink)] md:px-8">
      <p className="m-0 text-[0.9rem] font-bold uppercase tracking-[0.08em] text-[var(--ink-muted)]">
        {jobTitle}
      </p>
      <h1 className="mb-8 mt-2 [font-family:var(--font-serif)] text-[clamp(1.8rem,4vw,2.6rem)] font-semibold">
        Apply now
      </h1>

      <form action={formAction} className="flex flex-col gap-6" encType="multipart/form-data">
        <input type="hidden" name="job_id" value={jobId} />

        {state && "error" in state && (
          <p className="border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {state.error}
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="first_name">First name</Label>
            <Input id="first_name" name="first_name" required className={fieldClassName} />
          </div>
          <div>
            <Label htmlFor="last_name">Last name</Label>
            <Input id="last_name" name="last_name" required className={fieldClassName} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="email">Personal email</Label>
            <Input id="email" name="email" type="email" required className={fieldClassName} />
          </div>
          <div>
            <Label htmlFor="school_email">School email</Label>
            <Input id="school_email" name="school_email" type="email" required className={fieldClassName} />
          </div>
        </div>

        <div>
          <Label htmlFor="phone">Phone number</Label>
          <Input id="phone" name="phone" type="tel" className={fieldClassName} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="school">School</Label>
            <Select name="school">
              <SelectTrigger id="school" className={fieldClassName}>
                <SelectValue placeholder="Choose your school" />
              </SelectTrigger>
              <SelectContent>
                {SCHOOLS.map((school) => (
                  <SelectItem key={school} value={school}>
                    {school}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="year_of_study">Year of study</Label>
            <Select name="year_of_study">
              <SelectTrigger id="year_of_study" className={fieldClassName}>
                <SelectValue placeholder="Choose your year" />
              </SelectTrigger>
              <SelectContent>
                {YEAR_OF_STUDY_OPTIONS.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="major">Major / field of study</Label>
            <Input id="major" name="major" required className={fieldClassName} />
          </div>
          <div>
            <Label htmlFor="gpa">GPA (optional)</Label>
            <Input id="gpa" name="gpa" type="number" step="0.01" min="0" max="4" className={fieldClassName} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="resume">Resume (PDF, max 5 MB)</Label>
            <Input id="resume" name="resume" type="file" accept=".pdf,application/pdf" required className={fieldClassName} />
          </div>
          <div>
            <Label htmlFor="transcript">Unofficial transcript (PDF, max 5 MB)</Label>
            <Input id="transcript" name="transcript" type="file" accept=".pdf,application/pdf" required className={fieldClassName} />
          </div>
        </div>

        <fieldset className="border-t border-[var(--line)] pt-6">
          <legend className="mb-1 text-[1.05rem] font-semibold">Team preferences</legend>
          <p className="mb-4 text-sm text-[var(--ink-muted)]">
            Rank your top 3 teams you&apos;d like to serve on.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: "1st choice", name: "team_choice_1", value: choice1, setValue: setChoice1, exclude: [choice2, choice3] },
              { label: "2nd choice", name: "team_choice_2", value: choice2, setValue: setChoice2, exclude: [choice1, choice3] },
              { label: "3rd choice", name: "team_choice_3", value: choice3, setValue: setChoice3, exclude: [choice1, choice2] },
            ].map(({ label, name, value, setValue, exclude }) => (
              <div key={name}>
                <Label htmlFor={name}>{label}</Label>
                <Select name={name} value={value} onValueChange={(v) => setValue(v as string)}>
                  <SelectTrigger id={name} className={fieldClassName}>
                    <SelectValue placeholder="Choose a team" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTeams(exclude).map((team) => (
                      <SelectItem key={team} value={team}>
                        {team}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </fieldset>

        <fieldset className="border-t border-[var(--line)] pt-6">
          <legend className="mb-4 text-[1.05rem] font-semibold">A few more questions</legend>
          <div className="flex flex-col gap-4">
            {(["livesNearColumbia", "authorizedToWork", "needsVisaSponsorship"] as const).map((key) => {
              const config = SCREENING_QUESTIONS[key];
              return (
                <div key={key}>
                  <Label htmlFor={key}>{config.question}</Label>
                  <Select name={key}>
                    <SelectTrigger id={key} className={fieldClassName}>
                      <SelectValue placeholder="Choose an answer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes">Yes</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              );
            })}

            <div>
              <Label htmlFor="whatAppeals">{SCREENING_QUESTIONS.whatAppeals.question} (optional)</Label>
              <p className="mb-1.5 text-sm text-[var(--ink-muted)]">
                This question is entirely optional! This is just for you to include additional
                information about yourself and your motivation for joining our team that we
                aren&apos;t able to get directly from reading a resume. Please feel free to answer
                with 2 sentences, 2 paragraphs, or no words at all. Leaving this question blank will
                not negatively affect your candidacy.
              </p>
              <Textarea id="whatAppeals" name="whatAppeals" rows={4} className={fieldClassName} />
            </div>
          </div>
        </fieldset>

        <Button type="submit" disabled={pending} className="self-start">
          {pending ? "Submitting..." : "Submit application"}
        </Button>
      </form>
    </main>
  );
}
