"use client";

import { useEffect, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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
import { updateResendFromAddress } from "@/app/admin/settings/actions";

export default function AppSettingsForm({ initialFromAddress }: { initialFromAddress: string }) {
  const [value, setValue] = useState(initialFromAddress);
  const [pending, startTransition] = useTransition();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (!successMessage) return;
    const timeout = setTimeout(() => setSuccessMessage(null), 4000);
    return () => clearTimeout(timeout);
  }, [successMessage]);

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
    </div>
  );
}
