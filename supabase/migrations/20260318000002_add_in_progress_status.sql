-- ============================================================
-- Add 'in_progress' to task_status enum.
-- This status is set when a trainer opens the claim modal and
-- is actively working on the task. Only admins can override it.
-- ============================================================

ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'in_progress' AFTER 'reserved';
