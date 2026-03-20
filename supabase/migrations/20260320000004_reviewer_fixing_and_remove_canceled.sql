-- ============================================================
-- 1. Recreate task_status enum:
--    - Remove 'canceled': cancel is not a task state. When an
--      expert cancels, the attempt row is deleted and the task
--      reverts to 'reserved'. Nothing is persisted.
--    - Add 'reviewer_fixing': set when an auditor sends the task
--      back to the reviewer (action = send_back_to_reviewer OR
--      fix_themselves). The reviewer must address the feedback
--      and re-submit before the task returns to 'signed_off'.
--
-- Final enum order (workflow sequence):
--   available → reserved → claimed → completed
--   → in_review → sent_for_rework → reworking → fixed  (N cycles)
--   → in_review → signed_off
--   → auditing → reviewer_fixing → signed_off           (if sent back)
--   → auditing → passed_audit → delivered
--
-- 2. Update reviewer RLS policy to include 'reviewer_fixing'
--    so reviewers can see tasks they need to fix.
-- ============================================================

BEGIN;

-- Safety check: no tasks should carry 'canceled' at this point
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM tasks WHERE status::text = 'canceled') THEN
    RAISE EXCEPTION 'Found tasks with status=canceled. Migrate or remove them before applying this migration.';
  END IF;
END $$;

-- Drop the RLS policy that references tasks.status before altering the column type.
-- Recreated below after the type swap.
DROP POLICY IF EXISTS "tasks: trainers see available or their own" ON tasks;

ALTER TYPE task_status RENAME TO task_status_old;

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
  'auditing',
  'reviewer_fixing',
  'passed_audit',
  'delivered'
);

ALTER TABLE tasks ALTER COLUMN status DROP DEFAULT;
ALTER TABLE tasks
  ALTER COLUMN status TYPE task_status
  USING status::text::task_status;
ALTER TABLE tasks ALTER COLUMN status SET DEFAULT 'available'::task_status;

DROP TYPE task_status_old;

-- ============================================================
-- Update reviewer RLS: add 'reviewer_fixing' so reviewers can
-- see tasks the auditor has sent back to them.
-- ============================================================

DROP POLICY IF EXISTS "tasks: trainers see available or their own" ON tasks;

CREATE POLICY "tasks: trainers see available or their own"
  ON tasks FOR SELECT
  USING (
    has_role('admin')
    OR has_role('auditor')
    OR (
      has_role('reviewer')
      AND status IN (
        'in_review', 'sent_for_rework', 'reworking', 'fixed',
        'signed_off', 'auditing', 'reviewer_fixing', 'passed_audit', 'delivered'
      )
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

COMMIT;
