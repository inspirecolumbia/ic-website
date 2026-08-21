-- Replaces the application_status enum with the pipeline staff actually
-- uses: submitted, still_in_consideration, round_1, round_2, offer, rejected.
-- Drops under_review/interviewing/hired/withdrawn. Existing rows (prod has
-- only 'submitted'; dev has a handful of test rows across the other old
-- values) are remapped by best-fit rather than left orphaned:
--   under_review  -> still_in_consideration
--   interviewing  -> round_1
--   hired         -> offer   (no post-offer state in the new pipeline)
--   withdrawn     -> rejected (no equivalent state in the new pipeline)
-- Postgres can't add/remove enum values transactionally in one ALTER TYPE,
-- so this builds a new type, remaps both columns that use it (applications
-- .status and application_status_history.old_status/new_status), then swaps
-- the type in under the same name so no other migration or the generated
-- TS types need to know the type was ever recreated.

create type public.application_status_new as enum (
  'submitted', 'still_in_consideration', 'round_1', 'round_2', 'offer', 'rejected'
);

alter table public.applications alter column status drop default;

alter table public.applications
  alter column status type public.application_status_new
  using (
    case status::text
      when 'submitted' then 'submitted'
      when 'under_review' then 'still_in_consideration'
      when 'interviewing' then 'round_1'
      when 'offer' then 'offer'
      when 'hired' then 'offer'
      when 'rejected' then 'rejected'
      when 'withdrawn' then 'rejected'
    end
  )::public.application_status_new;

alter table public.applications
  alter column status set default 'submitted'::public.application_status_new;

alter table public.application_status_history
  alter column old_status type public.application_status_new
  using (
    case old_status::text
      when 'submitted' then 'submitted'
      when 'under_review' then 'still_in_consideration'
      when 'interviewing' then 'round_1'
      when 'offer' then 'offer'
      when 'hired' then 'offer'
      when 'rejected' then 'rejected'
      when 'withdrawn' then 'rejected'
      else null
    end
  )::public.application_status_new;

alter table public.application_status_history
  alter column new_status type public.application_status_new
  using (
    case new_status::text
      when 'submitted' then 'submitted'
      when 'under_review' then 'still_in_consideration'
      when 'interviewing' then 'round_1'
      when 'offer' then 'offer'
      when 'hired' then 'offer'
      when 'rejected' then 'rejected'
      when 'withdrawn' then 'rejected'
    end
  )::public.application_status_new;

drop type public.application_status;
alter type public.application_status_new rename to application_status;
