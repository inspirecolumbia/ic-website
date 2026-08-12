import {
  JOB_PHOTO_SOURCE_MAX_BYTES,
  JOB_PHOTO_SOURCE_MAX_MEGAPIXELS,
} from "./jobPhoto";

export type ImageValidationResult =
  | { ok: true; width: number; height: number }
  | { ok: false; message: string };

const SIGNATURES: { format: string; bytes: (number | null)[] }[] = [
  { format: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { format: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
];

// Sniffs the actual file bytes rather than trusting the filename extension
// or the browser-reported MIME type, both of which are just labels a
// renamed or spoofed file can carry regardless of real content.
async function sniffImageFormat(file: File): Promise<string | null> {
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());

  for (const sig of SIGNATURES) {
    if (sig.bytes.every((byte, i) => byte === null || head[i] === byte)) {
      return sig.format;
    }
  }

  // WebP: "RIFF" (4 bytes) + 4-byte size + "WEBP" (4 bytes), no fixed magic
  // number covering the whole header the way JPEG/PNG have.
  const isRiff = head[0] === 0x52 && head[1] === 0x49 && head[2] === 0x46 && head[3] === 0x46;
  const isWebp = head[8] === 0x57 && head[9] === 0x45 && head[10] === 0x42 && head[11] === 0x50;
  if (isRiff && isWebp) return "image/webp";

  return null;
}

// Runs before the cropper ever opens -- catches oversized files, disguised
// non-images, and decode-bomb-sized images (huge pixel dimensions in a
// small file) up front, with a message specific enough for the admin to
// know what to do differently.
export async function validateJobPhotoSource(file: File): Promise<ImageValidationResult> {
  if (file.size > JOB_PHOTO_SOURCE_MAX_BYTES) {
    return { ok: false, message: "This image is larger than 10 MB." };
  }

  const sniffed = await sniffImageFormat(file);
  if (!sniffed) {
    return { ok: false, message: "Choose a JPEG, PNG, or WebP image." };
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return { ok: false, message: "We couldn't read this image. Try a different file." };
  }

  const { width, height } = bitmap;
  bitmap.close();

  const megapixels = (width * height) / 1_000_000;
  if (megapixels > JOB_PHOTO_SOURCE_MAX_MEGAPIXELS) {
    return { ok: false, message: "This image's resolution is too large." };
  }

  return { ok: true, width, height };
}
