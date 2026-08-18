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
import { updateResendFromAddress, updateStaffAlertTemplateId, updateFeatureToggle } from "@/app/admin/settings/actions";
import type { EmailTemplateSummary } from "@/lib/email/send";
import FeatureToggleRow from "@/components/admin/FeatureToggleRow";

// Sentinel for the "keep the built-in message" option -- an actual
// empty-string SelectItem value is a known footgun with this project's
// Select primitive (base-ui), same reasoning as JobApplicationForm's
// UNSELECTED_TEAM. Translated to/from null (the DB's "use the default"
// value) at the boundary instead.
const DEFAULT_STAFF_ALERT_TEMPLATE = "__default__";

export default function AppSettingsForm({
  initialFromAddress,
  initialStaffAlertTemplateId,
  templates,
  applicationDeleteEnabled,
  userDeleteEnabled,
  historyDeleteEnabled,
}: {
  initialFromAddress: string;
  initialStaffAlertTemplateId: string | null;
  templates: EmailTemplateSummary[];
  applicationDeleteEnabled: boolean;
  userDeleteEnabled: boolean;
  historyDeleteEnabled: boolean;
}) {
  const [value, setValue] = useState(initialFromAddress);
  const [pending, startTransition] = useTransition();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [staffAlertTemplateId, setStaffAlertTemplateId] = useState(
    initialStaffAlertTemplateId ?? DEFAULT_STAFF_ALERT_TEMPLATE
  );
  const [templatePending, startTemplateTransition] = useTransition();
  const [templateSuccessMessage, setTemplateSuccessMessage] = useState<string | null>(null);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [confirmTemplateOpen, setConfirmTemplateOpen] = useState(false);

  useEffect(() => {
    if (!successMessage) return;
    const timeout = setTimeout(() => setSuccessMessage(null), 4000);
    return () => clearTimeout(timeout);
  }, [successMessage]);

  useEffect(() => {
    if (!templateSuccessMessage) return;
    const timeout = setTimeout(() => setTemplateSuccessMessage(null), 4000);
    return () => clearTimeout(timeout);
  }, [templateSuccessMessage]);

  function confirmedSave() {
    setError(null);
    startTransition(async () => {
      const res = await updateResendFromAddress(value);
      setConfirmOpen(false);
      if (res && "error" in res) {
        setError(res.error);
        return;
      }
      setSuccessMessage("Saved.");
    });
  }

  const selectedTemplateName = templates.find((t) => t.id === staffAlertTemplateId)?.name;

  function confirmedTemplateSave() {
    setTemplateError(null);
    startTemplateTransition(async () => {
      const res = await updateStaffAlertTemplateId(
        staffAlertTemplateId === DEFAULT_STAFF_ALERT_TEMPLATE ? null : staffAlertTemplateId
      );
      setConfirmTemplateOpen(false);
      if (res && "error" in res) {
        setTemplateError(res.error);
        return;
      }
      setTemplateSuccessMessage("Saved.");
    });
  }

  return (
    <div className="max-w-lg">
      {successMessage && (
        <p
          role="status"
          className="mb-4 rounded-md bg-[var(--admin-success-soft)] px-3 py-2 text-sm text-[var(--admin-success)]"
        >
          {successMessage}
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

      <fieldset className="flex flex-col gap-3 rounded-lg border border-[var(--admin-border)] p-4">
        <legend className="px-1 text-sm font-semibold">Email</legend>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="resend-from-address">From address</Label>
          <Input
            id="resend-from-address"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Inspire Columbia <hello@inspirecolumbia.org>"
          />
          <p className="text-sm text-[var(--admin-text-muted)]">
            Used for every email this site sends through Resend: applicant confirmations, staff
            alerts, and mass emails. Accepts a bare address or &quot;Name &lt;email@domain.com&gt;&quot;.
          </p>
        </div>
        <div>
          <Button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={pending || value.trim() === initialFromAddress}
          >
            {pending ? "Saving..." : "Save"}
          </Button>
        </div>
      </fieldset>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change the from address?</AlertDialogTitle>
            <AlertDialogDescription>
              Every email this site sends through Resend, applicant confirmations, staff alerts,
              and mass emails, will send from &quot;{value}&quot; instead of the current address.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={pending} onClick={confirmedSave}>
              {pending ? "Saving..." : "Save"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {templateSuccessMessage && (
        <p
          role="status"
          className="mt-6 mb-4 rounded-md bg-[var(--admin-success-soft)] px-3 py-2 text-sm text-[var(--admin-success)]"
        >
          {templateSuccessMessage}
        </p>
      )}
      {templateError && (
        <p
          role="alert"
          className="mt-6 mb-4 rounded-md bg-[var(--admin-danger-soft)] px-3 py-2 text-sm text-[var(--admin-danger)]"
        >
          {templateError}
        </p>
      )}

      <fieldset className="mt-6 flex flex-col gap-3 rounded-lg border border-[var(--admin-border)] p-4">
        <legend className="px-1 text-sm font-semibold">New-application staff alert</legend>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="staff-alert-template">Template</Label>
          <Select value={staffAlertTemplateId} onValueChange={(v) => setStaffAlertTemplateId(v as string)}>
            <SelectTrigger id="staff-alert-template">
              {/* base-ui's SelectValue can't infer a plain-text label from a
                  matched SelectItem on its own -- see the same note in
                  EmailApplicantDialog.tsx and elsewhere in this codebase. */}
              <SelectValue placeholder="Default (built-in message)">
                {(v: string) => (v === DEFAULT_STAFF_ALERT_TEMPLATE ? "Default (built-in message)" : (selectedTemplateName ?? v))}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={DEFAULT_STAFF_ALERT_TEMPLATE}>Default (built-in message)</SelectItem>
              {templates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-[var(--admin-text-muted)]">
            Sent to the staff alert address (set via the STAFF_ALERT_EMAIL environment variable)
            whenever a new application comes in. Leave on Default unless you want this routed
            through a Resend template instead.
          </p>
        </div>
        <div>
          <Button
            type="button"
            onClick={() => setConfirmTemplateOpen(true)}
            disabled={templatePending || staffAlertTemplateId === (initialStaffAlertTemplateId ?? DEFAULT_STAFF_ALERT_TEMPLATE)}
          >
            {templatePending ? "Saving..." : "Save"}
          </Button>
        </div>
      </fieldset>

      <AlertDialog open={confirmTemplateOpen} onOpenChange={setConfirmTemplateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change the staff alert template?</AlertDialogTitle>
            <AlertDialogDescription>
              {staffAlertTemplateId === DEFAULT_STAFF_ALERT_TEMPLATE
                ? "New-application staff alerts will go back to the built-in plain-text message."
                : `New-application staff alerts will send through "${selectedTemplateName ?? staffAlertTemplateId}" instead of the current message.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={templatePending}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={templatePending} onClick={confirmedTemplateSave}>
              {templatePending ? "Saving..." : "Save"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <fieldset className="mt-6 flex flex-col divide-y divide-[var(--admin-border)] rounded-lg border border-[var(--admin-border)] p-4">
        <legend className="px-1 text-sm font-semibold">Admin feature toggles</legend>
        <FeatureToggleRow
          label="Delete application"
          description="Lets admins permanently delete a job application and all of its documents, screening answers, and notes."
          checked={applicationDeleteEnabled}
          onConfirm={(next) => updateFeatureToggle("application_delete_enabled", next)}
        />
        <FeatureToggleRow
          label="Delete non-admin users"
          description="Lets admins permanently delete a member or staff account from Users."
          checked={userDeleteEnabled}
          onConfirm={(next) => updateFeatureToggle("user_delete_enabled", next)}
        />
        <FeatureToggleRow
          label="Delete history entries"
          description="Lets admins permanently delete audit history entries."
          checked={historyDeleteEnabled}
          onConfirm={(next) => updateFeatureToggle("history_delete_enabled", next)}
        />
      </fieldset>
    </div>
  );
}
