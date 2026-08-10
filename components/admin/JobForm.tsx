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
  onSuccess?: (id: string) => void;
  onClose?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const templateLabels: Record<string, string> = {
    none: "None (use Apply URL below)",
    ...Object.fromEntries(templates.map((t) => [t.id, t.name])),
  };
  const [slug, setSlug] = useState(job?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(job));
  const nowLocal = isoToLocalInputValue(new Date().toISOString());
  const [postingDateIso, setPostingDateIso] = useState(job?.posting_date ?? "");
  const [closingDateIso, setClosingDateIso] = useState(job?.closing_date ?? "");

  useEffect(() => {
    if (state && "ok" in state) onSuccess?.(state.id ?? job?.id ?? "");
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
              inspirecolumbia.org/jobs/<span className="font-medium text-foreground">{slug || "..."}</span>
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
            <Label htmlFor="commitment_type">Commitment</Label>
            <Select name="commitment_type" defaultValue={job?.commitment_type}>
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
            <Label htmlFor="posting_date">Posting date and time</Label>
            <input type="hidden" name="posting_date" value={postingDateIso} readOnly />
            <Input
              id="posting_date"
              type="datetime-local"
              min={nowLocal}
              defaultValue={isoToLocalInputValue(job?.posting_date)}
              onChange={(e) => setPostingDateIso(localInputValueToIso(e.target.value))}
            />
            <p className="text-sm text-muted-foreground">
              Controls when this goes public. If status is published, it goes live at this date
              and time automatically.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 lg:w-1/2 lg:pr-2">
          <Label htmlFor="closing_date">Closing date and time (optional)</Label>
          <input type="hidden" name="closing_date" value={closingDateIso} readOnly />
          <Input
            id="closing_date"
            type="datetime-local"
            min={postingDateIso ? isoToLocalInputValue(postingDateIso) : nowLocal}
            defaultValue={isoToLocalInputValue(job?.closing_date)}
            onChange={(e) => setClosingDateIso(localInputValueToIso(e.target.value))}
          />
          <p className="text-sm text-muted-foreground">
            If set, this posting automatically stops showing publicly after this date and time.
            Leave blank to keep it open indefinitely.
          </p>
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

        <div className="flex flex-col gap-1.5 lg:w-1/2 lg:pr-2">
          <Label htmlFor="application_template_id">Application template</Label>
          <p className="text-sm text-muted-foreground">
            The built-in form applicants fill out. Leave as &quot;None&quot; if you&apos;re
            sending applicants to an external Apply URL below instead.
          </p>
          <Select
            name="application_template_id"
            defaultValue={
              job
                ? (job.application_template_id ?? "none")
                : templates.length === 1
                  ? templates[0].id
                  : "none"
            }
          >
            <SelectTrigger id="application_template_id" className="w-full">
              <SelectValue placeholder="Choose a template">
                {(value: string) => templateLabels[value] ?? value}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None (use Apply URL below)</SelectItem>
              {templates.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="apply_url">Apply URL (optional)</Label>
          <p className="text-sm text-muted-foreground">
            Leave blank to use Inspire Columbia&apos;s built-in application form. Set this only if
            applicants should be sent to an external form instead.
          </p>
          <Input
            id="apply_url"
            name="apply_url"
            type="url"
            placeholder="https://forms.gle/..."
            defaultValue={job?.apply_url ?? ""}
          />
        </div>

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
          </div>
        )}
      </form>
    </div>
  );
}
