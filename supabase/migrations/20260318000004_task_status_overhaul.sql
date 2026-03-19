-- ============================================================
-- Task status overhaul: add new enum values.
-- Data migration is in the next migration file (000005) because
-- ALTER TYPE ADD VALUE cannot be used in the same transaction
-- as DML that references the new values.
-- ============================================================
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'completed'       AFTER 'claimed';
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'sent_for_rework' AFTER 'in_review';
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'fixed'           AFTER 'sent_for_rework';
