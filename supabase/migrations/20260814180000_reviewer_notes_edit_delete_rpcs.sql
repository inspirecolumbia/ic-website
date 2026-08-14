-- Adds edit and soft-delete support to application_reviewer_notes, and
-- moves every reviewer-facing read/write through SECURITY DEFINER RPCs
-- instead of plain table grants + RLS. Two reasons:
--
-- 1. The permission matrix isn't expressible as row-level USING/WITH CHECK
--    clauses alone: staff can edit/delete their own note, admin can delete
--    (but never edit) someone else's note, and a soft-deleted note's
--    content must never come back from the normal read path. That last
--    part needs per-COLUMN redaction conditional on a per-ROW flag, which
--    RLS can't express (it grants/denies whole rows, not column content
--    within a visible row).
-- 2. Same trust boundary submit_application already establishes elsewhere
--    in this schema: a staff/admin session token could call the REST API
--    directly, bypassing the Next.js app entirely. Redaction and
--    authorization enforced only in app code wouldn't survive that.

alter table public.application_reviewer_notes
  add column updated_at timestamptz not null default now(),
  add column deleted_at timestamptz,
  add column deleted_by text;

-- Author-only, and only while the note isn't already soft-deleted. Admins
-- deliberately get no bypass here -- per spec, admin can delete another
-- reviewer's note but can never edit it.
create or replace function public.update_reviewer_note(p_note_id uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text := (select auth.jwt() ->> 'user_role');
  v_sub text := (select auth.jwt() ->> 'sub');
  v_author text;
  v_deleted_at timestamptz;
begin
  if v_role not in ('staff', 'admin') then
    raise exception 'not authorized';
  end if;

  select author_clerk_user_id, deleted_at into v_author, v_deleted_at
  from public.application_reviewer_notes
  where id = p_note_id;

  if v_author is null then
    raise exception 'note not found';
  end if;
  if v_deleted_at is not null then
    raise exception 'cannot edit a deleted note';
  end if;
  if v_author <> v_sub then
    raise exception 'cannot edit another reviewer''s note';
  end if;

  -- clock_timestamp(), not now() -- now() is frozen at transaction start,
  -- which would make an edit's updated_at collide with its note's original
  -- created_at when both happen inside the same transaction (as every
  -- RLS/e2e test here does). clock_timestamp() reflects the actual instant
  -- the statement executes, which is also the more correct meaning of
  -- "when was this edited" regardless of transaction boundaries.
  update public.application_reviewer_notes
  set note = p_note, updated_at = clock_timestamp()
  where id = p_note_id;
end;
$$;

revoke execute on function public.update_reviewer_note(uuid, text) from public, anon;
grant execute on function public.update_reviewer_note(uuid, text) to authenticated;

-- Author can delete their own note; admin can delete anyone's. Soft delete
-- only -- content stays in the row (for internal/DB-level recovery if ever
-- needed) but list_reviewer_notes below never returns it once deleted_at
-- is set.
create or replace function public.delete_reviewer_note(p_note_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text := (select auth.jwt() ->> 'user_role');
  v_sub text := (select auth.jwt() ->> 'sub');
  v_author text;
  v_deleted_at timestamptz;
begin
  if v_role not in ('staff', 'admin') then
    raise exception 'not authorized';
  end if;

  select author_clerk_user_id, deleted_at into v_author, v_deleted_at
  from public.application_reviewer_notes
  where id = p_note_id;

  if v_author is null then
    raise exception 'note not found';
  end if;
  if v_deleted_at is not null then
    raise exception 'note already deleted';
  end if;
  if v_author <> v_sub and v_role <> 'admin' then
    raise exception 'not authorized to delete this note';
  end if;

  update public.application_reviewer_notes
  set deleted_at = clock_timestamp(), deleted_by = v_sub
  where id = p_note_id;
end;
$$;

revoke execute on function public.delete_reviewer_note(uuid) from public, anon;
grant execute on function public.delete_reviewer_note(uuid) to authenticated;

-- The sole reviewer-facing read path (direct table SELECT is revoked from
-- authenticated below). Redacts note content for soft-deleted rows and
-- never returns deleted_by at all -- "who deleted this" must never reach
-- the reviewer UI, and excluding the column from the return signature
-- makes that structural instead of a rendering convention.
create or replace function public.list_reviewer_notes(p_application_id uuid)
returns table (
  id uuid,
  application_id uuid,
  author_clerk_user_id text,
  created_at timestamptz,
  updated_at timestamptz,
  note text,
  is_deleted boolean,
  deleted_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.jwt() ->> 'user_role') not in ('staff', 'admin') then
    raise exception 'not authorized';
  end if;

  return query
  select
    n.id,
    n.application_id,
    n.author_clerk_user_id,
    n.created_at,
    n.updated_at,
    case when n.deleted_at is null then n.note else null end,
    n.deleted_at is not null,
    n.deleted_at
  from public.application_reviewer_notes n
  where n.application_id = p_application_id
  order by n.created_at;
end;
$$;

revoke execute on function public.list_reviewer_notes(uuid) from public, anon;
grant execute on function public.list_reviewer_notes(uuid) to authenticated;

-- Insert still goes through the plain table grant + RLS from the prior
-- migration (unchanged, still author-identity-checked), only reads are
-- being locked down here. A direct `select` against this table now fails
-- for every role, including staff/admin -- list_reviewer_notes is the only
-- way in, so a deleted note's content can't be recovered by querying the
-- table directly with a valid staff/admin session, only with real database
-- access.
drop policy "staff and admin can read reviewer notes" on public.application_reviewer_notes;
revoke select on public.application_reviewer_notes from authenticated;
