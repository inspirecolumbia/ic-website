import { afterEach, describe, expect, it, vi } from "vitest";
import { validateJobPhotoSource } from "@/lib/imageValidation";

const JPEG_HEADER = [0xff, 0xd8, 0xff, 0, 0, 0, 0, 0, 0, 0, 0, 0];
const PNG_HEADER = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0];
const WEBP_HEADER = [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50];
const GARBAGE_HEADER = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

function fakeFile(header: number[], size: number, type = "application/octet-stream"): File {
  // File.size reflects the actual byte payload, so pad out to `size` rather
  // than trusting a `size` option the underlying Blob wouldn't honor.
  const bytes = new Uint8Array(size);
  bytes.set(header.slice(0, Math.min(header.length, size)));
  return new File([bytes], "photo", { type });
}

function stubCreateImageBitmap(impl: (...args: unknown[]) => unknown) {
  vi.stubGlobal("createImageBitmap", vi.fn(impl));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("validateJobPhotoSource", () => {
  it("rejects a file over the 10MB source cap before even reading its bytes", async () => {
    const file = fakeFile(JPEG_HEADER, 10 * 1024 * 1024 + 1);
    const result = await validateJobPhotoSource(file);
    expect(result).toEqual({ ok: false, message: "This image is larger than 10 MB." });
  });

  it("rejects a file whose bytes don't match any allowed image format, regardless of its stated type", async () => {
    const file = fakeFile(GARBAGE_HEADER, 1024, "image/jpeg");
    const result = await validateJobPhotoSource(file);
    expect(result).toEqual({ ok: false, message: "Choose a JPEG, PNG, or WebP image." });
  });

  it("accepts a JPEG signature and reports the decoded dimensions", async () => {
    stubCreateImageBitmap(async () => ({ width: 800, height: 600, close: vi.fn() }));
    const file = fakeFile(JPEG_HEADER, 1024);
    const result = await validateJobPhotoSource(file);
    expect(result).toEqual({ ok: true, width: 800, height: 600 });
  });

  it("accepts a PNG signature", async () => {
    stubCreateImageBitmap(async () => ({ width: 400, height: 300, close: vi.fn() }));
    const file = fakeFile(PNG_HEADER, 1024);
    const result = await validateJobPhotoSource(file);
    expect(result.ok).toBe(true);
  });

  it("accepts a WebP signature (RIFF....WEBP)", async () => {
    stubCreateImageBitmap(async () => ({ width: 400, height: 300, close: vi.fn() }));
    const file = fakeFile(WEBP_HEADER, 1024);
    const result = await validateJobPhotoSource(file);
    expect(result.ok).toBe(true);
  });

  it("rejects a decoded image over the 50-megapixel cap", async () => {
    stubCreateImageBitmap(async () => ({ width: 10000, height: 10000, close: vi.fn() }));
    const file = fakeFile(JPEG_HEADER, 1024);
    const result = await validateJobPhotoSource(file);
    expect(result).toEqual({ ok: false, message: "This image's resolution is too large." });
  });

  it("reports a friendly message when the file can't be decoded as an image at all", async () => {
    stubCreateImageBitmap(async () => {
      throw new Error("decode failed");
    });
    const file = fakeFile(JPEG_HEADER, 1024);
    const result = await validateJobPhotoSource(file);
    expect(result).toEqual({ ok: false, message: "We couldn't read this image. Try a different file." });
  });
});
