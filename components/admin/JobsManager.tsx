"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import JobsTable from "@/components/admin/JobsTable";
import JobForm from "@/components/admin/JobForm";
import { createJob, updateJob } from "@/app/admin/actions";
import type { Database } from "@/lib/database.types";

type JobRow = Database["public"]["Tables"]["jobs"]["Row"];
type TemplateRow = Database["public"]["Tables"]["application_templates"]["Row"];
type Panel = { mode: "new" } | { mode: "edit"; job: JobRow } | null;

export default function JobsManager({
  initialJobs,
  templates,
  canWrite,
}: {
  initialJobs: JobRow[];
  templates: TemplateRow[];
  canWrite: boolean;
}) {
  const [panel, setPanel] = useState<Panel>(null);
  const [dirty, setDirty] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [focusJobId, setFocusJobId] = useState<string | null>(null);

  const newJobButtonRef = useRef<HTMLButtonElement>(null);
  const rowTriggers = useRef(new Map<string, HTMLButtonElement>());
  const closeFocusTarget = useRef<HTMLButtonElement | null>(null);

  function registerRowTrigger(id: string, el: HTMLButtonElement | null) {
    if (el) rowTriggers.current.set(id, el);
    else rowTriggers.current.delete(id);
  }

  function openNew() {
    closeFocusTarget.current = newJobButtonRef.current;
    setDirty(false);
    setPanel({ mode: "new" });
  }

  function openEdit(job: JobRow) {
    closeFocusTarget.current = rowTriggers.current.get(job.id) ?? null;
    setDirty(false);
    setPanel({ mode: "edit", job });
  }

  function closeNow() {
    setPanel(null);
    setDirty(false);
    setConfirmDiscard(false);
    closeFocusTarget.current?.focus();
  }

  function requestClose() {
    if (dirty) {
      setConfirmDiscard(true);
      return;
    }
    closeNow();
  }

  function handleSuccess(id: string, notice?: string) {
    const isNew = panel?.mode === "new";
    setPanel(null);
    setDirty(false);
    const base = isNew ? "Job created." : "Job saved.";
    setSuccessMessage(notice ? `${base} ${notice}` : base);
    setFocusJobId(id);
  }

  useEffect(() => {
    if (!successMessage) return;
    const timeout = setTimeout(() => setSuccessMessage(null), 4000);
    return () => clearTimeout(timeout);
  }, [successMessage]);

  // Waits for the table to include the (possibly just-created) row before
  // focusing its trigger -- revalidatePath refreshes initialJobs
  // asynchronously, it isn't available in the same tick the save resolves.
  // Tracked via a ref (not state) so this stays a one-shot DOM effect
  // instead of triggering a second render just to clear itself.
  const focusedJobIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!focusJobId || focusedJobIdRef.current === focusJobId) return;
    const el = rowTriggers.current.get(focusJobId);
    if (el) {
      el.focus();
      el.scrollIntoView({ block: "nearest" });
      focusedJobIdRef.current = focusJobId;
    } else if (initialJobs.some((job) => job.id === focusJobId)) {
      // The saved job exists in the data but an active search/status filter
      // is hiding its row, so its trigger never mounted. Fall back to the
      // control that opened the editor rather than silently losing focus.
      closeFocusTarget.current?.focus();
      focusedJobIdRef.current = focusJobId;
    }
  }, [focusJobId, initialJobs]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold [font-family:var(--font-serif)]">Jobs</h1>
        {canWrite && (
          <Button ref={newJobButtonRef} size="sm" onClick={openNew}>
            New job
          </Button>
        )}
      </div>

      {successMessage && (
        <p
          role="status"
          className="mb-3 rounded-md bg-[var(--admin-success-soft)] px-3 py-2 text-sm text-[var(--admin-success)]"
        >
          {successMessage}
        </p>
      )}

      <JobsTable
        initialJobs={initialJobs}
        canWrite={canWrite}
        onEdit={openEdit}
        onNew={openNew}
        registerRowTrigger={registerRowTrigger}
      />

      <Dialog
        open={panel !== null}
        onOpenChange={(open, eventDetails) => {
          if (open) return;
          if (dirty) {
            eventDetails.cancel();
            setConfirmDiscard(true);
            return;
          }
          closeNow();
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="flex h-screen w-screen max-w-none flex-col p-0 sm:max-w-none md:max-w-none lg:h-[88vh] lg:w-[80vw] lg:max-w-[80vw]"
        >
          {panel && (
            <JobForm
              key={panel.mode === "new" ? "new" : panel.job.id}
              job={panel.mode === "edit" ? panel.job : undefined}
              templates={templates}
              title={panel.mode === "new" ? "New job" : `Edit ${panel.job.title}`}
              action={panel.mode === "new" ? createJob : updateJob.bind(null, panel.job.id)}
              onSuccess={handleSuccess}
              onClose={requestClose}
              onDirtyChange={setDirty}
            />
          )}

          {/* Nested inside the parent Dialog's Popup (Base UI's recommended
              pattern for a confirmation dialog that can interrupt a close),
              rather than a sibling, so Base UI's nested-dialog coordination
              (data-nested / backdrop suppression) applies correctly. */}
          <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
                <AlertDialogDescription>
                  You have unsaved changes to this job posting. Closing now will discard them.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep editing</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={closeNow}>
                  Discard changes
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </DialogContent>
      </Dialog>
    </div>
  );
}
