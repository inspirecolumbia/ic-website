"use client";

import { useState, useTransition } from "react";
import { Switch } from "@/components/ui/switch";
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

export default function FeatureToggleRow({
  label,
  description,
  checked,
  onConfirm,
}: {
  label: string;
  description: string;
  checked: boolean;
  onConfirm: (next: boolean) => Promise<{ error: string } | null>;
}) {
  // Awaiting confirmation, not yet applied -- Switch stays bound to the
  // `checked` prop itself (never mirrored into local state that flips
  // optimistically), so a canceled dialog can't leave the switch showing a
  // value that was never actually saved.
  const [pendingValue, setPendingValue] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, startTransition] = useTransition();

  function confirmed() {
    if (pendingValue === null) return;
    const next = pendingValue;
    startTransition(async () => {
      const res = await onConfirm(next);
      setPendingValue(null);
      if (res && "error" in res) setError(res.error);
      else setError(null);
    });
  }

  return (
    <div className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <div>
        <p className="text-sm font-medium text-[var(--admin-text)]">{label}</p>
        <p className="text-sm text-[var(--admin-text-muted)]">{description}</p>
        {error && (
          <p role="alert" className="mt-1 text-xs text-[var(--admin-danger)]">
            {error}
          </p>
        )}
      </div>
      <Switch
        checked={checked}
        disabled={saving}
        onCheckedChange={(next) => {
          setError(null);
          setPendingValue(next);
        }}
      />

      <AlertDialog
        open={pendingValue !== null}
        onOpenChange={(open) => {
          if (!open) setPendingValue(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pendingValue ? `Enable "${label}"?` : `Disable "${label}"?`}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingValue
                ? "Admins will be able to use this again immediately."
                : "This immediately hides and blocks this capability for every admin, until re-enabled here."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={saving} onClick={confirmed}>
              {saving ? "Saving..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
