"use client";

import { useEffect, useRef } from "react";
import { Bold, Italic, List, Underline } from "lucide-react";
import { Button } from "@/components/ui/button";

// Uncontrolled by design: contentEditable fights React's controlled-value
// model (every re-render would reset the cursor position mid-typing), so
// the initial HTML is set once via dangerouslySetInnerHTML and never
// updated from the value prop again. Callers that need a fresh editor for
// different content (e.g. switching which note is being edited) should
// remount with a `key` prop rather than relying on the value prop to update
// an existing instance.
export default function RichNoteEditor({
  initialHtml = "",
  onChange,
  placeholder = "Add a note...",
  autoFocus = false,
  disabled = false,
  editorId,
}: {
  initialHtml?: string;
  onChange: (html: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  editorId?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
    // Only on mount -- see the uncontrolled-by-design note above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function exec(command: "bold" | "italic" | "underline" | "insertUnorderedList") {
    ref.current?.focus();
    document.execCommand(command);
    onChange(ref.current?.innerHTML ?? "");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    const mod = e.ctrlKey || e.metaKey;
    if (!mod) return;
    if (e.key === "b" || e.key === "B") {
      e.preventDefault();
      exec("bold");
    } else if (e.key === "i" || e.key === "I") {
      e.preventDefault();
      exec("italic");
    } else if (e.key === "u" || e.key === "U") {
      e.preventDefault();
      exec("underline");
    }
  }

  return (
    <div className="rounded-md border border-[var(--admin-border-strong)] focus-within:border-[var(--admin-brand)] focus-within:ring-3 focus-within:ring-[var(--admin-brand)]/25">
      <div
        role="toolbar"
        aria-label="Formatting"
        aria-controls={editorId}
        className="flex items-center gap-1 border-b border-[var(--admin-border)] p-1"
      >
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="Bold"
          disabled={disabled}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec("bold")}
        >
          <Bold className="size-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="Italic"
          disabled={disabled}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec("italic")}
        >
          <Italic className="size-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="Underline"
          disabled={disabled}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec("underline")}
        >
          <Underline className="size-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="Bulleted list"
          disabled={disabled}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec("insertUnorderedList")}
        >
          <List className="size-3.5" />
        </Button>
      </div>
      <div
        id={editorId}
        ref={ref}
        contentEditable={!disabled}
        role="textbox"
        aria-multiline="true"
        aria-label={placeholder}
        data-placeholder={placeholder}
        onInput={() => onChange(ref.current?.innerHTML ?? "")}
        onKeyDown={handleKeyDown}
        dangerouslySetInnerHTML={{ __html: initialHtml }}
        className="min-h-[4.5rem] px-2.5 py-2 text-sm text-[var(--admin-text)] outline-none empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)] [&_ul]:list-disc [&_ul]:pl-5"
      />
    </div>
  );
}
