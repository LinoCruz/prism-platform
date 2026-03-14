-- TRAINING_REQUIREMENTS
create table training_requirements (
  requirement_id      uuid primary key default gen_random_uuid(),
  course_id           uuid not null references courses(course_id) on delete cascade,
  role_required       user_role not null,
  mandatory           boolean not null default true,
  expires_after_days  integer,           -- null means never expires
  created_at          timestamptz not null default now()
);

create index on training_requirements(course_id);
create index on training_requirements(role_required);

-- USER_REQUIREMENTS
create type requirement_status as enum ('pending', 'completed', 'expired');

create table user_requirements (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references users(user_id) on delete cascade,
  requirement_id  uuid not null references training_requirements(requirement_id) on delete cascade,
  status          requirement_status not null default 'pending',
  assigned_at     timestamptz not null default now(),
  completed_at    timestamptz,
  unique(user_id, requirement_id)
);

create index on user_requirements(user_id);
create index on user_requirements(requirement_id);
create index on user_requirements(user_id, status);
