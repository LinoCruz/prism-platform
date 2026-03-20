-- Migrate existing task statuses to the new naming:
--   Old 'signed_off'  (set by reviewers) → 'approved'
--   Old 'passed_audit' (set by auditors) → 'signed_off'
update tasks set status = 'approved'   where status = 'signed_off';
update tasks set status = 'signed_off' where status = 'passed_audit';
