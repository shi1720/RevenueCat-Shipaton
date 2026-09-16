-- No raw UID, email, token or project data. Expiring SHA-256 hashes only.
create schema if not exists unpause_private;
revoke all on schema unpause_private from public, anon, authenticated;
create table if not exists unpause_private.firebase_deletion_attempts (
  subject_hash text primary key check (subject_hash ~ '^[a-f0-9]{64}$'),
  window_start timestamptz not null,
  attempts integer not null
);
create table if not exists unpause_private.firebase_deletion_receipts (
  token_hash text primary key check (token_hash ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz not null
);
alter table unpause_private.firebase_deletion_attempts enable row level security;
alter table unpause_private.firebase_deletion_receipts enable row level security;

create or replace function public.consume_firebase_deletion_attempt(subject_hash text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare count_now integer;
begin
  if subject_hash !~ '^[a-f0-9]{64}$' then raise exception 'Invalid digest'; end if;
  delete from unpause_private.firebase_deletion_attempts where window_start < clock_timestamp() - interval '10 minutes';
  delete from unpause_private.firebase_deletion_receipts where expires_at < clock_timestamp();
  insert into unpause_private.firebase_deletion_attempts as a values (subject_hash, clock_timestamp(), 1)
  on conflict on constraint firebase_deletion_attempts_pkey do update set
    attempts = case when a.window_start < clock_timestamp() - interval '1 minute' then 1 else a.attempts + 1 end,
    window_start = case when a.window_start < clock_timestamp() - interval '1 minute' then clock_timestamp() else a.window_start end
  returning attempts into count_now;
  return count_now <= 5;
end;
$$;
create or replace function public.has_firebase_deletion_receipt(token_hash text)
returns boolean language sql security definer set search_path = '' as $$
  select exists (select 1 from unpause_private.firebase_deletion_receipts r
    where r.token_hash = $1 and r.expires_at > clock_timestamp());
$$;
create or replace function public.prepare_firebase_deletion_receipt(token_hash text)
returns void language sql security definer set search_path = '' as $$
  insert into unpause_private.firebase_deletion_receipts values ($1, clock_timestamp() + interval '5 minutes')
  on conflict on constraint firebase_deletion_receipts_pkey do update set expires_at = excluded.expires_at;
$$;
revoke all on function public.consume_firebase_deletion_attempt(text) from public, anon, authenticated;
revoke all on function public.has_firebase_deletion_receipt(text) from public, anon, authenticated;
revoke all on function public.prepare_firebase_deletion_receipt(text) from public, anon, authenticated;
grant execute on function public.consume_firebase_deletion_attempt(text) to service_role;
grant execute on function public.has_firebase_deletion_receipt(text) to service_role;
grant execute on function public.prepare_firebase_deletion_receipt(text) to service_role;
