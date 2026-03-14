-- ============================================================
-- Row Level Security
-- auth.uid() is expected to match users.user_id (synced via
-- an auth trigger on auth.users → public.users).
-- ============================================================

-- Helper: check if the current user has a given role
create or replace function has_role(_role user_role)
returns boolean
language sql
security definer stable
as $$
  select exists (
    select 1 from user_roles
    where user_id = auth.uid()
      and role = _role
  )
$$;

-- ============================================================
-- USERS
-- ============================================================
alter table users enable row level security;

create policy "users: read own or admin"
  on users for select
  using (user_id = auth.uid() or has_role('admin'));

create policy "users: update own"
  on users for update
  using (user_id = auth.uid());

create policy "users: admin full write"
  on users for all
  using (has_role('admin'));

-- ============================================================
-- USER_ROLES
-- ============================================================
alter table user_roles enable row level security;

create policy "user_roles: read own"
  on user_roles for select
  using (user_id = auth.uid() or has_role('admin'));

create policy "user_roles: admin full write"
  on user_roles for all
  using (has_role('admin'));

-- ============================================================
-- COURSES
-- ============================================================
alter table courses enable row level security;

create policy "courses: all authenticated can read"
  on courses for select
  using (auth.uid() is not null);

create policy "courses: admin full write"
  on courses for all
  using (has_role('admin'));

-- ============================================================
-- COURSE_MODULES
-- ============================================================
alter table course_modules enable row level security;

create policy "course_modules: all authenticated can read"
  on course_modules for select
  using (auth.uid() is not null);

create policy "course_modules: admin full write"
  on course_modules for all
  using (has_role('admin'));

-- ============================================================
-- QUIZZES
-- ============================================================
alter table quizzes enable row level security;

create policy "quizzes: all authenticated can read"
  on quizzes for select
  using (auth.uid() is not null);

create policy "quizzes: admin full write"
  on quizzes for all
  using (has_role('admin'));

-- ============================================================
-- QUIZ_QUESTIONS
-- ============================================================
alter table quiz_questions enable row level security;

create policy "quiz_questions: all authenticated can read"
  on quiz_questions for select
  using (auth.uid() is not null);

create policy "quiz_questions: admin full write"
  on quiz_questions for all
  using (has_role('admin'));

-- ============================================================
-- QUIZ_OPTIONS
-- ============================================================
alter table quiz_options enable row level security;

create policy "quiz_options: all authenticated can read"
  on quiz_options for select
  using (auth.uid() is not null);

create policy "quiz_options: admin full write"
  on quiz_options for all
  using (has_role('admin'));

-- ============================================================
-- QUIZ_ATTEMPTS
-- ============================================================
alter table quiz_attempts enable row level security;

create policy "quiz_attempts: read own or admin"
  on quiz_attempts for select
  using (user_id = auth.uid() or has_role('admin'));

create policy "quiz_attempts: insert own"
  on quiz_attempts for insert
  with check (user_id = auth.uid());

create policy "quiz_attempts: update own"
  on quiz_attempts for update
  using (user_id = auth.uid());

create policy "quiz_attempts: admin delete"
  on quiz_attempts for delete
  using (has_role('admin'));

-- ============================================================
-- TRAINING_REQUIREMENTS
-- ============================================================
alter table training_requirements enable row level security;

create policy "training_requirements: all authenticated can read"
  on training_requirements for select
  using (auth.uid() is not null);

create policy "training_requirements: admin full write"
  on training_requirements for all
  using (has_role('admin'));

-- ============================================================
-- USER_REQUIREMENTS
-- ============================================================
alter table user_requirements enable row level security;

create policy "user_requirements: read own or admin"
  on user_requirements for select
  using (user_id = auth.uid() or has_role('admin'));

create policy "user_requirements: admin full write"
  on user_requirements for all
  using (has_role('admin'));

-- ============================================================
-- ANNOUNCEMENTS
-- ============================================================
alter table announcements enable row level security;

create policy "announcements: all authenticated can read"
  on announcements for select
  using (auth.uid() is not null);

create policy "announcements: admin full write"
  on announcements for all
  using (has_role('admin'));

-- ============================================================
-- ANNOUNCEMENT_READS
-- ============================================================
alter table announcement_reads enable row level security;

create policy "announcement_reads: read own"
  on announcement_reads for select
  using (user_id = auth.uid());

create policy "announcement_reads: insert own"
  on announcement_reads for insert
  with check (user_id = auth.uid());

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
alter table notifications enable row level security;

create policy "notifications: read own"
  on notifications for select
  using (user_id = auth.uid());

create policy "notifications: update own (mark read)"
  on notifications for update
  using (user_id = auth.uid());

create policy "notifications: admin full write"
  on notifications for all
  using (has_role('admin'));

-- ============================================================
-- TASKS
-- ============================================================
alter table tasks enable row level security;

create policy "tasks: trainers see available or their own"
  on tasks for select
  using (
    has_role('admin')
    or has_role('auditor')
    or (has_role('reviewer') and status in ('in_review', 'rework', 'signed_off'))
    or (
      has_role('trainer')
      and (
        status = 'available'
        or exists (
          select 1 from task_attempts
          where task_attempts.task_id = tasks.task_id
            and task_attempts.trainer_id = auth.uid()
        )
      )
    )
  );

create policy "tasks: admin full write"
  on tasks for all
  using (has_role('admin'));

-- ============================================================
-- TASK_VERSIONS
-- ============================================================
alter table task_versions enable row level security;

create policy "task_versions: read"
  on task_versions for select
  using (
    has_role('admin')
    or has_role('auditor')
    or created_by_user_id = auth.uid()
    or (
      has_role('reviewer')
      and exists (
        select 1 from task_reviews
        where task_reviews.task_id = task_versions.task_id
          and task_reviews.reviewer_id = auth.uid()
      )
    )
    or (
      has_role('trainer')
      and exists (
        select 1 from task_attempts
        where task_attempts.task_id = task_versions.task_id
          and task_attempts.trainer_id = auth.uid()
      )
    )
  );

create policy "task_versions: trainers and reviewers can insert"
  on task_versions for insert
  with check (
    created_by_user_id = auth.uid()
    and (has_role('trainer') or has_role('reviewer') or has_role('admin'))
  );

-- ============================================================
-- TASK_EVENTS
-- ============================================================
alter table task_events enable row level security;

create policy "task_events: read"
  on task_events for select
  using (
    has_role('admin')
    or has_role('auditor')
    or exists (
      select 1 from task_versions tv
      where tv.version_id = task_events.version_id
        and (
          tv.created_by_user_id = auth.uid()
          or (
            has_role('reviewer')
            and exists (
              select 1 from task_reviews
              where task_reviews.task_id = tv.task_id
                and task_reviews.reviewer_id = auth.uid()
            )
          )
        )
    )
  );

create policy "task_events: trainers can insert"
  on task_events for insert
  with check (
    has_role('trainer') or has_role('admin')
  );

-- ============================================================
-- TASK_ATTEMPTS
-- ============================================================
alter table task_attempts enable row level security;

create policy "task_attempts: trainers see own; reviewers/auditors/admins see all"
  on task_attempts for select
  using (
    trainer_id = auth.uid()
    or has_role('reviewer')
    or has_role('auditor')
    or has_role('admin')
  );

create policy "task_attempts: trainers can claim (insert)"
  on task_attempts for insert
  with check (
    trainer_id = auth.uid()
    and has_role('trainer')
  );

create policy "task_attempts: trainers can update own"
  on task_attempts for update
  using (trainer_id = auth.uid() and has_role('trainer'));

create policy "task_attempts: admin full write"
  on task_attempts for all
  using (has_role('admin'));

-- ============================================================
-- TASK_REWORK_LOCKS
-- ============================================================
alter table task_rework_locks enable row level security;

create policy "task_rework_locks: trainers see own; admins see all"
  on task_rework_locks for select
  using (
    trainer_id = auth.uid()
    or has_role('admin')
  );

create policy "task_rework_locks: admin full write"
  on task_rework_locks for all
  using (has_role('admin'));

-- ============================================================
-- TASK_REVIEWS
-- ============================================================
alter table task_reviews enable row level security;

create policy "task_reviews: read"
  on task_reviews for select
  using (
    has_role('admin')
    or has_role('auditor')
    or reviewer_id = auth.uid()
    or (
      has_role('trainer')
      and exists (
        select 1 from task_attempts
        where task_attempts.task_id = task_reviews.task_id
          and task_attempts.trainer_id = auth.uid()
      )
    )
  );

create policy "task_reviews: reviewers can insert"
  on task_reviews for insert
  with check (
    reviewer_id = auth.uid()
    and has_role('reviewer')
  );

create policy "task_reviews: reviewers can update own"
  on task_reviews for update
  using (reviewer_id = auth.uid() and has_role('reviewer'));

create policy "task_reviews: admin full write"
  on task_reviews for all
  using (has_role('admin'));

-- ============================================================
-- REVIEW_AUDITS
-- ============================================================
alter table review_audits enable row level security;

create policy "review_audits: read"
  on review_audits for select
  using (
    has_role('admin')
    or auditor_id = auth.uid()
    or (
      has_role('reviewer')
      and exists (
        select 1 from task_reviews
        where task_reviews.review_id = review_audits.review_id
          and task_reviews.reviewer_id = auth.uid()
      )
    )
  );

create policy "review_audits: auditors can insert"
  on review_audits for insert
  with check (
    auditor_id = auth.uid()
    and has_role('auditor')
  );

create policy "review_audits: auditors can update own"
  on review_audits for update
  using (auditor_id = auth.uid() and has_role('auditor'));

create policy "review_audits: admin full write"
  on review_audits for all
  using (has_role('admin'));

-- ============================================================
-- REVIEW_FIXES
-- ============================================================
alter table review_fixes enable row level security;

create policy "review_fixes: read"
  on review_fixes for select
  using (
    has_role('admin')
    or has_role('auditor')
    or reviewer_id = auth.uid()
  );

create policy "review_fixes: reviewers can insert"
  on review_fixes for insert
  with check (
    reviewer_id = auth.uid()
    and has_role('reviewer')
  );

create policy "review_fixes: admin full write"
  on review_fixes for all
  using (has_role('admin'));
