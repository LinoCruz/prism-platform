-- ANNOUNCEMENTS
create table announcements (
  announcement_id      uuid primary key default gen_random_uuid(),
  title                varchar not null,
  body                 text not null,
  priority             integer not null default 0,  -- higher = more urgent
  created_by_admin_id  uuid not null references users(user_id),
  created_at           timestamptz not null default now(),
  expires_at           timestamptz
);

create index on announcements(created_by_admin_id);
create index on announcements(expires_at);

-- ANNOUNCEMENT_READS
create table announcement_reads (
  id               uuid primary key default gen_random_uuid(),
  announcement_id  uuid not null references announcements(announcement_id) on delete cascade,
  user_id          uuid not null references users(user_id) on delete cascade,
  read_at          timestamptz not null default now(),
  unique(announcement_id, user_id)
);

create index on announcement_reads(user_id);
create index on announcement_reads(announcement_id);
