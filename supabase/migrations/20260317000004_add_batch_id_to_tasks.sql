alter table tasks
  add column if not exists batch_id text;

create index if not exists tasks_batch_id_idx on tasks(batch_id);
