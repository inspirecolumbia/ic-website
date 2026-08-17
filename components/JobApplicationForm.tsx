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
import { submitApplication } from "@/app/positions/actions";
import {
  SCHOOLS,
  SCREENING_QUESTIONS,
  TEAM_6_PARENT_TITLE,
  TEAM_6_SUB_TRACKS,
  TEAM_DESCRIPTIONS,
  YEAR_OF_STUDY_OPTIONS,
  availableTeams,
} from "@/lib/screening";

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

// Labels on this page pair with an asterisk to mark required fields --
// styled red (matching this form's existing red error-banner convention,
// see the submission-error <p> below) rather than the neutral ink color, so
// "required" reads as a distinct signal from the label text itself. Mirrors
// the same convention already used in components/admin/JobForm.tsx.
function Required() {
  return (
    <span aria-hidden="true" className="ml-0.5 text-red-600">
      *
    </span>
  );
}

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="border-t border-[var(--line)] pt-2 first:border-t-0 first:pt-0">
      <legend className="mb-4 pr-2.5 [font-family:var(--font-serif)] text-[1.5rem] font-semibold text-[var(--ink)]">
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
  label: ReactNode;
}) {
  const [fileName, setFileName] = useState<string | null>(null);

  return (
    <div>
      <Label htmlFor={id} className="mb-1.5">
        {label}
      </Label>
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
        onChange={(e) => {
          // A resubmission after a fixable validation error clears the
          // browser's actual file selection (files can't be restored
          // programmatically for security reasons), which also fires this
          // onChange with an empty file list -- only overwrite the
          // remembered name when a real file comes through, so the label
          // doesn't flash back to "Choose a file" and make it look like the
          // previous choice was forgotten.
          const newName = e.target.files?.[0]?.name;
          if (newName) setFileName(newName);
        }}
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
// This also means the group's selection is driven entirely by React state
// (`choice`), never by a native form element -- so it survives the
// automatic form.reset() React runs after every form action, unlike a
// widget that hands its own `name` straight to a headless-UI primitive.
function RadioWithOther({
  name,
  options,
  otherPlaceholder,
  allowOther = true,
}: {
  name: string;
  options: string[];
  otherPlaceholder: string;
  allowOther?: boolean;
}) {
  const [choice, setChoice] = useState("");
  const [otherValue, setOtherValue] = useState("");

  const renderedOptions = allowOther ? [...options, "Other"] : options;

  return (
    <div>
      <RadioGroup value={choice} onValueChange={(v) => setChoice(v as string)} className="flex flex-col gap-2">
        {renderedOptions.map((option) => (
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

  // Every field below is fully React-controlled (value + onChange/
  // onValueChange, never a bare `name` handed to a native or headless-UI
  // element) specifically so a failed submission's automatic form.reset()
  // (React re-runs this after every form action, success or failure) can't
  // silently wipe what the applicant already typed or picked. Plain <input>/
  // <textarea> elements self-heal from a native reset once React re-renders
  // them from state; RadioGroup/Select need their `name` kept off the
  // widget itself (see RadioWithOther's comment above) with a separate
  // React-controlled hidden input carrying the real submitted value instead.
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [schoolEmail, setSchoolEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [major, setMajor] = useState("");
  const [gpa, setGpa] = useState("");
  const [whatAppeals, setWhatAppeals] = useState("");

  const [eligibilityAnswers, setEligibilityAnswers] = useState<Record<string, string>>({
    livesNearColumbia: "",
    authorizedToWork: "",
    needsVisaSponsorship: "",
  });

  const [choice1, setChoice1] = useState<string>("");
  const [choice2, setChoice2] = useState<string>("");
  const [choice3, setChoice3] = useState<string>("");
  const [subTrack1, setSubTrack1] = useState<string>("");
  const [subTrack2, setSubTrack2] = useState<string>("");
  const [subTrack3, setSubTrack3] = useState<string>("");

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
            href={`/positions/${jobSlug}`}
            className="mt-6 inline-block font-semibold text-[var(--brand)] no-underline hover:underline"
          >
            Back to the job posting
          </Link>
        </div>
      </main>
    );
  }

  // Team 6 ("Logistics and Operations / AV Production") shows as one option
  // in the picker, same as any other team -- but it's not itself a storable
  // preference (see lib/screening.ts's TEAMS/TEAM_PICKER_OPTIONS comments),
  // so picking it requires resolving to one of its two sub-tracks below
  // before the real value (submitted under the same team_choice_N name) is
  // known.
  const teamChoices = [
    {
      label: "1st choice",
      name: "team_choice_1",
      value: choice1,
      setValue: setChoice1,
      subTrack: subTrack1,
      setSubTrack: setSubTrack1,
      exclude: [choice2, choice3],
    },
    {
      label: "2nd choice",
      name: "team_choice_2",
      value: choice2,
      setValue: setChoice2,
      subTrack: subTrack2,
      setSubTrack: setSubTrack2,
      exclude: [choice1, choice3],
    },
    {
      label: "3rd choice",
      name: "team_choice_3",
      value: choice3,
      setValue: setChoice3,
      subTrack: subTrack3,
      setSubTrack: setSubTrack3,
      exclude: [choice1, choice2],
    },
  ];

  return (
    <main className="bg-[var(--surface)] px-6 py-12 md:px-8 md:py-16">
      <div className="mx-auto w-full max-w-[800px]">
        <Link
          href={`/positions/${jobSlug}`}
          className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-[var(--ink-muted)] no-underline hover:text-[var(--brand)] hover:underline"
        >
          ← Back to job posting
        </Link>

        <div className="rounded-[10px] border border-[var(--line)] bg-[var(--card-public)] p-6 shadow-[0_8px_24px_rgba(29,78,216,0.08)] md:p-10">
          <h1 className="mb-2 mt-2 [font-family:var(--font-serif)] text-[clamp(1.7rem,3.5vw,2.4rem)] font-semibold">
            {jobTitle}
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

            <FormSection title="Personal Information">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="first_name" className="mb-1.5">
                    First name
                    <Required />
                  </Label>
                  <Input
                    id="first_name"
                    name="first_name"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className={fieldClassName}
                  />
                </div>
                <div>
                  <Label htmlFor="last_name" className="mb-1.5">
                    Last name
                    <Required />
                  </Label>
                  <Input
                    id="last_name"
                    name="last_name"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className={fieldClassName}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="email" className="mb-1.5">
                    Personal email
                    <Required />
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={fieldClassName}
                  />
                </div>
                <div>
                  <Label htmlFor="school_email" className="mb-1.5">
                    School email
                    <Required />
                  </Label>
                  <Input
                    id="school_email"
                    name="school_email"
                    type="email"
                    required
                    value={schoolEmail}
                    onChange={(e) => setSchoolEmail(e.target.value)}
                    className={fieldClassName}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="phone" className="mb-1.5">
                  Phone number
                  <Required />
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  placeholder="(803) 555-0100"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={fieldClassName}
                />
              </div>
            </FormSection>

            <FormSection title="Education">
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <Label>
                    School
                    <Required />
                  </Label>
                  <div className="mt-2">
                    <RadioWithOther name="school" options={SCHOOLS} otherPlaceholder="Enter your school" allowOther={false} />
                  </div>
                </div>
                <div>
                  <Label>
                    Year of study
                    <Required />
                  </Label>
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
                  <Label htmlFor="major" className="mb-1.5">
                    Major / Field of study
                    <Required />
                  </Label>
                  <Input
                    id="major"
                    name="major"
                    required
                    value={major}
                    onChange={(e) => setMajor(e.target.value)}
                    className={fieldClassName}
                  />
                </div>
                <div>
                  <Label htmlFor="gpa" className="mb-1.5">
                    GPA (4.0 scale)
                  </Label>
                  <Input
                    id="gpa"
                    name="gpa"
                    type="number"
                    step="0.01"
                    min="0"
                    max="4"
                    value={gpa}
                    onChange={(e) => setGpa(e.target.value)}
                    className={fieldClassName}
                  />
                </div>
              </div>
            </FormSection>

            <FormSection title="Documents">
              <div className="grid gap-4 sm:grid-cols-2">
                <FileUploadField
                  id="resume"
                  name="resume"
                  label={
                    <>
                      Resume
                      <Required />
                    </>
                  }
                />
                <FileUploadField
                  id="transcript"
                  name="transcript"
                  label={
                    <>
                      Unofficial transcript
                      <Required />
                    </>
                  }
                />
              </div>
            </FormSection>

            <FormSection title="Team preferences">
              <div className="mb-6 flex flex-col gap-4">
                {TEAM_DESCRIPTIONS.map((team) => (
                  <div key={team.title}>
                    <p className="m-0 text-sm font-semibold text-[var(--ink)]">{team.title}</p>
                    <p className="mt-1 mb-0 text-sm text-[var(--ink-muted)]">{team.description}</p>
                    {team.subTracks && (
                      <div className="mt-2 flex flex-col gap-2 border-l-2 border-[var(--line)] pl-3">
                        {team.subTracks.map((subTrack) => (
                          <div key={subTrack.title}>
                            <p className="m-0 text-sm font-semibold text-[var(--ink)]">{subTrack.title}</p>
                            <p className="mt-1 mb-0 text-sm text-[var(--ink-muted)]">{subTrack.description}</p>
                            {subTrack.items && (
                              <ul className="mt-1 mb-0 list-disc pl-5 text-sm text-[var(--ink-muted)]">
                                {subTrack.items.map((item) => (
                                  <li key={item}>{item}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="rounded-md border-[var(--line)]">
                <p className="mb-4 text-sm text-[var(--ink-muted)]">
                  Rank 3 teams in order of preference. All three choices are required, and each
                  must be a different team.
                </p>
                <div className="flex flex-col gap-5">
                  {teamChoices.map(({ label, name, value, setValue, subTrack, setSubTrack, exclude }) => {
                    const isTeam6 = value === TEAM_6_PARENT_TITLE;
                    const resolvedValue = isTeam6 ? subTrack : value;
                    return (
                      <div key={name}>
                        <Label htmlFor={name} className="mb-1.5">
                          {label}
                          <Required />
                        </Label>
                        <Select
                          value={value}
                          onValueChange={(v) => {
                            setValue(v as string);
                            setSubTrack("");
                          }}
                        >
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
                        {/* The Select above never carries `name` -- its own headless-UI
                            form participation would get wiped by React's automatic
                            form.reset() after a failed submission (see RadioWithOther's
                            comment above), and for team 6 the value it displays
                            ("Logistics and Operations / AV Production") isn't even a
                            storable preference. This hidden input is the one thing that
                            actually gets submitted under team_choice_N, resolved to the
                            sub-track when team 6 is picked. */}
                        <input type="hidden" name={name} value={resolvedValue} />
                        {isTeam6 && (
                          <div className="mt-2">
                            <Label className="mb-1.5">
                              Choose a sub-track
                              <Required />
                            </Label>
                            <RadioGroup
                              value={subTrack}
                              onValueChange={(v) => setSubTrack(v as string)}
                              className="flex flex-col gap-2"
                            >
                              {TEAM_6_SUB_TRACKS.map((track) => (
                                <label
                                  key={track}
                                  htmlFor={`${name}-subtrack-${track}`}
                                  className="flex items-center gap-2 text-sm text-[var(--ink)]"
                                >
                                  <RadioGroupItem
                                    id={`${name}-subtrack-${track}`}
                                    value={track}
                                    className={radioItemClassName}
                                  />
                                  {track}
                                </label>
                              ))}
                            </RadioGroup>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </FormSection>

            <FormSection title="Eligibility">
              {(["livesNearColumbia", "authorizedToWork", "needsVisaSponsorship"] as const).map((key) => {
                const config = SCREENING_QUESTIONS[key];
                const value = eligibilityAnswers[key];
                return (
                  <div key={key}>
                    <Label htmlFor={key} className="mb-1.5">
                      {config.question}
                      <Required />
                    </Label>
                    <RadioGroup
                      value={value}
                      onValueChange={(v) =>
                        setEligibilityAnswers((prev) => ({ ...prev, [key]: v as string }))
                      }
                      className="mt-2 flex flex-row gap-6"
                    >
                      <label htmlFor={`${key}-yes`} className="flex items-center gap-2 text-sm text-[var(--ink)]">
                        <RadioGroupItem id={`${key}-yes`} value="Yes" className={radioItemClassName} />
                        Yes
                      </label>
                      <label htmlFor={`${key}-no`} className="flex items-center gap-2 text-sm text-[var(--ink)]">
                        <RadioGroupItem id={`${key}-no`} value="No" className={radioItemClassName} />
                        No
                      </label>
                    </RadioGroup>
                    {/* Same reasoning as the team Select above: no `name` on the
                        RadioGroup itself, a separate controlled hidden input carries
                        the submitted value so a failed submission can't wipe it. */}
                    <input type="hidden" name={key} value={value} />
                  </div>
                );
              })}
            </FormSection>

            <FormSection title="Additional information">
              <div>
                <Label htmlFor="whatAppeals" className="mb-1.5">
                  {SCREENING_QUESTIONS.whatAppeals.question} (optional)
                </Label>
                <p className="mb-1.5 mt-1 text-sm text-[var(--ink-muted)]">
                  Resumes don&apos;t always capture the full story. Share anything else you&apos;d like us to know about you, your goals, or your interest in joining our team. A short response is completely fine.
                </p>
                <Textarea
                  id="whatAppeals"
                  name="whatAppeals"
                  rows={5}
                  value={whatAppeals}
                  onChange={(e) => setWhatAppeals(e.target.value)}
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
