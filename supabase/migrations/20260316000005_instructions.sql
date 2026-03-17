-- Instructions table: role-targeted documentation managed by admins
create table instructions (
  instruction_id  uuid primary key default gen_random_uuid(),
  title           text not null,
  content         text not null,
  target_role     user_role not null,   -- audience: trainer | reviewer | auditor
  display_order   int not null default 0,
  published       boolean not null default false,
  created_by      uuid references users(user_id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table instructions enable row level security;

-- Authenticated users can read published instructions whose target_role <= their role
-- e.g. an auditor can see trainer docs, reviewer docs, and auditor docs
create policy "users read published instructions up to their role"
  on instructions for select
  using (
    auth.uid() is not null
    and published = true
    and has_role(target_role)
  );

-- Admins have full access (read/insert/update/delete)
create policy "admins manage all instructions"
  on instructions for all
  using (has_role('admin'))
  with check (has_role('admin'));
