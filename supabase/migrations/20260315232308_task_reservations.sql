-- Add 'reserved' state to task_status
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'reserved';

-- Add columns for reserving tasks to a specific user
ALTER TABLE tasks 
ADD COLUMN reserved_for_id uuid references users(user_id) ON DELETE SET NULL,
ADD COLUMN reservation_expires_at timestamptz;

-- Helpful index for fetching reserved tasks or cleaning them up
CREATE INDEX IF NOT EXISTS idx_tasks_reservation 
ON tasks(reserved_for_id, reservation_expires_at);