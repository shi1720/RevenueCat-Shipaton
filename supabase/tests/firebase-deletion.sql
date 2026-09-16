-- Run after migrations on an isolated local PostgreSQL database, never production.
begin;
do $$
declare digest text := repeat('a', 64); token text := repeat('b', 64); allowed boolean;
begin
  for attempt in 1..5 loop
    select public.consume_firebase_deletion_attempt(digest) into allowed;
    if not allowed then raise exception 'Allowed attempts rejected'; end if;
  end loop;
  if public.consume_firebase_deletion_attempt(digest) then raise exception 'Sixth attempt allowed'; end if;
  update unpause_private.firebase_deletion_attempts set window_start = clock_timestamp() - interval '61 seconds' where subject_hash = digest;
  if not public.consume_firebase_deletion_attempt(digest) then raise exception 'Window did not reset'; end if;
  if public.has_firebase_deletion_receipt(token) then raise exception 'Unknown receipt accepted'; end if;
  perform public.prepare_firebase_deletion_receipt(token);
  if not public.has_firebase_deletion_receipt(token) then raise exception 'Receipt not saved'; end if;
  update unpause_private.firebase_deletion_receipts set expires_at = clock_timestamp() - interval '1 second' where token_hash = token;
  if public.has_firebase_deletion_receipt(token) then raise exception 'Expired receipt accepted'; end if;
  perform public.consume_firebase_deletion_attempt(digest);
  if exists (select 1 from unpause_private.firebase_deletion_receipts where token_hash = token) then raise exception 'Expired receipt not purged'; end if;
  if has_function_privilege('anon', 'public.prepare_firebase_deletion_receipt(text)', 'execute') or
     has_function_privilege('authenticated', 'public.prepare_firebase_deletion_receipt(text)', 'execute') or
     has_function_privilege('anon', 'public.has_firebase_deletion_receipt(text)', 'execute') or
     has_function_privilege('authenticated', 'public.consume_firebase_deletion_attempt(text)', 'execute') then
    raise exception 'Client role has access';
  end if;
  if not has_function_privilege('service_role', 'public.prepare_firebase_deletion_receipt(text)', 'execute') then raise exception 'Service cannot record'; end if;
  if has_schema_privilege('anon', 'unpause_private', 'usage') or has_schema_privilege('authenticated', 'unpause_private', 'usage') then raise exception 'Private schema exposed'; end if;
end;
$$;
rollback;
