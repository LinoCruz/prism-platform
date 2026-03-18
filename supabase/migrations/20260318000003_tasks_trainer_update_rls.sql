-- ============================================================
-- Allow trainers/trainees to update the status of tasks
-- reserved for them, and to insert task_attempts.
-- Previously only admins had write access to tasks, which
-- caused status updates from startTask/finishTask to silently
-- fail (0 rows updated, no error thrown).
-- ============================================================

-- Tasks: allow trainers and trainees to update status on their own reserved/in_progress tasks
create policy "tasks: trainers can update their own tasks"
  on tasks for update
  using (
    (has_role('trainer') or has_role('trainee'))
    and reserved_for_id = auth.uid()
  )
  with check (
    (has_role('trainer') or has_role('trainee'))
    and reserved_for_id = auth.uid()
  );

-- Task attempts: also allow trainees to insert (was trainer-only before)
drop policy if exists "task_attempts: trainers can claim (insert)" on task_attempts;

create policy "task_attempts: trainers can claim (insert)"
  on task_attempts for insert
  with check (
    trainer_id = auth.uid()
    and (has_role('trainer') or has_role('trainee'))
  );
