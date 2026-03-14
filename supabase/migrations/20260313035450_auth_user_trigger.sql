-- Function that runs after a new user signs up via Supabase Auth.
-- Inserts a matching row into public.users using the auth user's id,
-- email, and optional display name from metadata.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (user_id, email, name)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)  -- fallback: use the email prefix
    )
  );
  return new;
end;
$$;

-- Trigger: fires after every insert on auth.users (i.e. every sign-up)
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.handle_new_auth_user();
