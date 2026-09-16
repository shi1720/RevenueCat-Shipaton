-- Unpause v1 uses Supabase Auth only. Projects, photos, and backups stay on
-- the user's device; no application table or Storage bucket is provisioned.
-- Supabase manages auth.users and its permissions. Do not expose auth.users
-- through public views or grant anon/authenticated direct access to it.
-- No application tables means there are no application RLS policies to install.
-- Before adding cloud tables, use user_id REFERENCES auth.users ON DELETE CASCADE,
-- enable RLS, and enforce auth.uid() = user_id in BOTH USING and WITH CHECK.
select 1;
