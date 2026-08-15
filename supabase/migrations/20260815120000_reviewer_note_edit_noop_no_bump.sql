-- update_reviewer_note previously bumped updated_at on every save, even
-- when the submitted content was byte-for-byte identical to what was
-- already stored (e.g. a reviewer opens Edit, changes nothing, hits Save
-- changes anyway). That showed the note as "(Edited)" in the UI despite
-- nothing having actually changed. Now updated_at only advances when the
-- new content genuinely differs from the current row.
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
  v_current_note text;
begin
  if v_role not in ('staff', 'admin') then
    raise exception 'not authorized';
  end if;

  select author_clerk_user_id, deleted_at, note into v_author, v_deleted_at, v_current_note
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

  update public.application_reviewer_notes
  set note = p_note,
      updated_at = case when v_current_note is distinct from p_note then clock_timestamp() else updated_at end
  where id = p_note_id;
end;
$$;
