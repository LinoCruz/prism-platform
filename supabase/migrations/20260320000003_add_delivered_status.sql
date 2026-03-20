-- ============================================================
-- Add 'delivered' as the ultimate terminal status.
--
-- 'delivered' sits above 'passed_audit' and can only be set
-- by an auditor or an admin. It represents the final handoff
-- of a task out of the platform workflow.
--
-- Transition: passed_audit → delivered  (auditor or admin)
--
-- No other role may move a task into this status.
-- ============================================================

ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'delivered' AFTER 'passed_audit';
