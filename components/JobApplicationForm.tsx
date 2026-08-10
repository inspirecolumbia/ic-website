"use client";

import { useActionState, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { submitApplication } from "@/app/jobs/actions";
import { SCHOOLS, SCREENING_QUESTIONS, YEAR_OF_STUDY_OPTIONS, availableTeams } from "@/lib/screening";

// Shared by every RadioGroupItem on this page -- pulled out once these
// fields (school, year of study) needed the same styling as the eligibility
// section's Yes/No radios, instead of a 3rd/4th copy of the same string.
const radioItemClassName =
  "border-[var(--line)] data-checked:border-[var(--brand)] [&_[data-slot=radio-group-item-indicator]]:after:bg-[var(--brand)]";

// Input/Textarea/SelectTrigger hardcode --admin-border-strong/--admin-brand
// directly rather than the semantic --border/--ring tokens, so on this
// public page they'd otherwise show admin's cool-toned border instead of
// the public site's --line/--brand. Overridden per-instance via className
// (cn() uses tailwind-merge, so this correctly replaces the conflicting
// utility classes) rather than editing the shared components, since those
// are also used, tested, and already shipped for /admin. Also bumps height
// so fields don't look thin next to the rest of the redesigned form.
const fieldClassName =
  "h-11 w-full border-[var(--line)] px-3.5 focus-visible:border-[var(--brand)] focus-visible:ring-[var(--brand)]/25";

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="border-t border-[var(--line)] pt-7 first:border-t-0 first:pt-0">
      <legend className="mb-4 [font-family:var(--font-serif)] text-[1.15rem] font-semibold text-[var(--ink)]">
        {title}
      </legend>
      <div className="flex flex-col gap-5">{children}</div>
    </fieldset>
  );
}

function FileUploadField({
  id,
  name,
  label,
}: {
  id: string;
  name: string;
  label: string;
}) {
  const [fileName, setFileName] = useState<string | null>(null);

  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <label
        htmlFor={id}
        className="mt-1.5 flex cursor-pointer items-center gap-3 rounded-md border border-dashed border-[var(--line)] bg-[var(--card-public)] px-4 py-3.5 text-sm text-[var(--ink-muted)] transition-colors hover:border-[var(--brand)] hover:bg-[var(--surface-blue)]"
      >
        <Upload className="size-5 shrink-0 text-[var(--brand)]" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate">
          {fileName ? (
            <span className="font-medium text-[var(--ink)]">{fileName}</span>
          ) : (
            "Choose a file"
          )}
        </span>
        <span className="shrink-0 text-xs text-[var(--ink-muted)]">PDF, max 5 MB</span>
      </label>
      <input
        id={id}
        name={name}
        type="file"
        accept=".pdf,application/pdf"
        required
        className="sr-only"
        onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
      />
    </div>
  );
}

// RadioGroup is deliberately uncontrolled-by-form here (no `name` on the
// group itself) -- if it submitted its own hidden input under the same
// `name` as the free-text "Other" field below, a submitted form would carry
// two values for that key and formData.get() would silently pick whichever
// happened to be first in the DOM. Only one real input (hidden when a fixed
// option is chosen, visible when "Other" is chosen) ever carries `name`.
function RadioWithOther({
  name,
  options,
  otherPlaceholder,
}: {
  name: string;
  options: string[];
  otherPlaceholder: string;
}) {
  const [choice, setChoice] = useState("");
  const [otherValue, setOtherValue] = useState("");

  return (
    <div>
      <RadioGroup value={choice} onValueChange={(v) => setChoice(v as string)} className="flex flex-col gap-2">
        {[...options, "Other"].map((option) => (
          <label
            key={option}
            htmlFor={`${name}-${option}`}
            className="flex items-center gap-2 text-sm text-[var(--ink)]"
          >
            <RadioGroupItem id={`${name}-${option}`} value={option} className={radioItemClassName} />
            {option}
          </label>
        ))}
      </RadioGroup>
      {choice === "Other" ? (
        <Input
          name={name}
          required
          placeholder={otherPlaceholder}
          value={otherValue}
          onChange={(e) => setOtherValue(e.target.value)}
          className={`${fieldClassName} mt-2`}
        />
      ) : (
        // No `required` here -- a hidden input can't be focused, so the
        // browser can't surface a validation error for it. Emptiness (no
        // option picked yet) is caught server-side the same as every other
        // field, by buildApplicationInsertPayload / the submit_application RPC.
        <input type="hidden" name={name} value={choice} />
      )}
    </div>
  );
}

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
      <main className="bg-[var(--surface)] px-6 py-16 md:px-8">
        <div className="mx-auto w-full max-w-[720px] rounded-[10px] border border-[var(--line)] bg-[var(--card-public)] px-6 py-16 text-center text-[var(--ink)] shadow-[0_8px_24px_rgba(29,78,216,0.08)] md:px-10">
          <h1 className="mb-4 [font-family:var(--font-serif)] text-[clamp(1.8rem,4vw,2.6rem)] font-semibold">
            Application submitted
          </h1>
          <p className="text-[1.05rem] text-[var(--ink-muted)]">
            Thanks for applying to {jobTitle}. We&apos;ll be in touch.
          </p>
          <Link
            href={`/jobs/${jobSlug}`}
            className="mt-6 inline-block font-semibold text-[var(--brand)] no-underline hover:underline"
          >
            Back to the job posting
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-[var(--surface)] px-6 py-12 md:px-8 md:py-16">
      <div className="mx-auto w-full max-w-[800px]">
        <Link
          href={`/jobs/${jobSlug}`}
          className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-[var(--ink-muted)] no-underline hover:text-[var(--brand)] hover:underline"
        >
          ← Back to job posting
        </Link>

        <div className="rounded-[10px] border border-[var(--line)] bg-[var(--card-public)] p-6 shadow-[0_8px_24px_rgba(29,78,216,0.08)] md:p-10">
          <p className="m-0 text-[0.9rem] font-bold uppercase tracking-[0.08em] text-[var(--brand)]">
            {jobTitle}
          </p>
          <h1 className="mb-2 mt-2 [font-family:var(--font-serif)] text-[clamp(1.7rem,3.5vw,2.4rem)] font-semibold">
            Apply now
          </h1>
          <p className="mb-8 text-[1.02rem] text-[var(--ink-muted)]">
            Fill out the form below to apply. Fields marked with an asterisk are required.
          </p>

          <form action={formAction} className="flex flex-col gap-7">
            <input type="hidden" name="job_id" value={jobId} />

            {state && "error" in state && (
              <p className="border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                {state.error}
              </p>
            )}

            <FormSection title="Personal information">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="first_name">First name *</Label>
                  <Input id="first_name" name="first_name" required className={fieldClassName} />
                </div>
                <div>
                  <Label htmlFor="last_name">Last name *</Label>
                  <Input id="last_name" name="last_name" required className={fieldClassName} />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="email">Personal email *</Label>
                  <Input id="email" name="email" type="email" required className={fieldClassName} />
                </div>
                <div>
                  <Label htmlFor="school_email">School email *</Label>
                  <Input
                    id="school_email"
                    name="school_email"
                    type="email"
                    required
                    className={fieldClassName}
                  />
                  <p className="mt-1 text-xs text-[var(--ink-muted)]">
                    Must be your official school-issued email address.
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="phone">Phone number (optional)</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="(803) 555-0100"
                  className={fieldClassName}
                />
              </div>
            </FormSection>

            <FormSection title="Education">
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <Label>School *</Label>
                  <div className="mt-2">
                    <RadioWithOther name="school" options={SCHOOLS} otherPlaceholder="Enter your school" />
                  </div>
                </div>
                <div>
                  <Label>Year of study *</Label>
                  <div className="mt-2">
                    <RadioWithOther
                      name="year_of_study"
                      options={YEAR_OF_STUDY_OPTIONS}
                      otherPlaceholder="Enter your year of study"
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="major">Major / field of study *</Label>
                  <Input id="major" name="major" required className={fieldClassName} />
                </div>
                <div>
                  <Label htmlFor="gpa">GPA (optional)</Label>
                  <Input
                    id="gpa"
                    name="gpa"
                    type="number"
                    step="0.01"
                    min="0"
                    max="4"
                    className={fieldClassName}
                  />
                </div>
              </div>
            </FormSection>

            <FormSection title="Documents">
              <div className="grid gap-4 sm:grid-cols-2">
                <FileUploadField id="resume" name="resume" label="Resume *" />
                <FileUploadField id="transcript" name="transcript" label="Unofficial transcript *" />
              </div>
            </FormSection>

            <FormSection title="Team preferences">
              <div className="rounded-md border border-[var(--line)] bg-[var(--surface)] p-4">
                <p className="mb-4 text-sm text-[var(--ink-muted)]">
                  Rank up to 3 teams in order of preference. Please do not select the same team
                  more than once.
                </p>
                <div className="flex flex-col gap-4">
                  {[
                    {
                      label: "1st choice",
                      name: "team_choice_1",
                      value: choice1,
                      setValue: setChoice1,
                      exclude: [choice2, choice3],
                    },
                    {
                      label: "2nd choice",
                      name: "team_choice_2",
                      value: choice2,
                      setValue: setChoice2,
                      exclude: [choice1, choice3],
                    },
                    {
                      label: "3rd choice",
                      name: "team_choice_3",
                      value: choice3,
                      setValue: setChoice3,
                      exclude: [choice1, choice2],
                    },
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
              </div>
            </FormSection>

            <FormSection title="Eligibility">
              {(["livesNearColumbia", "authorizedToWork", "needsVisaSponsorship"] as const).map((key) => {
                const config = SCREENING_QUESTIONS[key];
                return (
                  <div key={key}>
                    <Label htmlFor={key}>{config.question} *</Label>
                    <RadioGroup name={key} className="mt-2 flex flex-row gap-6">
                      <label htmlFor={`${key}-yes`} className="flex items-center gap-2 text-sm text-[var(--ink)]">
                        <RadioGroupItem id={`${key}-yes`} value="Yes" className={radioItemClassName} />
                        Yes
                      </label>
                      <label htmlFor={`${key}-no`} className="flex items-center gap-2 text-sm text-[var(--ink)]">
                        <RadioGroupItem id={`${key}-no`} value="No" className={radioItemClassName} />
                        No
                      </label>
                    </RadioGroup>
                  </div>
                );
              })}
            </FormSection>

            <FormSection title="Additional information">
              <div>
                <Label htmlFor="whatAppeals">{SCREENING_QUESTIONS.whatAppeals.question} (optional)</Label>
                <p className="mb-1.5 mt-1 text-sm text-[var(--ink-muted)]">
                  This question is entirely optional! This is just for you to include additional
                  information about yourself and your motivation for joining our team that we
                  aren&apos;t able to get directly from reading a resume. Please feel free to
                  answer with 2 sentences, 2 paragraphs, or no words at all. Leaving this question
                  blank will not negatively affect your candidacy.
                </p>
                <Textarea
                  id="whatAppeals"
                  name="whatAppeals"
                  rows={5}
                  className={`${fieldClassName} h-auto`}
                />
              </div>
            </FormSection>

            <div className="border-t border-[var(--line)] pt-7">
              <Button type="submit" disabled={pending} className="h-12 w-full px-8 text-base sm:w-auto">
                {pending ? "Submitting..." : "Submit application"}
              </Button>
              <p className="mt-3 text-sm text-[var(--ink-muted)]">
                We&apos;ll review your application and follow up by email.
              </p>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
