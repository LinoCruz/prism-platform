-- Add 'approved' to the task_status enum.
-- Must commit before the new value can be used in DML (see next migration).
alter type task_status add value if not exists 'approved';
