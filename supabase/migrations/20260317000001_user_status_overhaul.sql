-- ============================================================
-- User Status Overhaul
--
-- 1. Adds last_login_at column to users
-- 2. Expands status values to cover the full trainee lifecycle
--    onboarding → pending_entry_quiz → training → active
--    Overrides: inactive (computed, not stored) | disabled (admin-set, blocks access)
-- 3. Migrates legacy 'suspended' → 'disabled'
-- 4. Updates handle_new_auth_user trigger to sync last_login_at on sign-in
-- ============================================================

-- 1. Add last_login_at
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at timestamptz;

-- 2. Update status constraint: replace suspended with disabled, add lifecycle statuses
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check;

-- Migrate any existing 'suspended' rows to 'disabled'
UPDATE users SET status = 'disabled' WHERE status = 'suspended';

ALTER TABLE users
  ADD CONSTRAINT users_status_check
  CHECK (status IN ('onboarding', 'pending_entry_quiz', 'training', 'active', 'disabled'));

-- 3. Update handle_new_auth_user to also track last_login_at on sign-in.
--    The trigger already fires on INSERT (new signup) and UPDATE (sign-in).
--    ON CONFLICT DO UPDATE handles returning users: update last_login_at each time.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (user_id, email, name, last_login_at)
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
