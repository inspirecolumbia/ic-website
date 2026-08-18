"use client";

import { useMemo, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { APPLICATION_STATUSES, applicationStatusLabel } from "@/lib/applications";
import { formatDateTime } from "@/lib/history";
import type { EmailTemplateDetail, EmailTemplateSummary } from "@/lib/email/send";
import { checkVariableCoverage, type MassEmailRecipient } from "@/lib/mass-email";
import {
  getMassEmailTemplateDetail,
  listMassEmailRecipients,
  sendMassEmail,
} from "@/app/admin/applications/mass-email/actions";

// datetime-local inputs work in the browser's local wall-clock time with no
// timezone info attached -- these convert to/from the UTC ISO instants
// Resend's scheduledAt expects, same approach as JobForm.tsx's posting/
// closing date fields.
function isoToLocalInputValue(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localInputValueToIso(value: string): string {
  return value ? new Date(value).toISOString() : "";
}

export default function MassEmailComposer({
  jobs,
  templates,
  fromAddress,
}: {
  jobs: { id: string; title: string }[];
  templates: EmailTemplateSummary[];
  fromAddress: string | null;
}) {
  const [status, setStatus] = useState(APPLICATION_STATUSES[0]);
  const [jobId, setJobId] = useState<string>("all");
  const [additionalEmailsRaw, setAdditionalEmailsRaw] = useState("");

  const [recipients, setRecipients] = useState<MassEmailRecipient[] | null>(null);
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [invalidEmails, setInvalidEmails] = useState<string[]>([]);
  const [loadingRecipients, startLoadRecipients] = useTransition();

  const [templateId, setTemplateId] = useState<string>("");
  const [template, setTemplate] = useState<EmailTemplateDetail | null>(null);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [showTemplatePreview, setShowTemplatePreview] = useState(false);
  const [loadingTemplate, startLoadTemplate] = useTransition();

  const [scheduleMode, setScheduleMode] = useState<"now" | "later">("now");
  const [scheduledLocal, setScheduledLocal] = useState("");

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sendPending, startSend] = useTransition();
  const [result, setResult] = useState<{ sentCount: number; failedCount: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function invalidateRecipients() {
    setRecipients(null);
    setSelectedEmails(new Set());
    setResult(null);
  }

  function loadRecipients() {
    setError(null);
    startLoadRecipients(async () => {
      const res = await listMassEmailRecipients({ status, jobId: jobId === "all" ? null : jobId, additionalEmailsRaw });
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setRecipients(res.recipients);
      setSelectedEmails(new Set(res.recipients.map((r) => r.to)));
      setInvalidEmails(res.invalidEmails);
    });
  }

  function toggleRecipient(email: string, checked: boolean) {
    setSelectedEmails((prev) => {
      const next = new Set(prev);
      if (checked) next.add(email);
      else next.delete(email);
      return next;
    });
  }

  function toggleAllRecipients(checked: boolean) {
    setSelectedEmails(checked ? new Set((recipients ?? []).map((r) => r.to)) : new Set());
  }

  function selectTemplate(id: string) {
    setTemplateId(id);
    setTemplate(null);
    setVariableValues({});
    setError(null);
    startLoadTemplate(async () => {
      const res = await getMassEmailTemplateDetail(id);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setTemplate(res.template);
      setVariableValues(
        Object.fromEntries(
          res.template.variables.map((v) => [v.key, v.fallbackValue != null ? String(v.fallbackValue) : ""])
        )
      );
    });
  }

  const selectedRecipients = useMemo(
    () => (recipients ?? []).filter((r) => selectedEmails.has(r.to)),
    [recipients, selectedEmails]
  );

  const coverage = useMemo(
    () => (template ? checkVariableCoverage(selectedRecipients, template.variables, variableValues) : []),
    [template, selectedRecipients, variableValues]
  );
  const hasMissingVariables = coverage.some((c) => c.missingFor > 0);

  const scheduledIso = scheduleMode === "later" ? localInputValueToIso(scheduledLocal) : "";
  const scheduleReady = scheduleMode === "now" || (scheduledLocal !== "" && new Date(scheduledIso) > new Date());

  const canSend =
    Boolean(template) &&
    selectedRecipients.length > 0 &&
    !hasMissingVariables &&
    scheduleReady &&
    !sendPending;

  function confirmedSend() {
    setError(null);
    startSend(async () => {
      const res = await sendMassEmail({
        status,
        jobId: jobId === "all" ? null : jobId,
        additionalEmailsRaw,
        selectedEmails: [...selectedEmails],
        templateId,
        variables: variableValues,
        scheduledAt: scheduleMode === "later" ? scheduledIso : null,
      });
      setConfirmOpen(false);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setResult(res);
      invalidateRecipients();
    });
  }

  const [minScheduleLocal] = useState(() => isoToLocalInputValue(new Date(Date.now() + 60_000).toISOString()));

  return (
    <div className="max-w-2xl">
      {templates.length === 0 && (
        <p
          role="status"
          className="mb-4 rounded-md bg-[var(--admin-neutral-soft)] px-3 py-2 text-sm text-[var(--admin-text-muted)]"
        >
          No published templates were found in Resend.{" "}
          <a
            href="https://resend.com/templates"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[var(--admin-brand)] underline-offset-2 hover:underline"
          >
            Create one on Resend
          </a>{" "}
          and publish it before sending a mass email.
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="mb-4 rounded-md bg-[var(--admin-danger-soft)] px-3 py-2 text-sm text-[var(--admin-danger)]"
        >
          {error}
        </p>
      )}

      {result && (
        <p
          role="status"
          className="mb-4 rounded-md bg-[var(--admin-success-soft)] px-3 py-2 text-sm text-[var(--admin-success)]"
        >
          Sent {result.sentCount} email{result.sentCount === 1 ? "" : "s"}.
          {result.failedCount > 0 && ` ${result.failedCount} failed to send.`}
        </p>
      )}

      <fieldset className="mb-6 flex flex-col gap-3 rounded-lg border border-[var(--admin-border)] p-4">
        <legend className="px-1 text-sm font-semibold">Recipients</legend>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mass-email-status">Status</Label>
            <Select
              value={status}
              onValueChange={(v) => {
                if (!v) return;
                setStatus(v as typeof status);
                invalidateRecipients();
              }}
            >
              <SelectTrigger id="mass-email-status" className="w-full">
                {/* See the template SelectValue below for why this render-prop
                    form is needed -- base-ui doesn't infer a label from a
                    SelectItem's children on its own. */}
                <SelectValue>{(v: typeof status) => applicationStatusLabel(v)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {APPLICATION_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {applicationStatusLabel(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mass-email-job">Job (optional)</Label>
            <Select
              value={jobId}
              onValueChange={(v) => {
                setJobId(v ?? "all");
                invalidateRecipients();
              }}
            >
              <SelectTrigger id="mass-email-job" className="w-full">
                <SelectValue>
                  {(v: string) => (v === "all" ? "All jobs" : (jobs.find((j) => j.id === v)?.title ?? v))}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All jobs</SelectItem>
                {jobs.map((job) => (
                  <SelectItem key={job.id} value={job.id}>
                    {job.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="mass-email-additional">Additional emails not in the system (optional)</Label>
          <Textarea
            id="mass-email-additional"
            placeholder="One per line, or comma-separated"
            value={additionalEmailsRaw}
            onChange={(e) => {
              setAdditionalEmailsRaw(e.target.value);
              invalidateRecipients();
            }}
            rows={3}
          />
        </div>

        <div>
          <Button type="button" variant="outline" size="sm" onClick={loadRecipients} disabled={loadingRecipients}>
            {loadingRecipients ? "Loading..." : recipients ? "Reload recipients" : "Load recipients"}
          </Button>
        </div>

        {recipients && (
          <div className="flex flex-col gap-2">
            {invalidEmails.length > 0 && (
              <p className="text-sm text-[var(--admin-danger)]">
                Ignored {invalidEmails.length} invalid address{invalidEmails.length === 1 ? "" : "es"}:{" "}
                {invalidEmails.join(", ")}
              </p>
            )}

            {recipients.length === 0 ? (
              <p className="text-sm text-[var(--admin-text-muted)]">No recipients match this filter.</p>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={selectedEmails.size === recipients.length}
                      indeterminate={selectedEmails.size > 0 && selectedEmails.size < recipients.length}
                      onCheckedChange={(checked) => toggleAllRecipients(checked === true)}
                      aria-label="Select all recipients"
                    />
                    {selectedEmails.size} of {recipients.length} selected
                  </span>
                </div>
                <ul className="max-h-56 overflow-y-auto rounded-md border border-[var(--admin-border)]">
                  {recipients.map((recipient) => (
                    <li
                      key={recipient.to}
                      className="flex items-center gap-2 border-b border-[var(--admin-border)] px-3 py-1.5 text-sm last:border-b-0"
                    >
                      <Checkbox
                        checked={selectedEmails.has(recipient.to)}
                        onCheckedChange={(checked) => toggleRecipient(recipient.to, checked === true)}
                        aria-label={`Include ${recipient.to}`}
                      />
                      <span className="flex-1 truncate">
                        {recipient.firstName || recipient.lastName ? (
                          <>
                            {recipient.firstName} {recipient.lastName}{" "}
                            <span className="text-[var(--admin-text-muted)]">&lt;{recipient.to}&gt;</span>
                          </>
                        ) : (
                          <>
                            {recipient.to} <span className="text-[var(--admin-text-muted)]">(manual)</span>
                          </>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </fieldset>

      <fieldset className="mb-6 flex flex-col gap-3 rounded-lg border border-[var(--admin-border)] p-4">
        <legend className="px-1 text-sm font-semibold">Template</legend>

        <p className="text-sm text-[var(--admin-text-muted)]">
          Sending from{" "}
          <span className="font-medium text-[var(--admin-text)]">{fromAddress ?? "not configured"}</span>
        </p>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="mass-email-template">Resend template</Label>
            <a
              href="https://resend.com/templates"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[var(--admin-brand)] underline-offset-2 hover:underline"
            >
              Create new template ↗
            </a>
          </div>
          <Select value={templateId} onValueChange={(v) => v && selectTemplate(v)} disabled={templates.length === 0}>
            <SelectTrigger id="mass-email-template" className="w-full">
              {/* base-ui's SelectValue can't infer a plain-text label from a
                  matched SelectItem's children on its own -- without this
                  render-prop form, a picked template showed its raw id
                  instead of its name. */}
              <SelectValue placeholder="Select a template">
                {(v: string) => templates.find((t) => t.id === v)?.name ?? v}
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

        {loadingTemplate && <p className="text-sm text-[var(--admin-text-muted)]">Loading template...</p>}

        {!loadingTemplate && template && (
          <>
            <div className="flex items-center justify-between">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowTemplatePreview((v) => !v)}>
                {showTemplatePreview ? "Hide preview" : "Preview template"}
              </Button>
              <a
                href={`https://resend.com/templates/${template.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[var(--admin-brand)] underline-offset-2 hover:underline"
              >
                Open in Resend ↗
              </a>
            </div>

            {showTemplatePreview && (
              <div className="rounded-md border border-[var(--admin-border)]">
                <p className="border-b border-[var(--admin-border)] px-3 py-2 text-sm">
                  <span className="text-[var(--admin-text-muted)]">Subject: </span>
                  {template.subject || "(no subject set)"}
                </p>
                <iframe
                  title="Template preview"
                  sandbox=""
                  srcDoc={template.html}
                  className="h-72 w-full bg-white"
                />
              </div>
            )}

            {template.variables.length > 0 && (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-[var(--admin-text-muted)]">
                  {"first_name"} and {"last_name"} fill in automatically per applicant. Anything else applies
                  the same value to every selected recipient.
                </p>
                {template.variables.map((variable) => {
                  const cov = coverage.find((c) => c.key === variable.key);
                  return (
                    <div key={variable.key} className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor={`mass-email-var-${variable.key}`}>{variable.key}</Label>
                        {cov && (
                          <span
                            className={
                              "text-xs " +
                              (cov.missingFor > 0 ? "text-[var(--admin-danger)]" : "text-[var(--admin-text-muted)]")
                            }
                          >
                            {cov.autoFillsFor > 0 && `Auto-fills for ${cov.autoFillsFor}`}
                            {cov.autoFillsFor > 0 && cov.missingFor > 0 && " · "}
                            {cov.missingFor > 0 && `Missing a value for ${cov.missingFor}`}
                          </span>
                        )}
                      </div>
                      <Input
                        id={`mass-email-var-${variable.key}`}
                        value={variableValues[variable.key] ?? ""}
                        onChange={(e) => setVariableValues((prev) => ({ ...prev, [variable.key]: e.target.value }))}
                        placeholder={variable.fallbackValue != null ? String(variable.fallbackValue) : undefined}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </fieldset>

      <fieldset className="mb-6 flex flex-col gap-3 rounded-lg border border-[var(--admin-border)] p-4">
        <legend className="px-1 text-sm font-semibold">When</legend>
        <div className="flex flex-col gap-1.5">
          <Select value={scheduleMode} onValueChange={(v) => v && setScheduleMode(v as typeof scheduleMode)}>
            <SelectTrigger className="w-full sm:w-[220px]">
              <SelectValue>
                {(v: typeof scheduleMode) => (v === "now" ? "Send immediately" : "Schedule for later")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="now">Send immediately</SelectItem>
              <SelectItem value="later">Schedule for later</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {scheduleMode === "later" && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mass-email-scheduled-at">Send at (up to 30 days out)</Label>
            <Input
              id="mass-email-scheduled-at"
              type="datetime-local"
              min={minScheduleLocal}
              value={scheduledLocal}
              onChange={(e) => setScheduledLocal(e.target.value)}
              className="w-full sm:w-[260px]"
            />
          </div>
        )}
      </fieldset>

      <Button type="button" onClick={() => setConfirmOpen(true)} disabled={!canSend}>
        Review and {scheduleMode === "later" ? "schedule" : "send"}
      </Button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{scheduleMode === "later" ? "Schedule this email?" : "Send this email?"}</AlertDialogTitle>
            <AlertDialogDescription>
              This sends &quot;{template?.name ?? "the selected template"}&quot; from{" "}
              {fromAddress ?? "the configured sender"} to {selectedRecipients.length} recipient
              {selectedRecipients.length === 1 ? "" : "s"},{" "}
              {scheduleMode === "later" && scheduledIso
                ? `scheduled for ${formatDateTime(scheduledIso)}`
                : "right away"}
              . This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sendPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={sendPending} onClick={confirmedSend}>
              {sendPending ? "Sending..." : scheduleMode === "later" ? "Schedule" : "Send"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
