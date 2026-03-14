-- COURSES
create table courses (
  course_id   uuid primary key default gen_random_uuid(),
  title       varchar not null,
  description text,
  created_at  timestamptz not null default now()
);

-- COURSE_MODULES
create table course_modules (
  module_id    uuid primary key default gen_random_uuid(),
  course_id    uuid not null references courses(course_id) on delete cascade,
  title        varchar not null,
  video_url    varchar,
  module_order integer not null default 0,
  created_at   timestamptz not null default now()
);

create index on course_modules(course_id);
create index on course_modules(course_id, module_order);

-- QUIZZES
create table quizzes (
  quiz_id    uuid primary key default gen_random_uuid(),
  course_id  uuid not null references courses(course_id) on delete cascade,
  created_at timestamptz not null default now()
);

create index on quizzes(course_id);

-- QUIZ_QUESTIONS
create table quiz_questions (
  question_id   uuid primary key default gen_random_uuid(),
  quiz_id       uuid not null references quizzes(quiz_id) on delete cascade,
  question_text text not null,
  question_order integer not null default 0
);

create index on quiz_questions(quiz_id);

-- QUIZ_OPTIONS
create table quiz_options (
  option_id    uuid primary key default gen_random_uuid(),
  question_id  uuid not null references quiz_questions(question_id) on delete cascade,
  option_text  text not null,
  is_correct   boolean not null default false
);

create index on quiz_options(question_id);

-- QUIZ_ATTEMPTS
create table quiz_attempts (
  attempt_id   uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users(user_id) on delete cascade,
  quiz_id      uuid not null references quizzes(quiz_id) on delete cascade,
  score        numeric(5,2),
  passed       boolean not null default false,
  started_at   timestamptz not null default now(),
  completed_at timestamptz
);

create index on quiz_attempts(user_id);
create index on quiz_attempts(quiz_id);
create index on quiz_attempts(user_id, quiz_id);
