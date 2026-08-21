"use client";

import { useActionState, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import MarkdownEditor from "@/components/admin/MarkdownEditor";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import JobPhotoField from "@/components/admin/JobPhotoField";
import type { FormState } from "@/app/admin/actions";
import type { Database } from "@/lib/database.types";

type JobRow = Database["public"]["Tables"]["jobs"]["Row"];
type TemplateRow = Database["public"]["Tables"]["application_templates"]["Row"];

const commitmentOptions = [
  {
    value: "Part-time, school-year-long",
    description: "A few hours a week, for the full school year (fall and spring).",
  },
  {
    value: "Part-time, summer",
    description: "Part-time hours during the summer months.",
  },
  {
    value: "Volunteer, ongoing",
    description: "Occasional volunteer work with no fixed schedule.",
  },
];

const descriptionPlaceholder = `A couple of sentences on the role: what the person will do, and why it matters to Inspire Columbia.

## Responsibilities

- Attend weekly team meetings
- Support the planning of at least one IC event

## Qualifications

- Currently enrolled at a Columbia-area college or university
- Live in or near Columbia, SC`;

// Select.Value renders the raw underlying `value` in the trigger unless
// told how to map it to a label (Base UI, unlike Radix, doesn't infer it
// from the matching SelectItem's children) -- these are that mapping.
const statusLabels: Record<string, string> = {
  draft: "Draft",
  published: "Published",
  closed: "Closed",
  archived: "Archived",
};

function Required() {
  return (
    <span aria-hidden="true" className="ml-0.5 text-[var(--admin-danger)]">
      *
    </span>
  );
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// datetime-local inputs work in the browser's local wall-clock time with no
// timezone info attached -- these convert to/from the UTC ISO instants the
// DB and server actions expect. The conversion has to happen client-side
// (here), not on the server, since a Server Action has no reliable way to
// know which timezone the browser's local time was in.
function isoToLocalInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localInputValueToIso(value: string): string {
  return value ? new Date(value).toISOString() : "";
}

export default function JobForm({
  job,
  templates,
  title,
  action,
  onSuccess,
  onClose,
  onDirtyChange,
}: {
  job?: JobRow;
  templates: TemplateRow[];
  title: string;
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  onSuccess?: (id: string, notice?: string) => void;
  onClose?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const templateLabels: Record<string, string> = Object.fromEntries(templates.map((t) => [t.id, t.name]));
  const [slug, setSlug] = useState(job?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(job));
  const nowLocal = isoToLocalInputValue(new Date().toISOString());
  // The posting date input's `min` would otherwise reject the job's own
  // already-past posting date the moment "now" ticks past it -- every
  // already-published job has one by definition -- silently blocking any
  // save (even ones that never touch this field) with native "value must
  // be later" validation. Floored at the existing value instead of always
  // at `now`, so a stale-but-already-live posting date stays valid until
  // someone deliberately types a new one.
  const existingPostingLocal = isoToLocalInputValue(job?.posting_date);
  const minPostingLocal = existingPostingLocal && existingPostingLocal < nowLocal ? existingPostingLocal : nowLocal;
  const [postingDateIso, setPostingDateIso] = useState(job?.posting_date ?? "");
  const [closingDateIso, setClosingDateIso] = useState(job?.closing_date ?? "");

  // apply_url always wins over the template when a job has both (see
  // app/positions/[slug]/apply/page.tsx), so only one of these two fields
  // is ever meaningful at a time -- this radio makes that explicit instead
  // of leaving it to the two fields' help text. Both branches stay
  // controlled (not just conditionally rendered with defaultValue) so
  // switching back to a branch restores whatever was typed there, even
  // though only the active one's `name` attribute -- and therefore its
  // value -- actually gets submitted. "not_accepting" is a 3rd branch, not
  // a real application_templates row -- there's no form to render for it,
  // so /apply always 404s regardless of Status (see
  // app/positions/[slug]/apply/page.tsx) -- this job can still be Published
  // (e.g. to show up on /positions while staff finish setting it up, or
  // just to test that /apply 404s for real).
  const [applySource, setApplySource] = useState<"template" | "external" | "not_accepting">(
    job && !job.accepting_applications ? "not_accepting" : job?.apply_url ? "external" : "template"
  );
  const [templateId, setTemplateId] = useState(
    job ? (job.application_template_id ?? "none") : templates.length === 1 ? templates[0].id : "none"
  );
  const [applyUrlValue, setApplyUrlValue] = useState(job?.apply_url ?? "");

  // Defaults to "now" for a brand-new job (or one that's never had a
  // posting date) so creating a job and saving it is enough to post it
  // immediately, per the original ask. Defaults to "schedule" when a real
  // posting date is already on the job, so opening Edit and clicking Save
  // can't silently wipe a deliberately-set one the staffer didn't actually
  // mean to touch. Closing date is independent of this -- see its own field
  // below -- so it doesn't factor into this default.
  const [postTiming, setPostTiming] = useState<"now" | "schedule">(job?.posting_date ? "schedule" : "now");

  useEffect(() => {
    if (state && "ok" in state) onSuccess?.(state.id ?? job?.id ?? "", state.notice);
  }, [state, onSuccess, job?.id]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-[var(--admin-border)] bg-[var(--admin-surface)] px-4 py-3">
        <h2 className="text-lg font-medium text-[var(--admin-text)]">{title}</h2>
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button type="submit" form="job-form" size="sm" disabled={pending}>
            {pending ? "Saving..." : job ? "Save changes" : "Create job"}
          </Button>
        </div>
      </div>

      <form
        id="job-form"
        action={formAction}
        onChange={() => onDirtyChange?.(true)}
        className="flex flex-1 flex-col gap-4 overflow-y-auto p-4"
      >
        <input type="hidden" name="post_now" value={postTiming === "now" ? "true" : "false"} readOnly />

        {state && "error" in state && (
          <p className="rounded-md bg-[var(--admin-danger-soft)] px-3 py-2 text-sm text-[var(--admin-danger)]">
            {state.error}
          </p>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">
              Title
              <Required />
            </Label>
            <Input
              id="title"
              name="title"
              required
              placeholder="Associate"
              defaultValue={job?.title}
              onChange={(e) => {
                if (!slugTouched) setSlug(slugify(e.target.value));
              }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="slug">
              Web address
              <Required />
            </Label>
            <Input
              id="slug"
              name="slug"
              required
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
            />
            <p className="text-sm text-muted-foreground">
              inspirecolumbia.org/positions/<span className="font-medium text-foreground">{slug || "..."}</span>
            </p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="role">
              Program / role
              <Required />
            </Label>
            <Input
              id="role"
              name="role"
              required
              placeholder="2026 Associate Program"
              defaultValue={job?.role}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="location">
              Location
              <Required />
            </Label>
            <Input
              id="location"
              name="location"
              required
              placeholder="Columbia, SC"
              defaultValue={job?.location}
            />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="commitment_type">
              Commitment
              <Required />
            </Label>
            <Select name="commitment_type" defaultValue={job?.commitment_type} required>
              <SelectTrigger id="commitment_type" className="w-full">
                <SelectValue placeholder="Choose a commitment type" />
              </SelectTrigger>
              <SelectContent className="w-full min-w-[var(--anchor-width)]">
                {commitmentOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <span className="flex flex-col py-0.5">
                      <span>{option.value}</span>
                      <span className="text-xs text-wrap text-muted-foreground">
                        {option.description}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="closing_date">Closing date and time (optional)</Label>
            <input type="hidden" name="closing_date" value={closingDateIso} readOnly />
            <Input
              id="closing_date"
              type="datetime-local"
              // Same reasoning as minPostingLocal above -- floored at the
              // job's own existing closing date (if earlier) so an
              // already-past deadline doesn't block every future save until
              // someone deliberately picks a new one. Independent of
              // postTiming/postingDateIso -- the deadline isn't gated
              // behind when the job goes live.
              min={(() => {
                const naturalFloor =
                  postTiming === "schedule" && postingDateIso ? isoToLocalInputValue(postingDateIso) : nowLocal;
                const existingClosingLocal = isoToLocalInputValue(job?.closing_date);
                return existingClosingLocal && existingClosingLocal < naturalFloor
                  ? existingClosingLocal
                  : naturalFloor;
              })()}
              defaultValue={isoToLocalInputValue(job?.closing_date)}
              onChange={(e) => setClosingDateIso(localInputValueToIso(e.target.value))}
            />
            <p className="text-sm text-muted-foreground">
              If set, this posting automatically stops showing publicly after this date and time.
              Leave blank to keep it open indefinitely.
            </p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="flex flex-col gap-3">
            <Label>How do applicants apply?</Label>
            <input
              type="hidden"
              name="accepting_applications"
              value={applySource === "not_accepting" ? "false" : "true"}
              readOnly
            />
            <RadioGroup
              value={applySource}
              onValueChange={(v) => setApplySource(v as "template" | "external" | "not_accepting")}
              className="flex flex-col gap-2"
            >
              <label htmlFor="apply_source-template" className="flex items-center gap-2 text-sm">
                <RadioGroupItem id="apply_source-template" value="template" />
                Built-in application form
              </label>
              <label htmlFor="apply_source-external" className="flex items-center gap-2 text-sm">
                <RadioGroupItem id="apply_source-external" value="external" />
                External URL
              </label>
              <label htmlFor="apply_source-not_accepting" className="flex items-center gap-2 text-sm">
                <RadioGroupItem id="apply_source-not_accepting" value="not_accepting" />
                Not accepting applications yet
              </label>
            </RadioGroup>
          </div>

          {applySource === "template" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="application_template_id">Application template</Label>
              <p className="text-sm text-muted-foreground">
                The built-in form applicants fill out.
              </p>
              <Select
                name="application_template_id"
                value={templateId}
                onValueChange={(v) => setTemplateId(v as string)}
              >
                <SelectTrigger id="application_template_id" className="w-full">
                  <SelectValue placeholder="Choose a template">
                    {(value: string) => templateLabels[value] ?? "Choose a template"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {applySource === "external" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="apply_url">Apply URL</Label>
              <p className="text-sm text-muted-foreground">
                Applicants are sent here instead of Inspire Columbia&apos;s built-in form.
              </p>
              <Input
                id="apply_url"
                name="apply_url"
                type="url"
                required
                placeholder="https://forms.gle/..."
                value={applyUrlValue}
                onChange={(e) => setApplyUrlValue(e.target.value)}
              />
            </div>
          )}

          {applySource === "not_accepting" && (
            <p className="text-sm text-muted-foreground">
              No form or URL is set, so applicants can&apos;t apply -- its Apply page shows a
              plain not-found page, even if this job is Published.
            </p>
          )}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="flex flex-col gap-3">
            <Label>When should this go live?</Label>
            <RadioGroup
              value={postTiming}
              onValueChange={(v) => setPostTiming(v as "now" | "schedule")}
              className="flex flex-col gap-2"
            >
              <label htmlFor="post_timing-now" className="flex items-center gap-2 text-sm">
                <RadioGroupItem id="post_timing-now" value="now" />
                Post now
              </label>
              <label htmlFor="post_timing-schedule" className="flex items-center gap-2 text-sm">
                <RadioGroupItem id="post_timing-schedule" value="schedule" />
                Schedule for later
              </label>
            </RadioGroup>
          </div>

          {postTiming === "now" ? (
            <p className="text-sm text-muted-foreground">
              Saving sets the posting date to now and publishes this job live immediately.
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="posting_date">
                Posting date and time
                <Required />
              </Label>
              <input type="hidden" name="posting_date" value={postingDateIso} readOnly />
              <Input
                id="posting_date"
                type="datetime-local"
                required
                min={minPostingLocal}
                defaultValue={isoToLocalInputValue(job?.posting_date)}
                onChange={(e) => setPostingDateIso(localInputValueToIso(e.target.value))}
              />
              <p className="text-sm text-muted-foreground">
                Controls when this goes public. If status is published, it goes live at this date
                and time automatically.
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="description">
            Description
            <Required />
          </Label>
          <p className="text-sm text-muted-foreground">
            Supports Markdown. Use the toolbar or type <code>##</code> for section headings and{" "}
            <code>-</code> for bullet points — press Enter on a bullet to continue the list, or on an
            empty bullet to end it.
          </p>
          <MarkdownEditor
            id="description"
            name="description"
            required
            rows={12}
            placeholder={descriptionPlaceholder}
            defaultValue={job?.description}
          />
        </div>

        <JobPhotoField existingPhotoPath={job?.photo_path ?? null} onDirtyChange={onDirtyChange} />

        {job && (
          <div className="flex flex-col gap-1.5 lg:w-1/2 lg:pr-2">
            <Label htmlFor="status">Status</Label>
            <Select name="status" defaultValue={job.status}>
              <SelectTrigger id="status" className="w-full">
                <SelectValue>{(value: string) => statusLabels[value] ?? value}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            {applySource === "not_accepting" && (
              <p className="text-sm text-muted-foreground">
                Published here just means the listing shows up -- its Apply page will still 404.
              </p>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
