-- TASK STATUS enum
create type task_status as enum (
  'available',
  'claimed',
  'in_review',
  'rework',
  'signed_off'
);

-- VERSION SOURCE enum
create type version_source as enum ('trainer', 'reviewer', 'auditor');

-- TASKS
-- Note: current_version_id is added after TASK_VERSIONS to avoid circular FK
create table tasks (
  task_id             uuid primary key default gen_random_uuid(),
  external_id         varchar unique,
  status              task_status not null default 'available',
  current_version_id  uuid,   -- FK added below after task_versions exists
  final_signedoff_at  timestamptz,
  created_at          timestamptz not null default now()
);

create index on tasks(status);
create index on tasks(external_id);

-- TASK_VERSIONS
create table task_versions (
  version_id         uuid primary key default gen_random_uuid(),
  task_id            uuid not null references tasks(task_id) on delete cascade,
  version_number     integer not null default 1,
  created_by_user_id uuid not null references users(user_id),
  source             version_source not null,
  parent_version_id  uuid references task_versions(version_id),
  data_payload       jsonb not null default '{}',
  created_at         timestamptz not null default now(),
  unique(task_id, version_number)
);

create index on task_versions(task_id);
create index on task_versions(created_by_user_id);
create index on task_versions(task_id, version_number desc);

-- Now add the FK from tasks to task_versions
alter table tasks
  add constraint tasks_current_version_id_fkey
  foreign key (current_version_id)
  references task_versions(version_id);

-- TASK_EVENTS
create table task_events (
  event_id    uuid primary key default gen_random_uuid(),
  version_id  uuid not null references task_versions(version_id) on delete cascade,
  timestamp   interval not null,   -- e.g. '00:02:14'
  label       varchar not null,
  created_at  timestamptz not null default now()
);

create index on task_events(version_id);
