-- TASK_ATTEMPTS
create table task_attempts (
  attempt_id               uuid primary key default gen_random_uuid(),
  task_id                  uuid not null references tasks(task_id) on delete cascade,
  version_id               uuid references task_versions(version_id),
  trainer_id               uuid not null references users(user_id),
  attempt_number           integer not null default 1,
  claimed_at               timestamptz not null default now(),
  submitted_at             timestamptz,
  rework_due_to_review_id  uuid   -- FK added after task_reviews is created
);

create index on task_attempts(task_id);
create index on task_attempts(trainer_id);
create index on task_attempts(task_id, attempt_number);

-- TASK_REWORK_LOCKS
create table task_rework_locks (
  lock_id     uuid primary key default gen_random_uuid(),
  task_id     uuid not null references tasks(task_id) on delete cascade,
  trainer_id  uuid not null references users(user_id),
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now(),
  unique(task_id)   -- only one active lock per task
);

create index on task_rework_locks(task_id);
create index on task_rework_locks(trainer_id);
create index on task_rework_locks(expires_at);

-- REVIEW DECISION enum
create type review_decision as enum ('approved', 'rework');

-- TASK_REVIEWS
create table task_reviews (
  review_id      uuid primary key default gen_random_uuid(),
  task_id        uuid not null references tasks(task_id) on delete cascade,
  version_id     uuid references task_versions(version_id),
  reviewer_id    uuid not null references users(user_id),
  review_number  integer not null default 1,
  decision       review_decision,
  score          numeric(5,2),
  feedback       text,
  started_at     timestamptz not null default now(),
  completed_at   timestamptz
);

create index on task_reviews(task_id);
create index on task_reviews(reviewer_id);
create index on task_reviews(task_id, review_number);

-- Now add the FK from task_attempts to task_reviews
alter table task_attempts
  add constraint task_attempts_rework_due_to_review_id_fkey
  foreign key (rework_due_to_review_id)
  references task_reviews(review_id);

-- AUDIT DECISION / ACTION enums
create type audit_decision as enum ('approved', 'needs_changes');

create type audit_action as enum (
  'approve',
  'send_back_to_reviewer',
  'fix_themselves'
);

-- REVIEW_AUDITS
create table review_audits (
  audit_id    uuid primary key default gen_random_uuid(),
  review_id   uuid not null references task_reviews(review_id) on delete cascade,
  auditor_id  uuid not null references users(user_id),
  decision    audit_decision,
  score       numeric(5,2),
  feedback    text,
  action      audit_action,
  started_at  timestamptz not null default now(),
  completed_at timestamptz
);

create index on review_audits(review_id);
create index on review_audits(auditor_id);

-- REVIEW_FIXES
create table review_fixes (
  fix_id          uuid primary key default gen_random_uuid(),
  review_id       uuid not null references task_reviews(review_id) on delete cascade,
  reviewer_id     uuid not null references users(user_id),
  new_version_id  uuid references task_versions(version_id),
  created_at      timestamptz not null default now()
);

create index on review_fixes(review_id);
create index on review_fixes(reviewer_id);
