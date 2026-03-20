-- ============================================================
-- Task status enum cleanup + reworking status + review snapshots
--
-- 1. Recreate task_status enum, removing two zombie values:
--    - 'rework'       → was replaced by 'sent_for_rework' (data migrated in 000005)
--    - 'in_progress'  → was replaced by 'claimed' (data migrated in 000005)
--    Add new value 'reworking' between 'sent_for_rework' and 'fixed'.
--
--    Full workflow (supports N rework cycles):
--    available → reserved → claimed → completed
--      → in_review → sent_for_rework → reworking → fixed
--      → in_review → sent_for_rework → reworking → fixed  (repeat as needed)
--      → in_review → signed_off
--    Any non-signed_off state → canceled
--
-- 2. Fix reviewer RLS policy that still referenced zombie 'rework'.
--
-- 3. Add snapshot_version_id to task_reviews so every completed
--    review (approve or rework decision) points to a task_versions
--    snapshot capturing the task content at decision time.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. Recreate task_status without zombies, with 'reworking'
-- ============================================================

-- Safety check: confirm no rows still carry zombie values
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM tasks WHERE status::text IN ('rework', 'in_progress')) THEN
    RAISE EXCEPTION 'Found tasks with zombie status values (rework or in_progress). '
      'Run the data migration (000005) before applying this migration.';
  END IF;
END $$;

-- Drop the RLS policy that references tasks.status before altering the column type.
-- PostgreSQL does not allow altering a column type while a policy depends on it.
-- The policy is recreated below after the type swap.
DROP POLICY IF EXISTS "tasks: trainers see available or their own" ON tasks;

-- Rename existing type so we can take its name
ALTER TYPE task_status RENAME TO task_status_old;

-- Create the clean replacement
CREATE TYPE task_status AS ENUM (
  'available',
  'reserved',
  'claimed',
  'completed',
  'in_review',
  'sent_for_rework',
  'reworking',
  'fixed',
  'signed_off',
  'canceled'
);

-- Swap the column over (drop default first, required for type change)
ALTER TABLE tasks ALTER COLUMN status DROP DEFAULT;
ALTER TABLE tasks
  ALTER COLUMN status TYPE task_status
  USING status::text::task_status;
ALTER TABLE tasks ALTER COLUMN status SET DEFAULT 'available'::task_status;

DROP TYPE task_status_old;

-- ============================================================
-- 2. Fix reviewer RLS policy (referenced zombie 'rework')
--
-- Reviewers need to see the task across the full review window:
--   in_review        → reviewer is actively reviewing
--   sent_for_rework  → reviewer sent it back; trainer must rework
--   reworking        → trainer is actively reworking
--   fixed            → trainer resubmitted; awaiting next review
--   signed_off       → completed; reviewer may still read history
-- ============================================================

CREATE POLICY "tasks: trainers see available or their own"
  ON tasks FOR SELECT
  USING (
    has_role('admin')
    OR has_role('auditor')
    OR (
      has_role('reviewer')
      AND status IN ('in_review', 'sent_for_rework', 'reworking', 'fixed', 'signed_off')
    )
    OR (
      (has_role('trainer') OR has_role('trainee'))
      AND (
        reserved_for_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM task_attempts
          WHERE task_attempts.task_id = tasks.task_id
            AND task_attempts.trainer_id = auth.uid()
        )
      )
    )
  );

-- ============================================================
-- 3. Add snapshot_version_id to task_reviews
--
-- Set by the application when completed_at is populated.
-- The referenced task_versions row (source = 'reviewer') captures
-- the full task content at the moment the decision was made.
-- Nullable: null while the review is still in progress.
-- ============================================================

ALTER TABLE task_reviews
  ADD COLUMN snapshot_version_id UUID REFERENCES task_versions(version_id);

CREATE INDEX ON task_reviews(snapshot_version_id);

COMMIT;
