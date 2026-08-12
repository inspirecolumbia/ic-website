// Single source of truth for the job-photo shape, used by the admin cropper
// (lib/imageCrop.ts, components/admin/JobPhotoCropper.tsx) and the public
// display (components/JobPosting.tsx), so the crop preview and the public
// page can never drift out of sync with each other.
export const JOB_PHOTO_ASPECT_RATIO = 4 / 3;
export const JOB_PHOTO_MAX_WIDTH = 1600;
export const JOB_PHOTO_MAX_HEIGHT = 1200;

export const JOB_PHOTO_SOURCE_MAX_BYTES = 10 * 1024 * 1024; // 10MB, pre-crop source
export const JOB_PHOTO_SOURCE_MAX_MEGAPIXELS = 50;
export const JOB_PHOTO_OUTPUT_TARGET_BYTES = 500 * 1024; // aim for under this
export const JOB_PHOTO_OUTPUT_QUALITY_START = 0.82;
export const JOB_PHOTO_OUTPUT_QUALITY_FLOOR = 0.5;
