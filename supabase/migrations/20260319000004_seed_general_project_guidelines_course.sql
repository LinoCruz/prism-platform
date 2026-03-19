-- Seed: General Project Guidelines course (required for all roles / trainee)

insert into courses (title, description)
values (
  'General Project Guidelines',
  'Core workflows, task taxonomy, and quality standards for evaluating Q&A pairs on 360° videos.'
)
returning course_id;

-- Link the course as a mandatory requirement for the trainee role (visible to all)
insert into training_requirements (course_id, role_required, mandatory)
select course_id, 'trainee', true
from courses
where title = 'General Project Guidelines'
limit 1;
