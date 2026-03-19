-- Add QA/review fields to tasks
ALTER TABLE tasks
  ADD COLUMN original_question       text,
  ADD COLUMN original_answer         text,
  ADD COLUMN is_question_valid       boolean,
  ADD COLUMN question_invalid_reason text,
  ADD COLUMN new_question            text,
  ADD COLUMN is_answer_valid         boolean,
  ADD COLUMN answer_invalid_reason   text,
  ADD COLUMN new_answer              text,
  ADD COLUMN is_temporal             boolean;

-- Temporal values: one-to-many text entries per task
CREATE TABLE task_temporal_values (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references tasks(task_id) on delete cascade,
  value      text not null,
  created_at timestamptz not null default now()
);

CREATE INDEX ON task_temporal_values(task_id);
