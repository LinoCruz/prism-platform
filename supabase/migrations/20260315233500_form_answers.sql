-- Create form_answers table
create table public.form_answers (
  answer_id    uuid primary key default gen_random_uuid(),
  form_id      varchar not null,
  form_title   varchar not null,
  answers      jsonb not null default '[]'::jsonb,
  user_id      uuid references public.users(user_id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Enable RLS
alter table public.form_answers enable row level security;

-- Policies for form_answers
create policy "Users can view their own form answers"
  on public.form_answers for select
  to authenticated
  using ( auth.uid() = user_id );

create policy "Users can insert their own form answers"
  on public.form_answers for insert
  to authenticated
  with check ( auth.uid() = user_id );

create policy "Users can update their own form answers"
  on public.form_answers for update
  to authenticated
  using ( auth.uid() = user_id );

create policy "Admins and reviewers can view all form answers"
  on public.form_answers for select
  to authenticated
  using (
    exists (
      select 1 from public.user_roles 
      where user_roles.user_id = auth.uid() 
      and user_roles.role in ('admin', 'reviewer')
    )
  );

create policy "Admins can manage form answers"
  on public.form_answers for all
  to authenticated
  using (
    exists (
      select 1 from public.user_roles 
      where user_roles.user_id = auth.uid() 
      and user_roles.role = 'admin'
    )
  );
