-- ============================================================
-- Update tasks RLS so trainers can see tasks reserved for them
-- Previously trainers could only see status='available' tasks;
-- now they also see tasks reserved for them (status='reserved',
-- reserved_for_id = auth.uid()).
-- ============================================================

drop policy if exists "tasks: trainers see available or their own" on tasks;

create policy "tasks: trainers see available or their own"
  on tasks for select
  using (
    has_role('admin')
    or has_role('auditor')
    or (has_role('reviewer') and status in ('in_review', 'rework', 'signed_off'))
    or (
      (has_role('trainer') or has_role('trainee'))
      and (
        reserved_for_id = auth.uid()
        or exists (
          select 1 from task_attempts
          where task_attempts.task_id = tasks.task_id
            and task_attempts.trainer_id = auth.uid()
        )
      )
    )
  );
