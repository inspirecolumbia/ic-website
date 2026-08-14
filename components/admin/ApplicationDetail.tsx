"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { addApplicationReviewerNote, getApplicationDocumentUrl, updateApplicationStatus } from "@/app/admin/actions";
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

export type ReviewerNoteEntry = {
  id: string;
  note: string;
  createdAt: string;
  authorName: string;
  authorRole: string | null;
};

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

function DocumentActions({ document }: { document: ApplicationDocument }) {
  const [pendingMode, setPendingMode] = useState<"preview" | "download" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleClick(mode: "preview" | "download") {
    setError(null);
    setPendingMode(mode);
    startTransition(() => {
      getApplicationDocumentUrl(document.id, mode).then((result) => {
        setPendingMode(null);
        if ("error" in result) {
          setError(result.error);
          return;
        }
        // window.open() after this await would hit the popup blocker since
        // it's no longer inside the click's call stack -- navigating the
        // current tab avoids that without needing a pre-opened blank tab.
        // Preview relies on Storage's default inline response headers;
        // download forces Content-Disposition: attachment via the signed
        // URL's download param (see createApplicationDocumentSignedUrl).
        window.location.href = result.url;
      });
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pendingMode !== null}
          onClick={() => handleClick("preview")}
        >
          {pendingMode === "preview" ? "Preparing..." : `Preview ${documentLabel(document.document_type)}`}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pendingMode !== null}
          onClick={() => handleClick("download")}
        >
          {pendingMode === "download" ? "Preparing..." : "Download"}
        </Button>
      </div>
      {error && <p className="text-xs text-[var(--admin-danger)]">{error}</p>}
    </div>
  );
}

export default function ApplicationDetail({
  application,
  jobTitle,
  jobRole,
  documents,
  teamPreferences,
  screeningAnswers,
  statusHistory,
  reviewerNotes,
}: {
  application: Application;
  jobTitle: string;
  jobRole: string | null;
  documents: ApplicationDocument[];
  teamPreferences: TeamPreference[];
  screeningAnswers: ScreeningAnswer[];
  statusHistory: StatusHistoryEntry[];
  reviewerNotes: ReviewerNoteEntry[];
}) {
  const [status, setStatus] = useState(application.status);
  const [newNote, setNewNote] = useState("");
  const [statusPending, startStatusTransition] = useTransition();
  const [notePending, startNoteTransition] = useTransition();
  const [statusError, setStatusError] = useState<string | null>(null);
  const [noteError, setNoteError] = useState<string | null>(null);
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

  function postNote() {
    setNoteError(null);
    startNoteTransition(() => {
      addApplicationReviewerNote(application.id, newNote).then((result) => {
        if (result && "error" in result) {
          setNoteError(result.error);
        } else {
          setNewNote("");
          setSuccessMessage("Note posted.");
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
              <dt className="text-xs text-[var(--admin-text-muted)]">Role</dt>
              <dd className="text-sm text-[var(--admin-text)]">{jobRole ?? "—"}</dd>
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
                <DocumentActions key={doc.id} document={doc} />
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
          <p className="mb-3 text-xs text-[var(--admin-text-muted)]">
            Internal notes, not visible to the applicant. Each entry is kept as its own post, not
            overwritten, so multiple staff/admins can weigh in over time.
          </p>

          {reviewerNotes.length === 0 ? (
            <p className="mb-3 text-sm text-[var(--admin-text-muted)]">No notes yet.</p>
          ) : (
            <ul className="m-0 mb-3 flex list-none flex-col gap-3 p-0">
              {reviewerNotes.map((entry) => (
                <li
                  key={entry.id}
                  className="rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface-hover)] p-3"
                >
                  <div className="mb-1 flex items-center justify-between gap-2 text-xs text-[var(--admin-text-muted)]">
                    <span className="font-medium text-[var(--admin-text)]">
                      {entry.authorName}
                      {entry.authorRole ? ` (${entry.authorRole})` : ""}
                    </span>
                    <span>{formatDateTime(entry.createdAt)}</span>
                  </div>
                  <p className="m-0 whitespace-pre-wrap text-sm text-[var(--admin-text)]">{entry.note}</p>
                </li>
              ))}
            </ul>
          )}

          <Textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            rows={3}
            placeholder="Add a note..."
          />
          <div className="mt-2 flex items-center gap-2">
            <Button type="button" size="sm" disabled={notePending || !newNote.trim()} onClick={postNote}>
              {notePending ? "Posting..." : "Post note"}
            </Button>
            {noteError && <p className="text-xs text-[var(--admin-danger)]">{noteError}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
