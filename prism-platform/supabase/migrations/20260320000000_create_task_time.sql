-- Create enum for time reference types
CREATE TYPE time_reference_type AS ENUM ('attempt', 'review', 'audit', 'review_fix');

-- Create task_time table for payment-grade time tracking with pause/resume support
CREATE TABLE task_time (
  time_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id            UUID NOT NULL REFERENCES tasks(task_id),
  expert_id          UUID NOT NULL REFERENCES users(user_id),
  role               user_role NOT NULL,
  reference_type     time_reference_type NOT NULL,
  reference_id       UUID NOT NULL,
  segment_start      TIMESTAMPTZ NOT NULL DEFAULT now(),
  segment_end        TIMESTAMPTZ,
  last_heartbeat_at  TIMESTAMPTZ,

  CONSTRAINT segment_end_after_start CHECK (segment_end IS NULL OR segment_end >= segment_start)
);

-- Enforce at most one open segment per reference at a time
CREATE UNIQUE INDEX task_time_one_open_segment_per_reference
  ON task_time (reference_id)
  WHERE segment_end IS NULL;

-- Index for querying all segments for a task (payment reports)
CREATE INDEX task_time_task_id_idx ON task_time (task_id);

-- Index for querying all segments for a specific reference (e.g. one attempt)
CREATE INDEX task_time_reference_id_idx ON task_time (reference_id);

-- Index for querying all open segments for an expert (resume detection)
CREATE INDEX task_time_expert_open_idx ON task_time (expert_id) WHERE segment_end IS NULL;
