import { describe, expect, it } from "vitest";
import { mapStorageError } from "@/lib/storage";

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
