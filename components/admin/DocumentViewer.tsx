"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getApplicationDocumentUrl } from "@/app/admin/actions";
import type { Database } from "@/lib/database.types";

type ApplicationDocument = Database["public"]["Tables"]["application_documents"]["Row"];

function documentLabel(documentType: string) {
  return documentType === "resume" ? "Resume" : documentType === "transcript" ? "Transcript" : documentType;
}

// Only one document is ever open at a time -- a single Dialog keyed off
// activeId, not one Dialog per document. The browser's own PDF viewer
// (rendered inside the iframe) already has download and print controls in
// its toolbar, so there's no separate download button here to keep in
// sync or accidentally duplicate.
export default function DocumentViewer({ documents }: { documents: ApplicationDocument[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const active = documents.find((d) => d.id === activeId) ?? null;

  function openDocument(doc: ApplicationDocument) {
    setActiveId(doc.id);
    setUrl(null);
    setError(null);
    setLoading(true);
    getApplicationDocumentUrl(doc.id, "preview").then((result) => {
      setLoading(false);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setUrl(result.url);
    });
  }

  function close() {
    setActiveId(null);
    setUrl(null);
    setError(null);
  }

  if (documents.length === 0) {
    return <p className="text-sm text-[var(--admin-text-muted)]">No documents on file.</p>;
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {documents.map((doc) => (
          <Button key={doc.id} type="button" variant="outline" size="sm" onClick={() => openDocument(doc)}>
            View {documentLabel(doc.document_type)}
          </Button>
        ))}
      </div>

      <Dialog
        open={activeId !== null}
        onOpenChange={(open) => {
          if (!open) close();
        }}
      >
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{active ? documentLabel(active.document_type) : "Document"}</DialogTitle>
          </DialogHeader>
          {loading && <p className="py-10 text-center text-sm text-[var(--admin-text-muted)]">Loading...</p>}
          {error && <p className="py-10 text-center text-sm text-[var(--admin-danger)]">{error}</p>}
          {url && !loading && !error && (
            <iframe
              src={url}
              title={active ? `${documentLabel(active.document_type)} preview` : "Document preview"}
              className="h-[75vh] w-full rounded-md border border-[var(--admin-border)]"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
