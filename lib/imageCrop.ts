// Canvas-based crop + resize, browser-only (relies on createImageBitmap and
// canvas), called from the admin cropper after react-easy-crop reports which
// pixel region was selected.
import {
  JOB_PHOTO_ASPECT_RATIO,
  JOB_PHOTO_MAX_WIDTH,
  JOB_PHOTO_OUTPUT_QUALITY_FLOOR,
  JOB_PHOTO_OUTPUT_QUALITY_START,
  JOB_PHOTO_OUTPUT_TARGET_BYTES,
} from "./jobPhoto";

export type PixelCrop = { x: number; y: number; width: number; height: number };

// imageOrientation: "from-image" applies the source photo's EXIF rotation
// the same way the browser already renders it in the live <img>-based crop
// preview, so react-easy-crop's croppedAreaPixels (reported in that same
// oriented pixel space) line up directly with this decode -- no separate
// rotation bookkeeping needed here.
async function decodeOriented(file: File): Promise<ImageBitmap> {
  return createImageBitmap(file, { imageOrientation: "from-image" });
}

function canvasToWebpBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/webp", quality));
}

// Never upscales past the crop's own resolution (output width is capped at
// the crop's pixel width, not forced up to it), caps at JOB_PHOTO_MAX_WIDTH
// (always 4:3 -- the cropper's `aspect` prop already constrains pixelCrop to
// that ratio), and steps quality down until the output is under the target
// size or the quality floor is hit, whichever comes first. Re-encoding from
// canvas pixels also strips all original metadata (EXIF, color profiles,
// etc.) for free -- there's nothing to carry over since the canvas only ever
// held raw pixel data.
export async function cropAndResizeImage(file: File, pixelCrop: PixelCrop): Promise<Blob> {
  const bitmap = await decodeOriented(file);
  try {
    const outputWidth = Math.min(Math.round(pixelCrop.width), JOB_PHOTO_MAX_WIDTH);
    const outputHeight = Math.round(outputWidth / JOB_PHOTO_ASPECT_RATIO);

    const canvas = document.createElement("canvas");
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas isn't supported in this browser.");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    ctx.drawImage(
      bitmap,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      outputWidth,
      outputHeight
    );

    let quality = JOB_PHOTO_OUTPUT_QUALITY_START;
    let blob = await canvasToWebpBlob(canvas, quality);
    while (
      blob &&
      blob.size > JOB_PHOTO_OUTPUT_TARGET_BYTES &&
      quality > JOB_PHOTO_OUTPUT_QUALITY_FLOOR
    ) {
      quality = Math.max(JOB_PHOTO_OUTPUT_QUALITY_FLOOR, quality - 0.1);
      blob = await canvasToWebpBlob(canvas, quality);
    }

    if (!blob) throw new Error("Couldn't export the cropped image.");
    return blob;
  } finally {
    bitmap.close();
  }
}
