"use client";

import { useActionState, useEffect, useState } from "react";
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
import type { FormState } from "@/app/admin/actions";
import type { Database } from "@/lib/database.types";

type JobRow = Database["public"]["Tables"]["jobs"]["Row"];

const commitmentOptions = [
  {
    value: "Part-time, semester-long",
    description: "A few hours a week, for one semester (fall or spring).",
  },
  {
    value: "Full-time, summer",
    description: "Full-time hours during the summer months.",
  },
  {
    value: "Volunteer, ongoing",
    description: "Occasional volunteer work with no fixed schedule.",
  },
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function JobForm({
  job,
  title,
  action,
  onSuccess,
  onClose,
  onDirtyChange,
}: {
  job?: JobRow;
  title: string;
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  onSuccess?: (id: string) => void;
  onClose?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const [slug, setSlug] = useState(job?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(job));
  const today = new Date().toISOString().slice(0, 10);

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
            <Label htmlFor="title">Title</Label>
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
            <Label htmlFor="slug">Web address</Label>
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
            <Label htmlFor="role">Program / role</Label>
            <Input
              id="role"
              name="role"
              required
              placeholder="2026 Associate Program"
              defaultValue={job?.role}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="location">Location</Label>
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
            <Label htmlFor="posting_date">Posting date</Label>
            <Input
              id="posting_date"
              name="posting_date"
              type="date"
              min={today}
              defaultValue={job?.posting_date ?? ""}
            />
            <p className="text-sm text-muted-foreground">
              Controls when this goes public. If status is published, it goes live on this date
              automatically.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            name="description"
            required
            placeholder="A couple of sentences on the role: what the person will do, and why it matters to Inspire Columbia."
            defaultValue={job?.description}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="responsibilities">Responsibilities (one per line)</Label>
          <Textarea
            id="responsibilities"
            name="responsibilities"
            rows={4}
            placeholder={"Attend weekly team meetings\nSupport the planning of at least one IC event"}
            defaultValue={job?.responsibilities.join("\n")}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="qualifications">Qualifications (one per line)</Label>
          <Textarea
            id="qualifications"
            name="qualifications"
            rows={4}
            placeholder={"Currently enrolled at a Columbia-area college or university\nLive in or near Columbia, SC"}
            defaultValue={job?.qualifications.join("\n")}
          />
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
                <SelectValue />
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
