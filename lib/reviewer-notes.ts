import sanitizeHtml from "sanitize-html";

// Deliberately narrow: only what the reviewer-note editor's toolbar can
// produce (bold, italic, underline, bulleted lists) plus the structural
// tags a browser's contentEditable naturally emits for line breaks (div,
// br, p). No attributes at all, so no href/src/style/class/on* survives --
// this is the actual trust boundary, not the client-side editor, since a
// modified request can send arbitrary HTML directly to the server action.
const ALLOWED_TAGS = ["b", "strong", "i", "em", "u", "ul", "li", "br", "p", "div"];

export function sanitizeReviewerNoteHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {},
    // Disallowed tags (script, style, img, a, ...) are stripped along with
    // their content, not just unwrapped -- unwrapping would leave a script
    // tag's text node behind as visible garbage, and there's no legitimate
    // reason a reviewer note needs an image or a link right now.
    disallowedTagsMode: "discard",
  });
}

// Strips all markup down to plain text to check for real content --
// contentEditable's "empty" state is often `<p><br></p>` or similar, which
// isn't empty as a string but has no visible content.
export function isReviewerNoteEmpty(html: string): boolean {
  const text = sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
    .replace(/&nbsp;/g, " ")
    .trim();
  return text.length === 0;
}
