"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode, Ref } from "react";
import Link from "next/link";
import { Eye, Upload, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { submitApplication } from "@/app/positions/actions";
import { useServerFormError } from "@/lib/hooks/useServerFormError";
import { cn } from "@/lib/utils";
import {
  SCHOOLS,
  SCREENING_QUESTIONS,
  TEAM_6_PARENT_TITLE,
  TEAM_6_SUB_TRACKS,
  TEAM_DESCRIPTIONS,
  YEAR_OF_STUDY_OPTIONS,
  availableTeams,
} from "@/lib/screening";

// Sentinel for the team-preference dropdowns' "deselect back to blank"
// option -- an actual empty-string SelectItem value is a known footgun with
// this project's Select primitive (base-ui), so a non-empty placeholder
// value is translated to/from "" at the boundary instead.
const UNSELECTED_TEAM = "__unselected__";

// Sentinel for any other single-choice dropdown (currently just School)
// that needs the same "show a placeholder instead of an empty string"
// treatment as the team-preference Selects above -- same reasoning, its
// own constant since the two dropdowns are otherwise unrelated.
const UNSELECTED_OPTION = "__unselected_option__";

// Shared visual treatment for a field the server just flagged as invalid --
// applied to the field's wrapper, not the input itself, so it works
// uniformly across Input/RadioGroup/Select/FileUploadField without needing
// to override each control's own internal border classes.
const erroredFieldClassName = "rounded-md ring-2 ring-red-400 ring-offset-2 ring-offset-[var(--card-public)]";

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
  errored,
  resetVersion,
  onChangeClearError,
}: {
  id: string;
  name: string;
  label: ReactNode;
  errored?: boolean;
  // Bumped once per completed submission attempt (see JobApplicationForm).
  // React's form actions run a real native form.reset() after every
  // attempt, success or failure, which silently clears this field's actual
  // <input type="file"> value (file inputs are always uncontrolled, can't
  // be restored programmatically). Re-syncing from the real DOM value
  // whenever this changes keeps the shown file honest -- previously this
  // component kept *showing* the old filename after a reset even though
  // the real input was empty, so a resubmit could fail with "a resume
  // upload is required" despite the UI still displaying one.
  resetVersion: number;
  onChangeClearError?: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // The native file input is always uncontrolled, and React runs a real
    // form.reset() after every action (success or failure), which silently
    // empties its actual FileList even though `file` state -- and the UI --
    // still show a selection. Rather than following the DOM's now-wrong
    // value (which is what used to happen here, and forced a full
    // reattach after any error, not just the one that was actually wrong),
    // reattach the file we're still holding onto the real input via
    // DataTransfer so a resubmit's FormData genuinely carries it again,
    // matching what's displayed.
    const input = inputRef.current;
    if (!input || !file) return;
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    input.files = dataTransfer.files;
  }, [resetVersion, file]);

  // Local-only preview -- nothing has been uploaded yet at this point in the
  // flow (that happens server-side on final submit), so this reads the
  // file the browser already has in memory rather than needing a signed
  // URL the way the admin dashboard's saved-document preview does. Derived
  // via useMemo rather than effect+setState, so creating the object URL
  // happens during render and only the cleanup (revocation) needs an effect.
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function removeFile() {
    setFile(null);
    setPreviewOpen(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  const labelText = typeof label === "string" ? label : "Document";

  return (
    <div data-field={id}>
      <Label htmlFor={id} className="mb-1.5">
        {label}
      </Label>
      <label
        htmlFor={id}
        // A file is already selected -- clicking the dropzone again would
        // silently swap it for a new one without the applicant explicitly
        // choosing to. Require Remove first, matching how the admin
        // dashboard's document handling treats a saved file as something
        // you replace deliberately, not overwrite by accident.
        onClick={(e) => {
          if (file) e.preventDefault();
        }}
        className={`mt-1.5 flex items-center gap-3 rounded-md border border-dashed px-4 py-3.5 text-sm text-[var(--ink-muted)] transition-colors ${
          file ? "cursor-default" : "cursor-pointer hover:border-[var(--brand)] hover:bg-[var(--surface-blue)]"
        } ${errored ? "border-red-400 bg-red-50" : "border-[var(--line)] bg-[var(--card-public)]"}`}
      >
        <Upload className="size-5 shrink-0 text-[var(--brand)]" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate">
          {file ? <span className="font-medium text-[var(--ink)]">{file.name}</span> : "Choose a file"}
        </span>
        {file ? (
          <span className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              aria-label={`Preview ${labelText}`}
              // preventDefault/stopPropagation keep the surrounding
              // <label>'s default behavior (opening the file picker) from
              // firing on top of this button's own click.
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setPreviewOpen(true);
              }}
              className="rounded-md p-1 text-[var(--ink-muted)] outline-none transition-colors hover:bg-[var(--surface)] hover:text-[var(--brand)] focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
            >
              <Eye className="size-4" />
            </button>
            <button
              type="button"
              aria-label="Remove selected file"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                removeFile();
              }}
              className="rounded-md p-1 text-[var(--ink-muted)] outline-none transition-colors hover:bg-[var(--surface)] hover:text-[var(--brand)] focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
            >
              <X className="size-4" />
            </button>
          </span>
        ) : (
          <span className="shrink-0 text-xs text-[var(--ink-muted)]">PDF, max 5 MB</span>
        )}
      </label>
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="file"
        accept=".pdf,application/pdf"
        required
        className="sr-only"
        onChange={(e) => {
          const newFile = e.target.files?.[0];
          if (newFile) {
            setFile(newFile);
            onChangeClearError?.();
          }
        }}
      />

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{labelText}</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            <iframe
              src={previewUrl}
              title={`${labelText} preview`}
              className="h-[75vh] w-full rounded-md border border-[var(--line)]"
            />
          )}
        </DialogContent>
      </Dialog>
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
  resetVersion,
  onChangeClearError,
}: {
  name: string;
  options: string[];
  otherPlaceholder: string;
  allowOther?: boolean;
  resetVersion: number;
  onChangeClearError?: () => void;
}) {
  const [choice, setChoice] = useState("");
  const [otherValue, setOtherValue] = useState("");

  const renderedOptions = allowOther ? [...options, "Other"] : options;

  return (
    <div>
      <RadioGroup
        value={choice}
        onValueChange={(v) => {
          setChoice(v as string);
          onChangeClearError?.();
        }}
        className="flex flex-col gap-2"
      >
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
          onChange={(e) => {
            setOtherValue(e.target.value);
            onChangeClearError?.();
          }}
          className={`${fieldClassName} mt-2`}
        />
      ) : (
        // No `required` here -- a hidden input can't be focused, so the
        // browser can't surface a validation error for it. Emptiness (no
        // option picked yet) is caught server-side the same as every other
        // field, by buildApplicationInsertPayload / the submit_application RPC.
        //
        // Keyed on resetVersion to force a full remount after every
        // submission attempt -- React's automatic post-action form.reset()
        // clears this input's real DOM value, but since `choice` itself
        // (the state driving `value` here) doesn't change from that reset,
        // React's reconciler sees no prop diff and skips rewriting the DOM,
        // leaving it genuinely empty even though the UI still shows a
        // selection. A resubmit then reads that real empty value and fails
        // validation for a field that looks filled in. Remounting forces a
        // fresh node with the correct current value every time.
        <input type="hidden" key={`${name}-${resetVersion}`} name={name} value={choice} />
      )}
    </div>
  );
}

// A single-choice dropdown with the same post-reset-remount hidden input
// pattern as RadioWithOther above, for a field with too many options for
// a radio list to read comfortably (School's 6+ options).
function SelectField({
  name,
  options,
  placeholder,
  resetVersion,
  onChangeClearError,
}: {
  name: string;
  options: string[];
  placeholder: string;
  resetVersion: number;
  onChangeClearError?: () => void;
}) {
  const [value, setValue] = useState("");

  return (
    <div>
      <Select
        value={value || UNSELECTED_OPTION}
        onValueChange={(v) => {
          setValue(v === UNSELECTED_OPTION ? "" : (v as string));
          onChangeClearError?.();
        }}
      >
        <SelectTrigger id={name} className={fieldClassName}>
          {/* base-ui's SelectValue can't infer a plain-text label from a
              matched SelectItem on its own -- same workaround as the
              team-preference Select below. */}
          <SelectValue placeholder={placeholder}>
            {(v: string) => (v === UNSELECTED_OPTION ? placeholder : v)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {/* No `required` here -- same reasoning as RadioWithOther's hidden
          input above: emptiness is caught server-side. Keyed on
          resetVersion for the same post-submit-reset reason. */}
      <input type="hidden" key={`${name}-${resetVersion}`} name={name} value={value} />
    </div>
  );
}

export default function JobApplicationForm({
  jobId,
  jobTitle,
  jobSlug,
  showTeamPreferences = true,
}: {
  jobId: string;
  jobTitle: string;
  jobSlug: string;
  // False for jobs on the General Application template -- everything else
  // about the form (fields, validation, submission) is identical to the
  // Associate template, just without this one section. submitApplication /
  // the submit_application RPC accept either zero team preferences (this
  // form) or a complete set of 3 (the Associate form), so simply never
  // rendering the section is enough -- no separate "which template" signal
  // needs to reach the server action.
  showTeamPreferences?: boolean;
}) {
  const [state, formAction, pending] = useActionState(submitApplication, null);
  const { bannerRef, erroredField, clearFieldError, fieldErrorProps } = useServerFormError(
    state,
    (s) => (s && "error" in s ? { message: s.error, field: s.field } : null)
  );

  // Bumped once per completed submission attempt -- passed down to key/
  // remount every controlled hidden input (team choices, school, year of
  // study, eligibility) and to re-sync FileUploadField's file state. React
  // runs a real native form.reset() after every form action (success or
  // failure), which force-clears those inputs' actual DOM values. Because
  // the React state driving each one (e.g. `choice1`) doesn't itself
  // change from that reset, React's reconciler sees no prop diff on the
  // next render and skips rewriting the DOM node, leaving it genuinely
  // empty while the UI still shows a selection -- a resubmit then reads
  // that real empty value and fails validation for a field that looks
  // filled in. Keying elements off this version number forces a fresh
  // remount with the correct value every time, closing that gap.
  //
  // "Adjusting state when a prop changes" (React's own documented pattern,
  // see https://react.dev/learn/you-might-not-need-an-effect) -- calling
  // setState directly during render, guarded by comparing against the
  // previous value, avoids both an unnecessary extra render (vs. an effect)
  // and the ref-during-render read/write this repo's stricter lint config
  // rejects (vs. a ref-based counter).
  const [prevState, setPrevState] = useState(state);
  const [resetVersion, setResetVersion] = useState(0);
  if (state !== prevState) {
    setPrevState(state);
    setResetVersion((v) => v + 1);
  }

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
              <p
                ref={bannerRef as Ref<HTMLParagraphElement>}
                role="alert"
                tabIndex={-1}
                className="border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 outline-none"
              >
                {state.error}
              </p>
            )}

            <FormSection title="Personal Information">
              <div className="grid gap-4 sm:grid-cols-2">
                <div {...fieldErrorProps("first_name")} className={cn(erroredField === "first_name" && erroredFieldClassName)}>
                  <Label htmlFor="first_name" className="mb-1.5">
                    First name
                    <Required />
                  </Label>
                  <Input
                    id="first_name"
                    name="first_name"
                    autoComplete="given-name"
                    required
                    value={firstName}
                    onChange={(e) => {
                      setFirstName(e.target.value);
                      clearFieldError("first_name");
                    }}
                    className={fieldClassName}
                  />
                </div>
                <div {...fieldErrorProps("last_name")} className={cn(erroredField === "last_name" && erroredFieldClassName)}>
                  <Label htmlFor="last_name" className="mb-1.5">
                    Last name
                    <Required />
                  </Label>
                  <Input
                    id="last_name"
                    name="last_name"
                    autoComplete="family-name"
                    required
                    value={lastName}
                    onChange={(e) => {
                      setLastName(e.target.value);
                      clearFieldError("last_name");
                    }}
                    className={fieldClassName}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div {...fieldErrorProps("email")} className={cn(erroredField === "email" && erroredFieldClassName)}>
                  <Label htmlFor="email" className="mb-1.5">
                    Personal email
                    <Required />
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      clearFieldError("email");
                    }}
                    className={fieldClassName}
                  />
                </div>
                <div {...fieldErrorProps("school_email")} className={cn(erroredField === "school_email" && erroredFieldClassName)}>
                  <Label htmlFor="school_email" className="mb-1.5">
                    School email
                    <Required />
                  </Label>
                  <Input
                    id="school_email"
                    name="school_email"
                    type="email"
                    // Deliberately not autoComplete="email" -- this is a
                    // second, distinct address from Personal email above,
                    // and sharing the same autocomplete category would
                    // invite the browser to fill the same value into both.
                    autoComplete="off"
                    required
                    value={schoolEmail}
                    onChange={(e) => {
                      setSchoolEmail(e.target.value);
                      clearFieldError("school_email");
                    }}
                    className={fieldClassName}
                  />
                </div>
              </div>

              <div {...fieldErrorProps("phone")} className={cn(erroredField === "phone" && erroredFieldClassName)}>
                <Label htmlFor="phone" className="mb-1.5">
                  Phone number
                  <Required />
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  required
                  placeholder="(803) 555-0100"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    clearFieldError("phone");
                  }}
                  className={fieldClassName}
                />
              </div>
            </FormSection>

            <FormSection title="Education">
              <div className="grid gap-6 sm:grid-cols-2">
                <div {...fieldErrorProps("school")} className={cn(erroredField === "school" && erroredFieldClassName)}>
                  <Label htmlFor="school">
                    School
                    <Required />
                  </Label>
                  <div className="mt-2">
                    <SelectField
                      name="school"
                      options={SCHOOLS}
                      placeholder="Choose your school"
                      resetVersion={resetVersion}
                      onChangeClearError={() => clearFieldError("school")}
                    />
                  </div>
                </div>
                <div {...fieldErrorProps("year_of_study")} className={cn(erroredField === "year_of_study" && erroredFieldClassName)}>
                  <Label>
                    Year of study
                    <Required />
                  </Label>
                  <div className="mt-2">
                    <RadioWithOther
                      name="year_of_study"
                      options={YEAR_OF_STUDY_OPTIONS}
                      otherPlaceholder="Enter your year of study"
                      resetVersion={resetVersion}
                      onChangeClearError={() => clearFieldError("year_of_study")}
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div {...fieldErrorProps("major")} className={cn(erroredField === "major" && erroredFieldClassName)}>
                  <Label htmlFor="major" className="mb-1.5">
                    Major / Field of study
                    <Required />
                  </Label>
                  <Input
                    id="major"
                    name="major"
                    required
                    value={major}
                    onChange={(e) => {
                      setMajor(e.target.value);
                      clearFieldError("major");
                    }}
                    className={fieldClassName}
                  />
                </div>
                <div {...fieldErrorProps("gpa")} className={cn(erroredField === "gpa" && erroredFieldClassName)}>
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
                    onChange={(e) => {
                      setGpa(e.target.value);
                      clearFieldError("gpa");
                    }}
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
                  errored={erroredField === "resume"}
                  resetVersion={resetVersion}
                  onChangeClearError={() => clearFieldError("resume")}
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
                  errored={erroredField === "transcript"}
                  resetVersion={resetVersion}
                  onChangeClearError={() => clearFieldError("transcript")}
                />
              </div>
            </FormSection>

            {showTeamPreferences && (
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
                      <div
                        key={name}
                        {...fieldErrorProps(name)}
                        className={cn(erroredField === name && erroredFieldClassName)}
                      >
                        <Label htmlFor={name} className="mb-1.5">
                          {label}
                          <Required />
                        </Label>
                        <Select
                          value={value || UNSELECTED_TEAM}
                          onValueChange={(v) => {
                            const next = v === UNSELECTED_TEAM ? "" : (v as string);
                            setValue(next);
                            setSubTrack("");
                            clearFieldError(name);
                          }}
                        >
                          <SelectTrigger id={name} className={fieldClassName}>
                            {/* base-ui's SelectValue can't infer a plain-text
                                label from a matched SelectItem on its own (see
                                the same note in ApplicationDetail.tsx/
                                JobForm.tsx) -- without this render-prop form,
                                picking the blank sentinel item below would
                                show the raw "__unselected__" value instead of
                                "Choose a team". */}
                            <SelectValue placeholder="Choose a team">
                              {(v: string) => (v === UNSELECTED_TEAM ? "Choose a team" : v)}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {/* Lets an applicant re-open a dropdown that already
                                has a choice and deselect it back to blank,
                                rather than only being able to swap directly to
                                another team. */}
                            <SelectItem value={UNSELECTED_TEAM}>Choose a team</SelectItem>
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
                            sub-track when team 6 is picked. Keyed on
                            resetVersion for the same reason RadioWithOther's
                            hidden input is -- see that component's comment. */}
                        <input type="hidden" key={`${name}-${resetVersion}`} name={name} value={resolvedValue} />
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
            )}

            <FormSection title="Eligibility">
              {(["livesNearColumbia", "authorizedToWork", "needsVisaSponsorship"] as const).map((key) => {
                const config = SCREENING_QUESTIONS[key];
                const value = eligibilityAnswers[key];
                return (
                  <div key={key}>
                    {/* No htmlFor -- this question labels the whole
                        Yes/No group below, not one single control, so
                        there's no one element id it could correctly point
                        at (each RadioGroupItem has its own label already).
                        Matches the Year of study Label above, which
                        doesn't use htmlFor for the same reason. */}
                    <Label className="mb-1.5">
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
                        the submitted value so a failed submission can't wipe it.
                        Keyed on resetVersion for the same reason too. */}
                    <input type="hidden" key={`${key}-${resetVersion}`} name={key} value={value} />
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
