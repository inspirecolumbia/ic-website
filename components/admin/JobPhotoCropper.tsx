"use client";

import { useCallback, useEffect, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { cropAndResizeImage } from "@/lib/imageCrop";
import { JOB_PHOTO_ASPECT_RATIO } from "@/lib/jobPhoto";

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const KEYBOARD_NUDGE_PX = 10;
const DEFAULT_CROP = { x: 0, y: 0 };

export default function JobPhotoCropper({
  file,
  onCancel,
  onCropped,
}: {
  file: File;
  onCancel: () => void;
  onCropped: (file: File) => void;
}) {
  // Creation and revocation live in the same effect on purpose -- splitting
  // them (e.g. useMemo to create + a separate effect to revoke) breaks under
  // React Strict Mode's dev-only double-invoke: the cleanup from the first
  // simulated mount revokes the URL, but nothing re-creates it before the
  // second real mount reuses the same (now-dead) memoized value, so the
  // image never renders. Pairing them here means the second invoke creates
  // its own fresh URL instead of inheriting a revoked one.
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const [crop, setCrop] = useState(DEFAULT_CROP);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  function handleReset() {
    setCrop(DEFAULT_CROP);
    setZoom(MIN_ZOOM);
  }

  // react-easy-crop's own drag/pinch interactions cover mouse and touch;
  // this adds a keyboard-operable equivalent for repositioning, since drag
  // alone isn't keyboard accessible. Nudges use the same pixel-offset units
  // the library itself uses for `crop`, so this composes with dragging
  // rather than fighting it.
  function handleKeyDown(e: React.KeyboardEvent) {
    const deltas: Record<string, [number, number]> = {
      ArrowLeft: [KEYBOARD_NUDGE_PX, 0],
      ArrowRight: [-KEYBOARD_NUDGE_PX, 0],
      ArrowUp: [0, KEYBOARD_NUDGE_PX],
      ArrowDown: [0, -KEYBOARD_NUDGE_PX],
    };
    const delta = deltas[e.key];
    if (!delta) return;
    e.preventDefault();
    setCrop((c) => ({ x: c.x + delta[0], y: c.y + delta[1] }));
  }

  async function handleApplyCrop() {
    if (!croppedAreaPixels) return;
    setWorking(true);
    setError(null);
    try {
      const blob = await cropAndResizeImage(file, croppedAreaPixels);
      onCropped(new File([blob], "photo.webp", { type: "image/webp" }));
    } catch {
      setError("Couldn't process that photo. Please try again or pick a different file.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Position the photo</DialogTitle>
        </DialogHeader>

        <div
          role="group"
          aria-label="Photo crop area. Drag to reposition, or use arrow keys."
          tabIndex={0}
          onKeyDown={handleKeyDown}
          className="relative h-[320px] w-full overflow-hidden rounded-md bg-[var(--admin-border)] outline-none focus-visible:ring-3 focus-visible:ring-[var(--admin-brand)]/50"
        >
          {imageUrl && (
            <Cropper
              image={imageUrl}
              crop={crop}
              zoom={zoom}
              aspect={JOB_PHOTO_ASPECT_RATIO}
              minZoom={MIN_ZOOM}
              maxZoom={MAX_ZOOM}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={handleCropComplete}
            />
          )}
        </div>

        <div className="flex items-center gap-3">
          <label htmlFor="photo-zoom" className="shrink-0 text-sm text-muted-foreground">
            Zoom
          </label>
          <Slider
            id="photo-zoom"
            value={[zoom]}
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.01}
            onValueChange={(value) => setZoom(Array.isArray(value) ? value[0] : value)}
            aria-label="Zoom"
          />
          <Button type="button" variant="ghost" size="sm" onClick={handleReset}>
            Reset
          </Button>
        </div>

        {error && (
          <p role="alert" className="text-sm text-[var(--admin-danger)]">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={working}>
            Cancel
          </Button>
          <Button type="button" onClick={handleApplyCrop} disabled={!croppedAreaPixels || working}>
            {working ? "Applying..." : "Apply crop"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
