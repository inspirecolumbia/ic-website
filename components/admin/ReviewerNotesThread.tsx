"use client";

import { useEffect, useState, useTransition } from "react";
import { MoreVertical } from "lucide-react";
import {
  addApplicationReviewerNote,
  deleteApplicationReviewerNote,
  editApplicationReviewerNote,
} from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import RichNoteEditor from "@/components/admin/RichNoteEditor";
import { isReviewerNoteEmpty } from "@/lib/reviewer-notes";
import { formatDateTime } from "@/lib/history";

export type ReviewerNoteEntry = {
  id: string;
  note: string | null;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  authorClerkUserId: string;
  authorName: string;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function canEditNote(note: ReviewerNoteEntry, currentUserId: string | null): boolean {
  return !note.isDeleted && note.authorClerkUserId === currentUserId;
}

function canDeleteNote(
  note: ReviewerNoteEntry,
  currentUserId: string | null,
  currentUserRole: "staff" | "admin"
): boolean {
  if (note.isDeleted) return false;
  if (note.authorClerkUserId === currentUserId) return true;
  return currentUserRole === "admin";
}

function NoteAvatar({ name }: { name: string }) {
  return (
    <div
      aria-hidden="true"
      className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--admin-brand-soft)] text-xs font-medium text-[var(--admin-brand)]"
    >
      {initials(name)}
    </div>
  );
}

function NoteRow({
  note,
  applicationId,
  currentUserId,
  currentUserRole,
  onChanged,
}: {
  note: ReviewerNoteEntry;
  applicationId: string;
  currentUserId: string | null;
  currentUserRole: "staff" | "admin";
  onChanged: (message: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editHtml, setEditHtml] = useState(note.note ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const editable = canEditNote(note, currentUserId);
  const deletable = canDeleteNote(note, currentUserId, currentUserRole);
  const hasMenu = editable || deletable;

  // A refresh/tab-close mid-edit loses the in-progress edit -- warns for
  // that case. In-app client-side navigation isn't guarded (the App
  // Router has no equivalent to the old Pages Router's routeChangeStart
  // block without experimental APIs), so this covers the most common loss
  // scenario, not every possible one.
  useEffect(() => {
    if (!editing) return;
    function handler(e: BeforeUnloadEvent) {
      e.preventDefault();
    }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [editing]);

  function startEdit() {
    setEditHtml(note.note ?? "");
    setError(null);
    setEditing(true);
  }

  // Save changes is disabled below when editHtml matches the note's current
  // content, so this normally only fires on a real change -- but the
  // authoritative guard against a no-op edit showing as "(Edited)" is
  // server-side, in update_reviewer_note's own updated_at comparison (see
  // supabase/migrations/20260815120000_reviewer_note_edit_noop_no_bump.sql),
  // since the disabled state here is just a UX nicety a modified request
  // could bypass entirely.
  function saveEdit() {
    setError(null);
    startTransition(() => {
      editApplicationReviewerNote(note.id, applicationId, editHtml).then((result) => {
        if (result && "error" in result) {
          setError(result.error);
        } else {
          setEditing(false);
          onChanged("Note updated.");
        }
      });
    });
  }

  function confirmedDelete() {
    setError(null);
    startTransition(() => {
      deleteApplicationReviewerNote(note.id, applicationId).then((result) => {
        setConfirmDelete(false);
        if (result && "error" in result) {
          onChanged(`Couldn't delete the note: ${result.error}`);
        } else {
          onChanged("Note deleted.");
        }
      });
    });
  }

  if (note.isDeleted) {
    return (
      <li className="rounded-md border border-dashed border-[var(--admin-border)] px-3 py-2.5">
        <div className="flex items-center gap-2 text-xs text-[var(--admin-text-muted)]">
          <NoteAvatar name={note.authorName} />
          <span className="font-medium text-[var(--admin-text)]">{note.authorName}</span>
          <span>{formatDateTime(note.createdAt)}</span>
        </div>
        <p className="m-0 mt-1.5 text-sm italic text-[var(--admin-text-muted)]">
          This note was deleted.
        </p>
      </li>
    );
  }

  return (
    <li className="rounded-md border border-[var(--admin-border)] px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-[var(--admin-text-muted)]">
          <NoteAvatar name={note.authorName} />
          <span className="font-medium text-[var(--admin-text)]">{note.authorName}</span>
          <span>{formatDateTime(note.createdAt)}</span>
          {note.updatedAt !== note.createdAt && <span>(Edited)</span>}
        </div>
        {hasMenu && !editing && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  aria-label="Note actions"
                  className="flex size-6 shrink-0 items-center justify-center rounded-md text-[var(--admin-text-muted)] outline-none hover:bg-[var(--admin-surface-hover)] hover:text-[var(--admin-text)] focus-visible:ring-2 focus-visible:ring-[var(--admin-brand)]"
                >
                  <MoreVertical className="size-4" />
                </button>
              }
            />
            <DropdownMenuContent align="end">
              {editable && <DropdownMenuItem onClick={startEdit}>Edit</DropdownMenuItem>}
              {deletable && (
                <DropdownMenuItem variant="destructive" onClick={() => setConfirmDelete(true)}>
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {editing ? (
        <div className="mt-2 flex flex-col gap-2">
          <RichNoteEditor
            key={note.id}
            editorId={`edit-note-${note.id}`}
            initialHtml={note.note ?? ""}
            onChange={setEditHtml}
            autoFocus
            disabled={pending}
          />
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              disabled={pending || isReviewerNoteEmpty(editHtml) || editHtml === (note.note ?? "")}
              onClick={saveEdit}
            >
              {pending ? "Saving..." : "Save changes"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => {
                setEditing(false);
                setError(null);
              }}
            >
              Cancel
            </Button>
            {error && <p role="alert" className="text-xs text-[var(--admin-danger)]">{error}</p>}
          </div>
        </div>
      ) : (
        // Rendered from server-sanitized content only (see
        // addApplicationReviewerNote/editApplicationReviewerNote in
        // app/admin/actions.ts, which run every note through
        // sanitizeReviewerNoteHtml before it ever reaches the database) --
        // never from unsanitized user input at render time.
        <div
          className="mt-1.5 text-sm leading-relaxed text-[var(--admin-text)] [&_ul]:list-disc [&_ul]:pl-5"
          dangerouslySetInnerHTML={{ __html: note.note ?? "" }}
        />
      )}

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this note?</AlertDialogTitle>
            <AlertDialogDescription>
              This can&apos;t be undone. The note will be replaced with a placeholder showing when it was
              deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={pending} onClick={confirmedDelete}>
              {pending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}

export default function ReviewerNotesThread({
  applicationId,
  notes,
  currentUserId,
  currentUserRole,
}: {
  applicationId: string;
  notes: ReviewerNoteEntry[];
  currentUserId: string | null;
  currentUserRole: "staff" | "admin";
}) {
  const [newNoteHtml, setNewNoteHtml] = useState("");
  const [editorKey, setEditorKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!statusMessage) return;
    const timeout = setTimeout(() => setStatusMessage(null), 4000);
    return () => clearTimeout(timeout);
  }, [statusMessage]);

  function addNote() {
    setError(null);
    startTransition(() => {
      addApplicationReviewerNote(applicationId, newNoteHtml).then((result) => {
        if (result && "error" in result) {
          setError(result.error);
        } else {
          setNewNoteHtml("");
          setEditorKey((k) => k + 1);
          setStatusMessage("Note added.");
        }
      });
    });
  }

  return (
    <section aria-labelledby="reviewer-notes-heading">
      <h2 id="reviewer-notes-heading" className="mb-1 text-base font-medium text-[var(--admin-text)]">
        Reviewer notes
      </h2>
      <p className="mb-3 text-xs text-[var(--admin-text-muted)]">Visible only to authorized reviewers.</p>

      {statusMessage && (
        <p
          role="status"
          className="mb-3 rounded-md bg-[var(--admin-success-soft)] px-3 py-2 text-sm text-[var(--admin-success)]"
        >
          {statusMessage}
        </p>
      )}

      {notes.length === 0 ? (
        <p className="mb-3 text-sm text-[var(--admin-text-muted)]">No notes yet.</p>
      ) : (
        <ul className="m-0 mb-4 flex list-none flex-col gap-2 p-0">
          {notes.map((note) => (
            <NoteRow
              key={note.id}
              note={note}
              applicationId={applicationId}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
              onChanged={setStatusMessage}
            />
          ))}
        </ul>
      )}

      <RichNoteEditor
        key={editorKey}
        editorId="new-note-editor"
        initialHtml=""
        onChange={setNewNoteHtml}
        placeholder="Add a note..."
        disabled={pending}
      />
      <div className="mt-2 flex items-center gap-2">
        <Button type="button" size="sm" disabled={pending || isReviewerNoteEmpty(newNoteHtml)} onClick={addNote}>
          {pending ? "Adding..." : "Add note"}
        </Button>
        {error && <p role="alert" className="text-xs text-[var(--admin-danger)]">{error}</p>}
      </div>
    </section>
  );
}
