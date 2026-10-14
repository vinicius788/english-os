create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  timezone text not null default 'America/Sao_Paulo',
  start_date date not null default '2026-10-14',
  target_minutes int not null default 120 check (target_minutes between 15 and 300),
  level text not null default 'A0',
  created_at timestamptz not null default now()
);
create table if not exists public.curriculum_weeks (
  id uuid primary key default gen_random_uuid(), week_number int not null unique check (week_number between 1 and 26),
  target_cefr text not null, topic text not null, outcome text not null, focus text not null
);
create table if not exists public.curriculum_days (
  id uuid primary key default gen_random_uuid(), day_number int not null unique check (day_number between 1 and 182),
  planned_date date not null unique, week_id uuid not null references public.curriculum_weeks(id),
  objective text not null, default_minutes int not null check(default_minutes in (45,120)), payload jsonb not null
);
create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(), external_source text not null, title text not null, url text not null unique,
  cefr text, skill text not null, verified_at timestamptz, copyright_notes text not null default ''
);
create table if not exists public.course_sections (
  id uuid primary key default gen_random_uuid(), course_id text not null, section_order int not null,
  title text not null, source_verified boolean not null default false, lecture_count int, unique(course_id, section_order)
);
create table if not exists public.course_lectures (
  id uuid primary key default gen_random_uuid(), course_id text not null, section_id uuid references public.course_sections(id) on delete set null,
  external_lecture_id text, sequence int not null, title text not null, duration_seconds int, url text,
  verified boolean not null default false, metadata_source text not null default 'manual-import', unique(course_id, sequence)
);
create table if not exists public.learner_activity (
  user_id uuid not null references auth.users(id) on delete cascade, curriculum_day_id uuid not null references public.curriculum_days(id) on delete cascade,
  activity_key text not null, status text not null check(status in ('todo','done','skipped')), started_at timestamptz,
  completed_at timestamptz, actual_minutes int check(actual_minutes between 0 and 600), comprehension_score int check(comprehension_score between 1 and 5), notes text not null default '',
  primary key(user_id,curriculum_day_id,activity_key)
);
create table if not exists public.learner_lecture_progress (
  user_id uuid not null references auth.users(id) on delete cascade, lecture_id uuid not null references public.course_lectures(id) on delete cascade,
  status text not null check(status in ('not_started','in_progress','completed')), completed_at timestamptz, notes text not null default '',
  primary key(user_id,lecture_id)
);
create table if not exists public.learner_calendar_overrides (
  user_id uuid not null references auth.users(id) on delete cascade, day_id uuid not null references public.curriculum_days(id) on delete cascade,
  scheduled_date date not null, reason text not null default '', updated_at timestamptz not null default now(), primary key(user_id,day_id)
);
create table if not exists public.review_cards (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  phrase_en text not null, example_en text not null, meaning_pt text not null, topic text not null check(topic in ('cotidiano','startup')),
  ease numeric not null default 2.3, due_date date not null default current_date, interval_days int not null default 0, created_at timestamptz not null default now()
);
create table if not exists public.review_events (
  id uuid primary key default gen_random_uuid(), card_id uuid not null references public.review_cards(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, grade text not null check(grade in ('easy','hard')), reviewed_at timestamptz not null default now()
);
create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  period text not null, dimension text not null check(dimension in ('listening','reading','speaking','pitch')), score int not null check(score between 1 and 5),
  notes text not null default '', evidence_url text, created_at timestamptz not null default now()
);
create table if not exists public.speaking_sessions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  session_date timestamptz not null default now(), topic text not null, seconds int not null check(seconds between 0 and 21600),
  feedback text not null default '', storage_path text
);
create table if not exists public.settings (
  user_id uuid primary key references auth.users(id) on delete cascade, use_cloud boolean not null default true,
  ai_enabled boolean not null default false, payload jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now()
);
create table if not exists public.user_state (
  user_id uuid primary key references auth.users(id) on delete cascade, payload jsonb not null, updated_at timestamptz not null default now()
);

create or replace function public.create_profile_for_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created_english_os on auth.users;
create trigger on_auth_user_created_english_os after insert on auth.users for each row execute procedure public.create_profile_for_new_user();

do $$
declare t text;
begin
  foreach t in array array['profiles','learner_activity','learner_lecture_progress','learner_calendar_overrides','review_cards','review_events','assessments','speaking_sessions','settings','user_state'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('drop policy if exists owner_select on public.%I',t);
    execute format('drop policy if exists owner_insert on public.%I',t);
    execute format('drop policy if exists owner_update on public.%I',t);
    execute format('drop policy if exists owner_delete on public.%I',t);
    if t='profiles' then
      execute format('create policy owner_select on public.%I for select to authenticated using (auth.uid() = id)',t);
      execute format('create policy owner_insert on public.%I for insert to authenticated with check (auth.uid() = id)',t);
      execute format('create policy owner_update on public.%I for update to authenticated using (auth.uid() = id) with check (auth.uid() = id)',t);
      execute format('create policy owner_delete on public.%I for delete to authenticated using (auth.uid() = id)',t);
    else
      execute format('create policy owner_select on public.%I for select to authenticated using (auth.uid() = user_id)',t);
      execute format('create policy owner_insert on public.%I for insert to authenticated with check (auth.uid() = user_id)',t);
      execute format('create policy owner_update on public.%I for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)',t);
      execute format('create policy owner_delete on public.%I for delete to authenticated using (auth.uid() = user_id)',t);
    end if;
    execute format('grant select,insert,update,delete on public.%I to authenticated',t);
  end loop;
end $$;

alter table public.curriculum_weeks enable row level security;
alter table public.curriculum_days enable row level security;
alter table public.resources enable row level security;
alter table public.course_sections enable row level security;
alter table public.course_lectures enable row level security;
do $$
declare t text;
begin
  foreach t in array array['curriculum_weeks','curriculum_days','resources','course_sections','course_lectures'] loop
    execute format('drop policy if exists curated_read on public.%I',t);
    execute format('create policy curated_read on public.%I for select to anon,authenticated using (true)',t);
    execute format('grant select on public.%I to anon,authenticated',t);
    execute format('revoke insert,update,delete,truncate,references,trigger on public.%I from anon,authenticated',t);
  end loop;
end $$;
revoke all on function public.create_profile_for_new_user() from public;
grant usage on schema public to anon, authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('speaking-audio','speaking-audio',false,10485760,array['audio/webm','audio/mp4','audio/mpeg','audio/wav']) on conflict(id) do update set public=false,file_size_limit=10485760;
drop policy if exists speaking_audio_owner_read on storage.objects;
drop policy if exists speaking_audio_owner_insert on storage.objects;
drop policy if exists speaking_audio_owner_delete on storage.objects;
create policy speaking_audio_owner_read on storage.objects for select to authenticated using (bucket_id='speaking-audio' and (storage.foldername(name))[1]=auth.uid()::text);
create policy speaking_audio_owner_insert on storage.objects for insert to authenticated with check (bucket_id='speaking-audio' and (storage.foldername(name))[1]=auth.uid()::text);
create policy speaking_audio_owner_delete on storage.objects for delete to authenticated using (bucket_id='speaking-audio' and (storage.foldername(name))[1]=auth.uid()::text);
