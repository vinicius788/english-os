-- Additive tutor request quota. Existing learner data and policies are untouched.
create table if not exists public.ai_tutor_daily_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null default current_date,
  request_count integer not null default 0 check (request_count between 0 and 20),
  primary key (user_id, usage_date)
);

alter table public.ai_tutor_daily_usage enable row level security;
drop policy if exists ai_tutor_usage_owner_select on public.ai_tutor_daily_usage;
create policy ai_tutor_usage_owner_select on public.ai_tutor_daily_usage
  for select to authenticated using (auth.uid() = user_id);
revoke all on public.ai_tutor_daily_usage from anon, authenticated;
grant select on public.ai_tutor_daily_usage to authenticated;

create or replace function public.consume_ai_tutor_request()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  requesting_user uuid := auth.uid();
  accepted boolean := false;
begin
  if requesting_user is null then return false; end if;
  insert into public.ai_tutor_daily_usage(user_id, usage_date, request_count)
  values (requesting_user, current_date, 1)
  on conflict (user_id, usage_date) do update
    set request_count = public.ai_tutor_daily_usage.request_count + 1
    where public.ai_tutor_daily_usage.request_count < 20
  returning true into accepted;
  return coalesce(accepted, false);
end;
$$;

revoke all on function public.consume_ai_tutor_request() from public, anon;
grant execute on function public.consume_ai_tutor_request() to authenticated;
