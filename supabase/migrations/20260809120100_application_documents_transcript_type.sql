-- The application form requires an unofficial transcript upload alongside
-- the resume, but the original document_type CHECK never anticipated it.

alter table public.application_documents
  drop constraint application_documents_document_type_check;

alter table public.application_documents
  add constraint application_documents_document_type_check
  check (document_type in ('resume', 'cover_letter', 'transcript', 'other'));
