-- Add reported fields to tasks table
alter table tasks
  add column is_reported boolean not null default false,
  add column report_note text;
