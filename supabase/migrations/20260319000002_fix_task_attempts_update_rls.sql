-- Fix: task_attempts UPDATE policy was missing the 'trainee' role.
-- Trainees can insert attempts (via the insert policy) but were silently
-- blocked from updating them (e.g. setting submitted_at), causing
-- submitted_at to remain null even after a task was submitted.

drop policy if exists "task_attempts: trainers can update own" on task_attempts;

create policy "task_attempts: trainers can update own"
  on task_attempts for update
  using (
    trainer_id = auth.uid()
    and (has_role('trainer') or has_role('trainee'))
  );
