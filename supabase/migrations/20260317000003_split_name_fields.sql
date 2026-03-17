-- ============================================================
-- Split name into first_name, last_name, and display_name
--
-- display_name  – filled from Google OAuth metadata on signup;
--                 or derived from first_name + last_name when
--                 the user manually updates their profile.
-- first_name    – nullable until the user fills in their profile.
-- last_name     – nullable.
-- ============================================================

-- 1. Add new columns
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS display_name varchar,
  ADD COLUMN IF NOT EXISTS first_name   varchar,
  ADD COLUMN IF NOT EXISTS last_name    varchar;

-- 2. Backfill display_name from existing name
UPDATE users SET display_name = name WHERE display_name IS NULL;

-- 3. Make display_name NOT NULL with a safe fallback
ALTER TABLE users
  ALTER COLUMN display_name SET NOT NULL,
  ALTER COLUMN display_name SET DEFAULT '';

-- 4. Drop the old name column
ALTER TABLE users DROP COLUMN IF EXISTS name;

-- 5. Update the auth trigger to use the new columns.
--    display_name is set from Google metadata (or email prefix).
--    first_name and last_name are left NULL — the user fills them in.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (user_id, email, display_name, last_login_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.last_sign_in_at
  )
  ON CONFLICT (user_id) DO UPDATE
    SET last_login_at = NEW.last_sign_in_at;
  RETURN NEW;
END;
$$;
