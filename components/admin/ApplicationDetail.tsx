"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Copy, Mail, Phone } from "lucide-react";
import { updateApplicationStatus } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import DocumentViewer from "@/components/admin/DocumentViewer";
import ReviewerNotesThread, { type ReviewerNoteEntry } from "@/components/admin/ReviewerNotesThread";
import EmailApplicantDialog from "@/components/admin/EmailApplicantDialog";
import { APPLICATION_STATUSES, applicationStatusLabel, ordinal, type Application } from "@/lib/applications";
import { SCREENING_QUESTIONS } from "@/lib/screening";
import { formatDateTime } from "@/lib/history";
import type { Database } from "@/lib/database.types";

type ApplicationDocument = Database["public"]["Tables"]["application_documents"]["Row"];
type TeamPreference = Database["public"]["Tables"]["application_team_preferences"]["Row"];
type ScreeningAnswer = Database["public"]["Tables"]["application_screening_answers"]["Row"];
type StatusHistoryEntry = Database["public"]["Tables"]["application_status_history"]["Row"];
type EmailLogEntry = Database["public"]["Tables"]["application_email_log"]["Row"];

const statusDotClass: Record<string, string> = {
  submitted: "bg-[var(--admin-text-muted)]",
  under_review: "bg-[var(--admin-brand)]",
  interviewing: "bg-[var(--admin-brand)]",
  offer: "bg-[var(--admin-success)]",
  hired: "bg-[var(--admin-success)]",
  rejected: "bg-[var(--admin-danger)]",
  withdrawn: "bg-[var(--admin-danger)]",
};

const statusPillClass: Record<string, string> = {
  submitted: "bg-[var(--admin-neutral-soft)] text-[var(--admin-text-muted)]",
  under_review: "bg-[var(--admin-brand-soft)] text-[var(--admin-brand)]",
  interviewing: "bg-[var(--admin-brand-soft)] text-[var(--admin-brand)]",
  offer: "bg-[var(--admin-success-soft)] text-[var(--admin-success)]",
  hired: "bg-[var(--admin-success-soft)] text-[var(--admin-success)]",
  rejected: "bg-[var(--admin-danger-soft)] text-[var(--admin-danger)]",
  withdrawn: "bg-[var(--admin-danger-soft)] text-[var(--admin-danger)]",
};

// Yes/no screening questions get a subtle indicator next to their answer,
// but never a green/red one -- whether "Yes" is the encouraging answer
// depends entirely on the question (compare "authorized to work" to "needs
// visa sponsorship"), so color would just be misleading noise here.
const YES_NO_QUESTIONS: Set<string> = new Set(
  Object.values(SCREENING_QUESTIONS)
    .filter((q) => q.type === "yes_no")
    .map((q) => q.question)
);

function StatusDot({ status }: { status: string }) {
  return (
    <span
      aria-hidden="true"
      className={"inline-block size-2 rounded-full " + (statusDotClass[status] ?? "bg-[var(--admin-text-muted)]")}
    />
  );
}

function CopyEmailButton({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timeout = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timeout);
  }, [copied]);

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label={copied ? "Email address copied" : "Copy email address"}
        onClick={async () => {
          await navigator.clipboard.writeText(email);
          setCopied(true);
        }}
        className="flex size-6 items-center justify-center rounded-md text-[var(--admin-text-muted)] outline-none hover:bg-[var(--admin-surface-hover)] hover:text-[var(--admin-text)] focus-visible:ring-2 focus-visible:ring-[var(--admin-brand)]"
      >
        <Copy className="size-3.5" />
      </button>
      <span className="sr-only" role="status">
        {copied ? "Email address copied" : ""}
      </span>
    </span>
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
  currentUserId,
  currentUserRole,
  emailLog,
}: {
  application: Application;
  jobTitle: string;
  jobRole: string | null;
  documents: ApplicationDocument[];
  teamPreferences: TeamPreference[];
  screeningAnswers: ScreeningAnswer[];
  statusHistory: StatusHistoryEntry[];
  reviewerNotes: ReviewerNoteEntry[];
  currentUserId: string | null;
  currentUserRole: "staff" | "admin";
  emailLog: EmailLogEntry[];
}) {
  const [status, setStatus] = useState(application.status);
  const [savedStatus, setSavedStatus] = useState(application.status);
  const [statusPending, startStatusTransition] = useTransition();
  const [statusError, setStatusError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [confirmStatusOpen, setConfirmStatusOpen] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);

  useEffect(() => {
    if (!successMessage) return;
    const timeout = setTimeout(() => setSuccessMessage(null), 4000);
    return () => clearTimeout(timeout);
  }, [successMessage]);

  function confirmedSaveStatus() {
    setStatusError(null);
    startStatusTransition(() => {
      updateApplicationStatus(application.id, status).then((result) => {
        setConfirmStatusOpen(false);
        if (result && "error" in result) {
          setStatusError(result.error);
        } else {
          setSavedStatus(status);
          setSuccessMessage("Status saved.");
        }
      });
    });
  }

  const sortedTeamPreferences = [...teamPreferences].sort((a, b) => a.preference_rank - b.preference_rank);

  return (
    <div>
      <Link
        href="/admin/applications"
        className="mb-4 inline-block text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to applications
      </Link>

      {successMessage && (
        <p
          role="status"
          className="mb-3 rounded-md bg-[var(--admin-success-soft)] px-3 py-2 text-sm text-[var(--admin-success)]"
        >
          {successMessage}
        </p>
      )}

      {/* Applicant header */}
      <div className="mb-6 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold text-[var(--admin-text)]">
            {application.firstName} {application.lastName}
          </h1>
          <span
            className={
              "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium " +
              (statusPillClass[application.status] ?? "bg-[var(--admin-neutral-soft)] text-[var(--admin-text-muted)]")
            }
          >
            <StatusDot status={application.status} />
            {applicationStatusLabel(application.status)}
          </span>
        </div>
        <p className="mt-0.5 text-sm text-[var(--admin-text-muted)]">
          {jobTitle}
          {jobRole ? ` · ${jobRole}` : ""}
        </p>
        <p className="mt-0.5 text-xs text-[var(--admin-text-muted)]">
          Submitted {formatDateTime(application.createdAt)}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
          <span className="flex items-center gap-1.5">
            <Mail className="size-3.5 text-[var(--admin-text-muted)]" aria-hidden="true" />
            <a href={`mailto:${application.email}`} className="text-[var(--admin-brand)] hover:underline">
              {application.email}
            </a>
            <CopyEmailButton email={application.email} />
          </span>
          {application.phone && (
            <span className="flex items-center gap-1.5">
              <Phone className="size-3.5 text-[var(--admin-text-muted)]" aria-hidden="true" />
              <a href={`tel:${application.phone}`} className="text-[var(--admin-brand)] hover:underline">
                {application.phone}
              </a>
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
        {/* Main column */}
        <div className="flex flex-col gap-6">
          <section aria-labelledby="screening-heading" className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4">
            <h2 id="screening-heading" className="mb-3 text-base font-medium text-[var(--admin-text)]">
              Screening answers
            </h2>
            {screeningAnswers.length === 0 ? (
              <p className="text-sm text-[var(--admin-text-muted)]">None provided.</p>
            ) : (
              <dl className="flex flex-col gap-4">
                {screeningAnswers.map((answer) => (
                  <div key={answer.id} className="border-l-2 border-[var(--admin-border)] pl-3">
                    <dt className="text-sm font-medium text-[var(--admin-text)]">{answer.question}</dt>
                    <dd className="mt-1 text-sm whitespace-pre-wrap text-[var(--admin-text-muted)]">
                      {YES_NO_QUESTIONS.has(answer.question) ? (
                        <span className="inline-block rounded border border-[var(--admin-border-strong)] px-1.5 py-0.5 text-xs font-medium uppercase tracking-wide text-[var(--admin-text)]">
                          {answer.answer}
                        </span>
                      ) : (
                        answer.answer
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </section>

          <section aria-labelledby="documents-heading" className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4">
            <h2 id="documents-heading" className="mb-3 text-base font-medium text-[var(--admin-text)]">
              Documents
            </h2>
            <DocumentViewer documents={documents} />
          </section>

          <section aria-labelledby="details-heading" className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4">
            <h2 id="details-heading" className="mb-3 text-base font-medium text-[var(--admin-text)]">
              Team preferences and details
            </h2>
            <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-[var(--admin-text-muted)]">Team preferences</dt>
                {sortedTeamPreferences.length === 0 ? (
                  <dd className="mt-1 text-sm text-[var(--admin-text)]">None provided.</dd>
                ) : (
                  <dd className="mt-1">
                    <ol className="m-0 flex list-none flex-col gap-1 p-0 text-sm text-[var(--admin-text)]">
                      {sortedTeamPreferences.map((pref) => (
                        <li key={pref.id} className="flex items-baseline gap-1.5">
                          <span className="text-xs font-medium text-[var(--admin-text-muted)]">
                            {ordinal(pref.preference_rank)}
                          </span>
                          <span>{pref.team_name}</span>
                        </li>
                      ))}
                    </ol>
                  </dd>
                )}
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 [&>div]:min-w-0">
                <div>
                  <dt className="text-xs text-[var(--admin-text-muted)]">School</dt>
                  <dd className="text-sm text-[var(--admin-text)]">{application.school ?? "—"}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-xs text-[var(--admin-text-muted)]">School email</dt>
                  <dd className="text-sm break-words text-[var(--admin-text)]">{application.schoolEmail ?? "—"}</dd>
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
          </section>
        </div>

        {/* Review column */}
        <div className="flex flex-col gap-6 lg:sticky lg:top-4">
          <section aria-labelledby="status-heading" className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4">
            <h2 id="status-heading" className="mb-3 text-base font-medium text-[var(--admin-text)]">
              Status
            </h2>
            <div className="flex flex-col gap-2">
              <label htmlFor="application-status-select" className="sr-only">
                Application status
              </label>
              <Select value={status} onValueChange={(v) => v && setStatus(v as Application["status"])}>
                <SelectTrigger id="application-status-select" className="w-full">
                  {/* base-ui's SelectValue can't infer a plain-text label from a
                      SelectItem whose children are JSX (the dot + label span
                      below), it falls back to the raw enum value without this
                      render-prop -- see Select.Value's `children` function form. */}
                  <SelectValue>
                    {() => (
                      <span className="flex items-center gap-2">
                        <StatusDot status={status} />
                        {applicationStatusLabel(status)}
                      </span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {APPLICATION_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      <span className="flex items-center gap-2">
                        <StatusDot status={s} />
                        {applicationStatusLabel(s)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                size="sm"
                disabled={statusPending || status === savedStatus}
                onClick={() => setConfirmStatusOpen(true)}
              >
                {statusPending ? "Saving..." : "Save status"}
              </Button>
              {statusError && (
                <p role="alert" className="text-xs text-[var(--admin-danger)]">
                  {statusError}
                </p>
              )}
              <Button type="button" variant="outline" size="sm" onClick={() => setEmailDialogOpen(true)}>
                Email applicant
              </Button>
            </div>

            <AlertDialog open={confirmStatusOpen} onOpenChange={setConfirmStatusOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Change status?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This changes the application status from {applicationStatusLabel(savedStatus)} to{" "}
                    {applicationStatusLabel(status)}. This is internal only and never emails the applicant.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={statusPending}>Cancel</AlertDialogCancel>
                  <AlertDialogAction disabled={statusPending} onClick={confirmedSaveStatus}>
                    {statusPending ? "Saving..." : "Save status"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <EmailApplicantDialog
              open={emailDialogOpen}
              onOpenChange={setEmailDialogOpen}
              applicationId={application.id}
              applicantName={`${application.firstName} ${application.lastName}`}
            />

            <h3 className="mb-2 mt-4 text-sm font-medium text-[var(--admin-text)]">History</h3>
            {statusHistory.length === 0 ? (
              <p className="text-sm text-[var(--admin-text-muted)]">No status changes yet.</p>
            ) : (
              // Fixed height + scroll, not unbounded growth -- a busy
              // application's history would otherwise keep pushing the
              // rest of the page down every time a new entry is added.
              // Newest first, since that's what a reviewer checking in on
              // an application mid-review usually wants to see immediately.
              <ul className="m-0 flex max-h-40 list-none flex-col gap-1 overflow-y-auto p-0 text-xs text-[var(--admin-text-muted)]">
                {[...statusHistory].reverse().map((entry) => (
                  <li key={entry.id}>
                    {formatDateTime(entry.created_at)}:{" "}
                    {entry.old_status ? `${applicationStatusLabel(entry.old_status)} → ` : ""}
                    {applicationStatusLabel(entry.new_status)}
                  </li>
                ))}
              </ul>
            )}

            <h3 className="mb-2 mt-4 text-sm font-medium text-[var(--admin-text)]">Emails sent</h3>
            {emailLog.length === 0 ? (
              <p className="text-sm text-[var(--admin-text-muted)]">No emails sent to this applicant yet.</p>
            ) : (
              // Same fixed-height/scroll/newest-first treatment as Status
              // History above, for the same reason -- a long-lived
              // application shouldn't keep growing this column.
              <ul className="m-0 flex max-h-40 list-none flex-col gap-1 overflow-y-auto p-0 text-xs text-[var(--admin-text-muted)]">
                {emailLog.map((entry) => (
                  <li key={entry.id}>
                    {formatDateTime(entry.created_at)}: &quot;{entry.template_name}&quot;
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      {/* Reviewer notes, full width */}
      <div className="mt-6 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4">
        <ReviewerNotesThread
          applicationId={application.id}
          notes={reviewerNotes}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
        />
      </div>
    </div>
  );
}
