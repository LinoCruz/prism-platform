-- ============================================================
-- Migrate existing task rows to the new status terminology.
-- Must run after 000004 (enum values must be committed first).
--
--   in_progress → claimed         (was "being worked on")
--   in_review   → completed       (was "submitted, awaiting reviewer")
--   rework      → sent_for_rework
-- ============================================================
UPDATE tasks SET status = 'claimed'         WHERE status = 'in_progress';
UPDATE tasks SET status = 'completed'       WHERE status = 'in_review';
UPDATE tasks SET status = 'sent_for_rework' WHERE status = 'rework';
