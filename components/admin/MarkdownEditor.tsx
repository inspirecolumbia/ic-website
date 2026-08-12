"use client";

import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import { Bold, Italic, Link as LinkIcon, Heading2, List } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

// Deliberately its own (smaller, admin-chrome-colored) style set rather than
// reusing components/JobPosting.tsx's markdownComponents -- that one is
// tuned for the large public page, this is a compact inline preview.
const previewComponents: Components = {
  h1: ({ children }) => (
    <h2 className="mb-2 mt-4 text-base font-semibold text-[var(--admin-text)] first:mt-0">{children}</h2>
  ),
  h2: ({ children }) => (
    <h2 className="mb-2 mt-4 text-base font-semibold text-[var(--admin-text)] first:mt-0">{children}</h2>
  ),
  p: ({ children }) => <p className="mb-3 text-sm text-[var(--admin-text)]">{children}</p>,
  ul: ({ children }) => (
    <ul className="mb-3 list-disc space-y-1 pl-5 text-sm text-[var(--admin-text)]">{children}</ul>
  ),
  li: ({ children }) => <li>{children}</li>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em>{children}</em>,
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-[var(--admin-brand)] underline">
      {children}
    </a>
  ),
};

function ToolbarButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      // Keeps focus (and thus selectionStart/selectionEnd) on the textarea
      // instead of the button, so the toolbar action still knows what text
      // was selected when it was clicked.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="flex size-8 items-center justify-center rounded-md text-[var(--admin-text-muted)] outline-none hover:bg-[var(--admin-surface-hover)] hover:text-[var(--admin-text)] focus-visible:ring-2 focus-visible:ring-[var(--admin-brand)]"
    >
      {children}
    </button>
  );
}

export default function MarkdownEditor({
  id,
  name,
  required,
  defaultValue,
  placeholder,
  rows = 12,
}: {
  id: string;
  name: string;
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
  rows?: number;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function setSelectionLater(start: number, end: number) {
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(start, end);
    });
  }

  function applyWrap(before: string, after: string, placeholderText: string) {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end) || placeholderText;
    const next = value.slice(0, start) + before + selected + after + value.slice(end);
    setValue(next);
    const selStart = start + before.length;
    setSelectionLater(selStart, selStart + selected.length);
  }

  // Applies a line-start prefix (heading/bullet) to every line touched by
  // the current selection, skipping lines that already have it -- so
  // clicking "Bullet" twice on the same line doesn't stack "- - text".
  function applyLinePrefix(prefix: string) {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    let lineEnd = value.indexOf("\n", end);
    if (lineEnd === -1) lineEnd = value.length;
    const block = value.slice(lineStart, lineEnd);
    const nextBlock = block
      .split("\n")
      .map((line) => (line.startsWith(prefix) ? line : prefix + line))
      .join("\n");
    const next = value.slice(0, lineStart) + nextBlock + value.slice(lineEnd);
    setValue(next);
    setSelectionLater(lineStart, lineStart + nextBlock.length);
  }

  function handleToolbar(action: "bold" | "italic" | "link" | "heading" | "bullet") {
    switch (action) {
      case "bold":
        applyWrap("**", "**", "bold text");
        break;
      case "italic":
        applyWrap("*", "*", "italic text");
        break;
      case "link":
        applyWrap("[", "](https://)", "link text");
        break;
      case "heading":
        applyLinePrefix("## ");
        break;
      case "bullet":
        applyLinePrefix("- ");
        break;
    }
  }

  // Native textareas don't continue a Markdown list on Enter the way an
  // editor like Notion or GitHub's comment box does -- without this, every
  // bullet has to be retyped by hand. An empty bullet line exits the list
  // instead of continuing it forever, matching those editors' convention.
  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== "Enter" || e.shiftKey) return;
    const el = e.currentTarget;
    const cursor = el.selectionStart;
    if (cursor !== el.selectionEnd) return;
    const lineStart = value.lastIndexOf("\n", cursor - 1) + 1;
    const line = value.slice(lineStart, cursor);
    const match = line.match(/^(\s*)([-*])\s+(.*)$/);
    if (!match) return;
    const [, indent, marker, content] = match;
    e.preventDefault();

    if (content.trim() === "") {
      const next = value.slice(0, lineStart) + value.slice(cursor);
      setValue(next);
      setSelectionLater(lineStart, lineStart);
      return;
    }

    const insertion = `\n${indent}${marker} `;
    const next = value.slice(0, cursor) + insertion + value.slice(cursor);
    setValue(next);
    const pos = cursor + insertion.length;
    setSelectionLater(pos, pos);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1 rounded-md border border-[var(--admin-border-strong)] bg-[var(--admin-surface)] p-1">
        <ToolbarButton label="Bold" onClick={() => handleToolbar("bold")}>
          <Bold className="size-4" />
        </ToolbarButton>
        <ToolbarButton label="Italic" onClick={() => handleToolbar("italic")}>
          <Italic className="size-4" />
        </ToolbarButton>
        <ToolbarButton label="Heading" onClick={() => handleToolbar("heading")}>
          <Heading2 className="size-4" />
        </ToolbarButton>
        <ToolbarButton label="Bullet list" onClick={() => handleToolbar("bullet")}>
          <List className="size-4" />
        </ToolbarButton>
        <ToolbarButton label="Link" onClick={() => handleToolbar("link")}>
          <LinkIcon className="size-4" />
        </ToolbarButton>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Textarea
          ref={textareaRef}
          id={id}
          name={name}
          required={required}
          rows={rows}
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div className="rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface)] p-3 lg:max-h-[320px] lg:overflow-y-auto">
          {value.trim() ? (
            <ReactMarkdown components={previewComponents}>{value}</ReactMarkdown>
          ) : (
            <p className="text-sm text-[var(--admin-text-muted)]">Preview will appear here as you type.</p>
          )}
        </div>
      </div>
    </div>
  );
}
