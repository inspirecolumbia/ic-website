"use client";

import { useEffect, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
import type { EmailTemplateDetail, EmailTemplateSummary } from "@/lib/email/send";
import { sendApplicantEmail } from "@/app/admin/actions";
import { getMassEmailTemplateDetail, listMassEmailTemplates } from "@/app/admin/applications/mass-email/actions";

// A lighter, single-recipient sibling of MassEmailComposer -- for "just
// email this one applicant" from their detail page, without navigating to
// the mass-email tool and building a filter for a group of one.
export default function EmailApplicantDialog({
  open,
  onOpenChange,
  applicationId,
  applicantName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicationId: string;
  applicantName: string;
}) {
  const [templates, setTemplates] = useState<EmailTemplateSummary[] | null>(null);
  const [loadingTemplates, startLoadTemplates] = useTransition();
  const [templateId, setTemplateId] = useState("");
  const [template, setTemplate] = useState<EmailTemplateDetail | null>(null);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [loadingTemplate, startLoadTemplate] = useTransition();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sendPending, startSend] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  // Base-ui's Dialog only calls its own `onOpenChange` in response to the
  // dialog's own internal close/open gestures (Escape, overlay click, the
  // close button) -- not when a parent flips the `open` prop externally,
  // which is exactly how this dialog opens (the "Email applicant" button in
  // ApplicationDetail.tsx sets state directly). Relying on onOpenChange to
  // trigger the template fetch meant it never fired on the real open path,
  // leaving the dialog stuck showing neither a loading state nor a
  // template list. Watching `open` directly in an effect fires regardless
  // of how it became true.
  useEffect(() => {
    if (open && templates === null) {
      startLoadTemplates(async () => {
        const res = await listMassEmailTemplates();
        if ("error" in res) {
          setError(res.error);
          return;
        }
        setTemplates(res.templates);
      });
    }
  }, [open, templates]);

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) {
      setResult(null);
      setError(null);
    }
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

  function confirmedSend() {
    setError(null);
    startSend(async () => {
      const res = await sendApplicantEmail(applicationId, templateId, variableValues);
      setConfirmOpen(false);
      if (res && "error" in res) {
        setError(res.error);
        return;
      }
      setResult(`Sent to ${applicantName}.`);
    });
  }

  const selectedTemplate = templates?.find((t) => t.id === templateId);

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Email {applicantName}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            {error && (
              <p role="alert" className="rounded-md bg-[var(--admin-danger-soft)] px-3 py-2 text-sm text-[var(--admin-danger)]">
                {error}
              </p>
            )}
            {result && (
              <p role="status" className="rounded-md bg-[var(--admin-success-soft)] px-3 py-2 text-sm text-[var(--admin-success)]">
                {result}
              </p>
            )}

            {loadingTemplates && <p className="text-sm text-[var(--admin-text-muted)]">Loading templates...</p>}

            {templates && templates.length === 0 && (
              <p className="text-sm text-[var(--admin-text-muted)]">
                No published templates were found in Resend.
              </p>
            )}

            {templates && templates.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="applicant-email-template">Resend template</Label>
                <Select value={templateId} onValueChange={(v) => v && selectTemplate(v)}>
                  <SelectTrigger id="applicant-email-template" className="w-full">
                    <SelectValue placeholder="Select a template" />
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

            {loadingTemplate && <p className="text-sm text-[var(--admin-text-muted)]">Loading template...</p>}

            {!loadingTemplate && template && template.variables.length > 0 && (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-[var(--admin-text-muted)]">
                  {"first_name"} and {"last_name"} fill in automatically for {applicantName}. Anything else
                  needs a value below.
                </p>
                {template.variables.map((variable) => {
                  const autoFilled = variable.key === "first_name" || variable.key === "last_name";
                  if (autoFilled) return null;
                  return (
                    <div key={variable.key} className="flex flex-col gap-1.5">
                      <Label htmlFor={`applicant-email-var-${variable.key}`}>{variable.key}</Label>
                      <Input
                        id={`applicant-email-var-${variable.key}`}
                        value={variableValues[variable.key] ?? ""}
                        onChange={(e) => setVariableValues((prev) => ({ ...prev, [variable.key]: e.target.value }))}
                        placeholder={variable.fallbackValue != null ? String(variable.fallbackValue) : undefined}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={!template || sendPending} onClick={() => setConfirmOpen(true)}>
              Review and send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send this email?</AlertDialogTitle>
            <AlertDialogDescription>
              This sends &quot;{selectedTemplate?.name ?? "the selected template"}&quot; to {applicantName} right
              away. This can&apos;t be undone.
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
    </>
  );
}
