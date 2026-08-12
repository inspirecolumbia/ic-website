import { describe, expect, it } from "vitest";
import {
  buildJobPhotoStoragePath,
  jobPhotoPublicUrl,
  mapJobPhotoStorageError,
  mapStorageError,
} from "@/lib/storage";

describe("mapStorageError", () => {
  it("maps a size-related message to a friendly too-large error", () => {
    expect(mapStorageError("The object exceeded the maximum allowed size", "resume")).toBe(
      "Your resume is too large. Please upload a PDF under 5 MB."
    );
  });

  it("maps a mime-type message to a friendly wrong-type error", () => {
    expect(mapStorageError("mime type not supported", "transcript")).toBe(
      "Your transcript must be a PDF file."
    );
  });

  it("maps a duplicate-object message to a friendly retry error", () => {
    expect(mapStorageError("The resource already exists", "resume")).toBe(
      "Something went wrong uploading your resume. Please try again."
    );
  });

  it("falls back to a generic network/connection error for anything else", () => {
    expect(mapStorageError("unexpected failure", "transcript")).toBe(
      "We couldn't upload your transcript. Please check your connection and try again."
    );
  });
});

describe("mapJobPhotoStorageError", () => {
  it("maps a size-related message to a friendly too-large error", () => {
    expect(mapJobPhotoStorageError("The object exceeded the maximum allowed size")).toBe(
      "That photo is too large. Please try a different one."
    );
  });

  it("maps a mime-type message to a friendly wrong-type error", () => {
    expect(mapJobPhotoStorageError("mime type not supported")).toBe(
      "Job photos must be a JPEG, PNG, or WebP image."
    );
  });

  it("falls back to a generic network/connection error for anything else", () => {
    expect(mapJobPhotoStorageError("unexpected failure")).toBe(
      "We couldn't upload that photo. Please check your connection and try again."
    );
  });
});

describe("buildJobPhotoStoragePath", () => {
  it("scopes the path under jobs/{jobId} and always outputs .webp", () => {
    const path = buildJobPhotoStoragePath("job-123");
    expect(path).toMatch(/^jobs\/job-123\/[0-9a-f-]+\.webp$/);
  });

  it("generates a fresh path on every call, never overwriting a previous one", () => {
    const first = buildJobPhotoStoragePath("job-123");
    const second = buildJobPhotoStoragePath("job-123");
    expect(first).not.toBe(second);
  });
});

describe("jobPhotoPublicUrl", () => {
  it("returns null when there's no photo path", () => {
    expect(jobPhotoPublicUrl(null)).toBeNull();
  });

  it("builds a public Storage URL for a given path", () => {
    const url = jobPhotoPublicUrl("jobs/job-123/abc.webp");
    expect(url).toContain("/storage/v1/object/public/job-photos/jobs/job-123/abc.webp");
  });
});
