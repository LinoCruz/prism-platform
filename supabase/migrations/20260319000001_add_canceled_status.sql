-- Add 'canceled' to task_status enum
-- Used when an expert claims a task but decides not to continue working on it.
alter type task_status add value 'canceled';
