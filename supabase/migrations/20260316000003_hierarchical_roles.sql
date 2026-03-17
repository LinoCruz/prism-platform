-- Migrate from many-to-many user_roles join table to a single role column
-- on users with hierarchical RBAC.
--
-- Role privilege order (lowest → highest):
--   trainee(1) < trainer(2) < reviewer(3) < auditor(4) < admin(5)
--
-- Because PostgreSQL enum comparison uses declaration order, we can use
-- role >= 'trainer' to mean "trainer or higher", etc.

-- 1. Add role column (nullable initially so we can populate it)
ALTER TABLE users ADD COLUMN role user_role;

-- 2. Migrate each user to their highest existing role
UPDATE users u
SET role = (
  SELECT r.role
  FROM user_roles r
  WHERE r.user_id = u.user_id
  ORDER BY r.role DESC  -- enum DESC: admin first, then auditor, reviewer, trainer, trainee
  LIMIT 1
);

-- 3. Users with no entry in user_roles default to 'trainee'
UPDATE users SET role = 'trainee' WHERE role IS NULL;

-- 4. Make role NOT NULL with default 'trainee' for new sign-ups
ALTER TABLE users ALTER COLUMN role SET NOT NULL;
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'trainee';

-- 5. Drop all policies that reference user_roles directly
DROP POLICY IF EXISTS "user_roles: read own" ON user_roles;
DROP POLICY IF EXISTS "user_roles: admin full write" ON user_roles;

-- form_answers policies that query user_roles directly
DROP POLICY IF EXISTS "Admins and reviewers can view all form answers" ON public.form_answers;
DROP POLICY IF EXISTS "Admins can manage form answers" ON public.form_answers;

-- 6. Drop the join table
DROP TABLE user_roles;

-- 7. Recreate form_answers policies using has_role() (hierarchical-aware)
CREATE POLICY "Admins and reviewers can view all form answers"
  ON public.form_answers FOR SELECT
  TO authenticated
  USING ( has_role('reviewer') );

CREATE POLICY "Admins can manage form answers"
  ON public.form_answers FOR ALL
  TO authenticated
  USING ( has_role('admin') );

-- 7. Replace has_role() with a hierarchical version.
--    role >= _role is true when the user's role is at the same level or higher,
--    so a reviewer automatically satisfies has_role('trainer').
CREATE OR REPLACE FUNCTION has_role(_role user_role)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE user_id = auth.uid()
      AND role >= _role
  )
$$;
