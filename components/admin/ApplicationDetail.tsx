"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { getApplicationDocumentUrl, updateApplicationNotes, updateApplicationStatus } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { APPLICATION_STATUSES, applicationStatusLabel, type Application } from "@/lib/applications";
import { formatDateTime } from "@/lib/history";
import type { Database } from "@/lib/database.types";

type ApplicationDocument = Database["public"]["Tables"]["application_documents"]["Row"];
type TeamPreference = Database["public"]["Tables"]["application_team_preferences"]["Row"];
type ScreeningAnswer = Database["public"]["Tables"]["application_screening_answers"]["Row"];
type StatusHistoryEntry = Database["public"]["Tables"]["application_status_history"]["Row"];

const statusBadgeClass: Record<string, string> = {
  submitted: "bg-[var(--admin-neutral-soft)] text-[var(--admin-text-muted)]",
  under_review: "bg-[var(--admin-brand-soft)] text-[var(--admin-brand)]",
  interviewing: "bg-[var(--admin-brand-soft)] text-[var(--admin-brand)]",
  offer: "bg-[var(--admin-success-soft)] text-[var(--admin-success)]",
  hired: "bg-[var(--admin-success-soft)] text-[var(--admin-success)]",
  rejected: "bg-[var(--admin-danger-soft)] text-[var(--admin-danger)]",
  withdrawn: "bg-[var(--admin-danger-soft)] text-[var(--admin-danger)]",
};

function documentLabel(documentType: string) {
  return documentType === "resume" ? "Resume" : documentType === "transcript" ? "Transcript" : documentType;
}

function DownloadButton({ document }: { document: ApplicationDocument }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(() => {
      getApplicationDocumentUrl(document.id).then((result) => {
        if ("error" in result) {
          setError(result.error);
          return;
        }
        // window.open() after this await would hit the popup blocker since
        // it's no longer inside the click's call stack -- navigating the
        // current tab avoids that without needing a pre-opened blank tab.
        window.location.href = result.url;
      });
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <Button type="button" variant="outline" size="sm" disabled={pending} onClick={handleClick}>
        {pending ? "Preparing..." : `Download ${documentLabel(document.document_type)}`}
      </Button>
      {error && <p className="text-xs text-[var(--admin-danger)]">{error}</p>}
    </div>
  );
}

export default function ApplicationDetail({
  application,
  jobTitle,
  documents,
  teamPreferences,
  screeningAnswers,
  statusHistory,
}: {
  application: Application;
  jobTitle: string;
  documents: ApplicationDocument[];
  teamPreferences: TeamPreference[];
  screeningAnswers: ScreeningAnswer[];
  statusHistory: StatusHistoryEntry[];
}) {
  const [status, setStatus] = useState(application.status);
  const [notes, setNotes] = useState(application.reviewerNotes ?? "");
  const [statusPending, startStatusTransition] = useTransition();
  const [notesPending, startNotesTransition] = useTransition();
  const [statusError, setStatusError] = useState<string | null>(null);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!successMessage) return;
    const timeout = setTimeout(() => setSuccessMessage(null), 4000);
    return () => clearTimeout(timeout);
  }, [successMessage]);

  function saveStatus() {
    setStatusError(null);
    startStatusTransition(() => {
      updateApplicationStatus(application.id, status).then((result) => {
        if (result && "error" in result) {
          setStatusError(result.error);
        } else {
          setSuccessMessage("Status saved.");
        }
      });
    });
  }

  function saveNotes() {
    setNotesError(null);
    startNotesTransition(() => {
      updateApplicationNotes(application.id, notes).then((result) => {
        if (result && "error" in result) {
          setNotesError(result.error);
        } else {
          setSuccessMessage("Notes saved.");
        }
      });
    });
  }

  return (
    <div>
      <Link
        href="/admin/applications"
        className="mb-4 inline-block text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to applications
      </Link>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold [font-family:var(--font-serif)]">
          {application.firstName} {application.lastName}
        </h1>
        <span
          className={
            "rounded-full px-2 py-0.5 text-xs font-medium " +
            (statusBadgeClass[application.status] ?? "bg-[var(--admin-neutral-soft)] text-[var(--admin-text-muted)]")
          }
        >
          {applicationStatusLabel(application.status)}
        </span>
      </div>

      {successMessage && (
        <p
          role="status"
          className="mb-3 rounded-md bg-[var(--admin-success-soft)] px-3 py-2 text-sm text-[var(--admin-success)]"
        >
          {successMessage}
        </p>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4">
          <h2 className="mb-3 text-base font-medium text-[var(--admin-text)]">Applicant</h2>
          <dl className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-[var(--admin-text-muted)]">Job</dt>
              <dd className="text-sm text-[var(--admin-text)]">{jobTitle}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--admin-text-muted)]">Submitted</dt>
              <dd className="text-sm text-[var(--admin-text)]">{formatDateTime(application.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--admin-text-muted)]">Email</dt>
              <dd className="text-sm text-[var(--admin-text)]">{application.email}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--admin-text-muted)]">Phone</dt>
              <dd className="text-sm text-[var(--admin-text)]">{application.phone ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--admin-text-muted)]">School</dt>
              <dd className="text-sm text-[var(--admin-text)]">{application.school ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--admin-text-muted)]">School email</dt>
              <dd className="text-sm text-[var(--admin-text)]">{application.schoolEmail ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--admin-text-muted)]">Major</dt>
              <dd className="text-sm text-[var(--admin-text)]">{application.major ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--admin-text-muted)]">Year of study</dt>
              <dd className="text-sm text-[var(--admin-text)]">{application.yearOfStudy ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--admin-text-muted)]">GPA</dt>
              <dd className="text-sm text-[var(--admin-text)]">{application.gpa ?? "—"}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4">
          <h2 className="mb-3 text-base font-medium text-[var(--admin-text)]">Documents</h2>
          {documents.length === 0 ? (
            <p className="text-sm text-[var(--admin-text-muted)]">No documents on file.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {documents.map((doc) => (
                <DownloadButton key={doc.id} document={doc} />
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4">
          <h2 className="mb-3 text-base font-medium text-[var(--admin-text)]">Team preferences</h2>
          {teamPreferences.length === 0 ? (
            <p className="text-sm text-[var(--admin-text-muted)]">None provided.</p>
          ) : (
            <ol className="m-0 flex list-none flex-col gap-1 p-0 text-sm text-[var(--admin-text)]">
              {teamPreferences.map((pref) => (
                <li key={pref.id}>
                  {pref.preference_rank}. {pref.team_name}
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4">
          <h2 className="mb-3 text-base font-medium text-[var(--admin-text)]">Screening answers</h2>
          {screeningAnswers.length === 0 ? (
            <p className="text-sm text-[var(--admin-text-muted)]">None provided.</p>
          ) : (
            <dl className="flex flex-col gap-3">
              {screeningAnswers.map((answer) => (
                <div key={answer.id}>
                  <dt className="text-xs text-[var(--admin-text-muted)]">{answer.question}</dt>
                  <dd className="text-sm text-[var(--admin-text)]">{answer.answer}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        <div className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4">
          <h2 className="mb-3 text-base font-medium text-[var(--admin-text)]">Status</h2>
          <div className="flex flex-col gap-2">
            <Select value={status} onValueChange={(v) => v && setStatus(v as Application["status"])}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {APPLICATION_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {applicationStatusLabel(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              size="sm"
              disabled={statusPending || status === application.status}
              onClick={saveStatus}
            >
              {statusPending ? "Saving..." : "Save status"}
            </Button>
            {statusError && <p className="text-xs text-[var(--admin-danger)]">{statusError}</p>}
          </div>

          <h3 className="mb-2 mt-4 text-sm font-medium text-[var(--admin-text)]">History</h3>
          {statusHistory.length === 0 ? (
            <p className="text-sm text-[var(--admin-text-muted)]">No status changes yet.</p>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-1 p-0 text-xs text-[var(--admin-text-muted)]">
              {statusHistory.map((entry) => (
                <li key={entry.id}>
                  {formatDateTime(entry.created_at)}:{" "}
                  {entry.old_status ? `${applicationStatusLabel(entry.old_status)} → ` : ""}
                  {applicationStatusLabel(entry.new_status)}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4 md:col-span-2">
          <h2 className="mb-3 text-base font-medium text-[var(--admin-text)]">Reviewer notes</h2>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Internal notes, not visible to the applicant."
          />
          <div className="mt-2 flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              disabled={notesPending || notes === (application.reviewerNotes ?? "")}
              onClick={saveNotes}
            >
              {notesPending ? "Saving..." : "Save notes"}
            </Button>
            {notesError && <p className="text-xs text-[var(--admin-danger)]">{notesError}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
