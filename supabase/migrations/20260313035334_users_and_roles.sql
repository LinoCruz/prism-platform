-- Enable UUID extension
create extension if not exists "pgcrypto";

-- USERS
create table users (
  user_id    uuid primary key default gen_random_uuid(),
  email      varchar not null unique,
  name       varchar not null,
  status     varchar not null default 'active'
               check (status in ('active', 'suspended')),
  created_at timestamptz not null default now()
);

-- ROLES enum
create type user_role as enum (
  'trainee',
  'trainer',
  'reviewer',
  'auditor',
  'admin'
);

-- USER_ROLES
create table user_roles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(user_id) on delete cascade,
  role       user_role not null,
  granted_at timestamptz not null default now(),
  unique(user_id, role)
);

-- Indexes
create index on user_roles(user_id);
create index on user_roles(role);
