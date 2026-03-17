-- Fix 1: Backfill any auth users who are missing from public.users
-- This handles users who authenticated but whose trigger never fired
INSERT INTO public.users (user_id, email, name)
SELECT
  id,
  email,
  coalesce(
    raw_user_meta_data->>'full_name',
    raw_user_meta_data->>'name',
    split_part(email, '@', 1)
  )
FROM auth.users
WHERE
  split_part(email, '@', 2) IN ('micro1.ai', 'expert.micro1.ai')
  AND id NOT IN (SELECT user_id FROM public.users)
ON CONFLICT (user_id) DO NOTHING;

-- Fix 2: Update the trigger to also fire on UPDATE so returning users
-- whose public.users record is missing get it created on next sign-in.
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert or update on auth.users
  for each row
  execute procedure public.handle_new_auth_user();
