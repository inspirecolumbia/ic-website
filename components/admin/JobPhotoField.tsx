"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ImageUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import JobPhotoCropper from "@/components/admin/JobPhotoCropper";
import { validateJobPhotoSource } from "@/lib/imageValidation";
import { jobPhotoPublicUrl } from "@/lib/storage";

const ACCEPTED_TYPES = "image/jpeg,image/png,image/webp";

// Two file inputs by design: `pickerInputRef` is what the admin actually
// interacts with (drag/drop or click-to-choose) and only ever holds the raw,
// pre-crop source, used client-side to run it through validation and the
// cropper. It stays mounted regardless of which visual state is showing, so
// the "Replace" action (shown once a photo already exists) can still open
// it via ref. `submitInputRef` is a hidden input the form actually submits
// -- its `.files` only gets set, via the DataTransfer trick (a file input's
// FileList can't be assigned directly), once a crop has actually been
// applied. The raw source file itself is never what reaches the server.
export default function JobPhotoField({
  existingPhotoPath,
  onDirtyChange,
}: {
  existingPhotoPath: string | null;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const fieldId = useId();
  const errorId = `${fieldId}-error`;
  const pickerInputRef = useRef<HTMLInputElement>(null);
  const submitInputRef = useRef<HTMLInputElement>(null);

  const [rawFile, setRawFile] = useState<File | null>(null);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null);
  const [photoRemoved, setPhotoRemoved] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const pendingPreviewUrl = useMemo(
    () => (pendingPhotoFile ? URL.createObjectURL(pendingPhotoFile) : null),
    [pendingPhotoFile]
  );
  // Purely a cleanup effect (revoking the URL derived above), not one that
  // sets state -- avoids the extra render a state-syncing effect would add.
  useEffect(() => {
    return () => {
      if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
    };
  }, [pendingPreviewUrl]);

  const existingPhotoUrl = jobPhotoPublicUrl(existingPhotoPath);
  const previewUrl = photoRemoved ? null : (pendingPreviewUrl ?? existingPhotoUrl);
  const isNewLocalPhoto = Boolean(pendingPhotoFile);

  async function processFile(file: File) {
    setValidationError(null);
    setChecking(true);
    const result = await validateJobPhotoSource(file);
    setChecking(false);
    if (!result.ok) {
      setValidationError(result.message);
      return;
    }
    setRawFile(file);
    setCropperOpen(true);
  }

  function handlePickerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // lets the same filename be re-picked later (e.g. after Remove)
    if (file) void processFile(file);
  }

  function handleDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void processFile(file);
  }

  function handleCropped(file: File) {
    setPendingPhotoFile(file);
    setPhotoRemoved(false);
    setCropperOpen(false);
    const dt = new DataTransfer();
    dt.items.add(file);
    if (submitInputRef.current) submitInputRef.current.files = dt.files;
    onDirtyChange?.(true);
  }

  function handleRemove() {
    setPendingPhotoFile(null);
    setRawFile(null);
    setPhotoRemoved(true);
    if (submitInputRef.current) submitInputRef.current.value = "";
    onDirtyChange?.(true);
  }

  return (
    <div className="flex flex-col gap-1.5 lg:w-1/2 lg:pr-2">
      <Label htmlFor={fieldId}>Photo (optional)</Label>
      <input type="hidden" name="current_photo_path" value={existingPhotoPath ?? ""} readOnly />
      <input type="hidden" name="remove_photo" value={photoRemoved ? "true" : ""} readOnly />
      <input
        ref={submitInputRef}
        type="file"
        name="photo"
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
      />
      <input
        id={fieldId}
        ref={pickerInputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        className="sr-only"
        disabled={checking}
        // Only reachable via Tab in the empty (dropzone) state -- once a
        // photo exists, the "Replace" button is the keyboard-accessible
        // trigger for this same input, so leaving it in the tab order too
        // would land focus on a control with no visible focus indicator.
        tabIndex={previewUrl ? -1 : undefined}
        aria-describedby={validationError ? errorId : undefined}
        aria-invalid={validationError ? true : undefined}
        onChange={handlePickerChange}
      />

      {previewUrl ? (
        <div className="flex flex-col gap-2 rounded-md border border-[var(--admin-border)] p-3">
          {/* Admin-only preview of an uploaded or in-progress local file (blob:
              or a public Storage URL), not a page asset next/image would
              optimize meaningfully differently. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt=""
            className="aspect-4/3 w-full max-w-[280px] rounded-md border border-[var(--admin-border)] object-cover"
          />
          <p className="text-sm text-muted-foreground">
            {isNewLocalPhoto ? "New photo ready to save." : "A photo is attached to this posting."}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => pickerInputRef.current?.click()}>
              Replace
            </Button>
            {rawFile && (
              <Button type="button" variant="outline" size="sm" onClick={() => setCropperOpen(true)}>
                Edit crop
              </Button>
            )}
            <Button type="button" variant="ghost" size="sm" onClick={handleRemove}>
              <X aria-hidden="true" className="size-4" />
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <label
          htmlFor={fieldId}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          data-drag-active={dragActive || undefined}
          className="flex cursor-pointer flex-col items-center gap-2 rounded-md border border-dashed border-[var(--admin-border-strong)] bg-transparent px-4 py-8 text-center transition-colors hover:border-[var(--admin-brand)] hover:bg-[var(--admin-surface)] has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-[var(--admin-brand)]/25 data-[drag-active]:border-[var(--admin-brand)] data-[drag-active]:bg-[var(--admin-surface)]"
        >
          <ImageUp aria-hidden="true" className="size-6 text-[var(--admin-brand)]" />
          <span className="text-sm font-medium text-[var(--admin-text)]">
            {checking ? "Checking photo..." : "Upload a photo"}
          </span>
          <span className="text-xs text-muted-foreground">JPEG, PNG, or WebP, up to 10 MB</span>
        </label>
      )}

      {validationError && (
        <p id={errorId} role="alert" className="text-sm text-[var(--admin-danger)]">
          {validationError}
        </p>
      )}

      {cropperOpen && rawFile && (
        <JobPhotoCropper file={rawFile} onCancel={() => setCropperOpen(false)} onCropped={handleCropped} />
      )}
    </div>
  );
}
