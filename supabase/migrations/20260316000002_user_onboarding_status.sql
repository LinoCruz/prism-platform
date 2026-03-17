-- Add 'onboarding' as a valid user status and make it the default for new sign-ups.
-- Previously all new users defaulted to 'active'. Now they start as 'onboarding'
-- until an admin promotes them.

ALTER TABLE users DROP CONSTRAINT users_status_check;

ALTER TABLE users
  ADD CONSTRAINT users_status_check
  CHECK (status IN ('onboarding', 'active', 'suspended'));

ALTER TABLE users ALTER COLUMN status SET DEFAULT 'onboarding';
