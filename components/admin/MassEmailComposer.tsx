"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { APPLICATION_STATUSES, applicationStatusLabel } from "@/lib/applications";
import type { EmailTemplateSummary, EmailTemplateVariable } from "@/lib/email/send";
import {
  getMassEmailTemplateVariables,
  previewMassEmailRecipients,
  sendMassEmail,
} from "@/app/admin/applications/mass-email/actions";

export default function MassEmailComposer({
  jobs,
  templates,
}: {
  jobs: { id: string; title: string }[];
  templates: EmailTemplateSummary[];
}) {
  const [status, setStatus] = useState(APPLICATION_STATUSES[0]);
  const [jobId, setJobId] = useState<string>("all");
  const [additionalEmailsRaw, setAdditionalEmailsRaw] = useState("");

  const [templateId, setTemplateId] = useState<string>("");
  const [templateVariables, setTemplateVariables] = useState<EmailTemplateVariable[]>([]);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [loadingVariables, startLoadVariables] = useTransition();

  const [preview, setPreview] = useState<{ count: number; invalidEmails: string[] } | null>(null);
  const [previewPending, startPreview] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sendPending, startSend] = useTransition();
  const [result, setResult] = useState<{ sentCount: number; failedCount: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function resetRecipientResults() {
    setPreview(null);
    setResult(null);
  }

  function selectTemplate(id: string) {
    setTemplateId(id);
    setTemplateVariables([]);
    setVariableValues({});
    setError(null);
    startLoadVariables(async () => {
      const res = await getMassEmailTemplateVariables(id);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setTemplateVariables(res.variables);
      setVariableValues(
        Object.fromEntries(res.variables.map((v) => [v.key, v.fallbackValue != null ? String(v.fallbackValue) : ""]))
      );
    });
  }

  function runPreview() {
    setError(null);
    startPreview(async () => {
      const res = await previewMassEmailRecipients({ status, jobId: jobId === "all" ? null : jobId, additionalEmailsRaw });
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setPreview(res);
    });
  }

  function confirmedSend() {
    setError(null);
    startSend(async () => {
      const res = await sendMassEmail({
        status,
        jobId: jobId === "all" ? null : jobId,
        additionalEmailsRaw,
        templateId,
        variables: variableValues,
      });
      setConfirmOpen(false);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setResult(res);
      setPreview(null);
    });
  }

  const selectedTemplate = templates.find((t) => t.id === templateId);
  const canSend = Boolean(templateId) && !sendPending;

  return (
    <div className="max-w-2xl">
      {templates.length === 0 && (
        <p
          role="status"
          className="mb-4 rounded-md bg-[var(--admin-neutral-soft)] px-3 py-2 text-sm text-[var(--admin-text-muted)]"
        >
          No published templates were found in Resend. Publish one at resend.com/templates before
          sending a mass email.
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
                resetRecipientResults();
              }}
            >
              <SelectTrigger id="mass-email-status" className="w-full">
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
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mass-email-job">Job (optional)</Label>
            <Select
              value={jobId}
              onValueChange={(v) => {
                setJobId(v ?? "all");
                resetRecipientResults();
              }}
            >
              <SelectTrigger id="mass-email-job" className="w-full">
                <SelectValue />
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
              resetRecipientResults();
            }}
            rows={3}
          />
        </div>

        <div>
          <Button type="button" variant="outline" size="sm" onClick={runPreview} disabled={previewPending}>
            {previewPending ? "Counting..." : "Preview recipients"}
          </Button>
          {preview && (
            <p className="mt-2 text-sm text-[var(--admin-text-muted)]">
              {preview.count} recipient{preview.count === 1 ? "" : "s"} will be emailed.
              {preview.invalidEmails.length > 0 && (
                <>
                  {" "}
                  Ignored {preview.invalidEmails.length} invalid address
                  {preview.invalidEmails.length === 1 ? "" : "es"}: {preview.invalidEmails.join(", ")}
                </>
              )}
            </p>
          )}
        </div>
      </fieldset>

      <fieldset className="mb-6 flex flex-col gap-3 rounded-lg border border-[var(--admin-border)] p-4">
        <legend className="px-1 text-sm font-semibold">Template</legend>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="mass-email-template">Resend template</Label>
          <Select value={templateId} onValueChange={(v) => v && selectTemplate(v)} disabled={templates.length === 0}>
            <SelectTrigger id="mass-email-template" className="w-full">
              <SelectValue placeholder="Select a template" />
            </SelectTrigger>
            <SelectContent>
              {templates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loadingVariables && <p className="text-sm text-[var(--admin-text-muted)]">Loading template variables...</p>}

        {!loadingVariables && templateVariables.length > 0 && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-[var(--admin-text-muted)]">
              {"first_name"} and {"last_name"} fill in automatically per applicant when the template
              defines them. Anything else applies the same value to every recipient.
            </p>
            {templateVariables.map((variable) => (
              <div key={variable.key} className="flex flex-col gap-1.5">
                <Label htmlFor={`mass-email-var-${variable.key}`}>{variable.key}</Label>
                <Input
                  id={`mass-email-var-${variable.key}`}
                  value={variableValues[variable.key] ?? ""}
                  onChange={(e) => setVariableValues((prev) => ({ ...prev, [variable.key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
        )}
      </fieldset>

      <Button type="button" onClick={() => setConfirmOpen(true)} disabled={!canSend}>
        Review and send
      </Button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send this email?</AlertDialogTitle>
            <AlertDialogDescription>
              This sends &quot;{selectedTemplate?.name ?? "the selected template"}&quot; to every applicant
              matching the current filter, plus any additional emails entered, right away. Preview
              recipients first if you haven&apos;t already, this can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sendPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={sendPending} onClick={confirmedSend}>
              {sendPending ? "Sending..." : "Send"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
