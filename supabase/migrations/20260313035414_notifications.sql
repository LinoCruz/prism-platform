-- NOTIFICATION_TYPE enum
create type notification_type as enum (
  'TASK_REWORK',
  'REVIEW_COMPLETED',
  'AUDIT_FEEDBACK',
  'COURSE_REQUIRED',
  'ANNOUNCEMENT'
);

-- NOTIFICATIONS
create table notifications (
  notification_id  uuid primary key default gen_random_uuid(),
  user_id          uuid not null references users(user_id) on delete cascade,
  type             notification_type not null,
  title            varchar not null,
  message          text not null,
  reference_type   varchar,   -- e.g. 'task', 'review', 'announcement'
  reference_id     uuid,      -- polymorphic reference to the related entity
  read             boolean not null default false,
  created_at       timestamptz not null default now()
);

create index on notifications(user_id);
create index on notifications(user_id, read);
create index on notifications(user_id, created_at desc);
