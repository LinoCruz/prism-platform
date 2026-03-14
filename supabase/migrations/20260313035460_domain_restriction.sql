-- Replace the auth trigger function to enforce allowed email domains.
-- Only @micro1.ai and @expert.micro1.ai are permitted.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  email_domain text;
begin
  email_domain := split_part(new.email, '@', 2);

  if email_domain not in ('micro1.ai', 'expert.micro1.ai') then
    raise exception 'Access restricted to @micro1.ai and @expert.micro1.ai accounts';
  end if;

  insert into public.users (user_id, email, name)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    )
  )
  on conflict (user_id) do update
    set email = excluded.email,
        name  = coalesce(excluded.name, public.users.name);

  return new;
end;
$$;
