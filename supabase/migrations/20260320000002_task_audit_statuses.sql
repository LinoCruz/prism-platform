-- ============================================================
-- Add audit-phase statuses to task_status enum.
--
-- New values:
--   auditing     → auditor has picked up a signed_off task and is evaluating it
--   passed_audit → auditor approved; awaiting delivery
--
-- NOTE: The reviewer RLS policy is NOT updated here because PostgreSQL
-- does not allow referencing a newly added enum value in the same
-- transaction as ALTER TYPE ADD VALUE (error 55P04).
-- The policy is updated in 000004 which recreates the enum from scratch,
-- committing the new values before the policy references them.
-- ============================================================

ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'auditing'     AFTER 'signed_off';
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'passed_audit' AFTER 'auditing';
