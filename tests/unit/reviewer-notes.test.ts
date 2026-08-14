import { describe, expect, it } from "vitest";
import { isReviewerNoteEmpty, sanitizeReviewerNoteHtml } from "@/lib/reviewer-notes";

describe("sanitizeReviewerNoteHtml", () => {
  it("preserves the allowed formatting tags", () => {
    const html = "<p><b>bold</b> <i>italic</i> <u>underline</u></p><ul><li>item</li></ul>";
    expect(sanitizeReviewerNoteHtml(html)).toBe(html);
  });

  it("strips script tags and their content entirely", () => {
    const html = '<p>hello</p><script>alert("xss")</script>';
    const result = sanitizeReviewerNoteHtml(html);
    expect(result).not.toContain("script");
    expect(result).not.toContain("alert");
    expect(result).toContain("hello");
  });

  it("strips event handler and style attributes even on allowed tags", () => {
    const html = '<p onclick="alert(1)" style="color:red">text</p>';
    const result = sanitizeReviewerNoteHtml(html);
    expect(result).not.toContain("onclick");
    expect(result).not.toContain("style");
    expect(result).not.toContain("color:red");
    expect(result).toContain("text");
  });

  it("strips images and links, which aren't in the allowlist", () => {
    const html = '<p>see <a href="https://evil.example">this</a></p><img src="x.png" onerror="alert(1)">';
    const result = sanitizeReviewerNoteHtml(html);
    expect(result).not.toContain("<a");
    expect(result).not.toContain("<img");
    expect(result).not.toContain("evil.example");
  });

  it("strips headings and font-size/color styling, which aren't in the allowlist", () => {
    const html = '<h1>Big</h1><font size="7" color="red">colored</font>';
    const result = sanitizeReviewerNoteHtml(html);
    expect(result).not.toContain("<h1");
    expect(result).not.toContain("<font");
  });

  it("preserves div and br for line breaks", () => {
    const html = "<div>line one</div><div>line two</div><p>a<br>b</p>";
    // sanitize-html normalizes void elements to self-closing form.
    expect(sanitizeReviewerNoteHtml(html)).toBe("<div>line one</div><div>line two</div><p>a<br />b</p>");
  });
});

describe("isReviewerNoteEmpty", () => {
  it("treats an empty string as empty", () => {
    expect(isReviewerNoteEmpty("")).toBe(true);
  });

  it("treats contentEditable's empty markup as empty", () => {
    expect(isReviewerNoteEmpty("<p><br></p>")).toBe(true);
  });

  it("treats whitespace-only content as empty", () => {
    expect(isReviewerNoteEmpty("<p>   </p><div>&nbsp;</div>")).toBe(true);
  });

  it("treats real text content as non-empty", () => {
    expect(isReviewerNoteEmpty("<p>Looks good</p>")).toBe(false);
  });

  it("treats a bulleted list with content as non-empty", () => {
    expect(isReviewerNoteEmpty("<ul><li>item</li></ul>")).toBe(false);
  });
});
