-- Audience-läge för presenter: sessioner + publikfrågor
-- Kör i Supabase SQL Editor. Skapar tabeller, RLS-policyer och Realtime-publikation.

-- ============================================================
-- Tabell: sessions
-- En aktiv session när Joel kör en presentation med publikläge.
-- code är den 6-siffriga kod publiken skriver in.
-- ============================================================
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  slug text not null,
  theme text,
  title text,
  current_slide int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);

create index if not exists sessions_code_idx on public.sessions (code) where active = true;
create index if not exists sessions_active_idx on public.sessions (active, expires_at);

-- ============================================================
-- Tabell: audience_questions
-- Frågor från publiken kopplade till en session och ev. slide.
-- ============================================================
create table if not exists public.audience_questions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  slide_index int,
  question text not null check (length(question) between 1 and 2000),
  seen boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists audience_questions_session_idx on public.audience_questions (session_id, created_at desc);
create index if not exists audience_questions_unseen_idx on public.audience_questions (session_id) where seen = false;

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.sessions enable row level security;
alter table public.audience_questions enable row level security;

-- Sessions: anonyma klienter får skapa och läsa aktiva sessioner.
-- (Presentatören och publiken är båda "anon" — vi litar på att sessionskoden är
-- tillräckligt svår att gissa. Byt ut till auth-policies när vi inför inloggning.)
drop policy if exists "sessions_anon_select" on public.sessions;
create policy "sessions_anon_select"
  on public.sessions for select
  to anon, authenticated
  using (active = true and expires_at > now());

drop policy if exists "sessions_anon_insert" on public.sessions;
create policy "sessions_anon_insert"
  on public.sessions for insert
  to anon, authenticated
  with check (true);

drop policy if exists "sessions_anon_update" on public.sessions;
create policy "sessions_anon_update"
  on public.sessions for update
  to anon, authenticated
  using (active = true and expires_at > now())
  with check (true);

-- Audience questions: vem som helst får skapa, alla får läsa (för session).
drop policy if exists "questions_anon_select" on public.audience_questions;
create policy "questions_anon_select"
  on public.audience_questions for select
  to anon, authenticated
  using (true);

drop policy if exists "questions_anon_insert" on public.audience_questions;
create policy "questions_anon_insert"
  on public.audience_questions for insert
  to anon, authenticated
  with check (length(question) between 1 and 2000);

drop policy if exists "questions_anon_update" on public.audience_questions;
create policy "questions_anon_update"
  on public.audience_questions for update
  to anon, authenticated
  using (true)
  with check (true);

-- ============================================================
-- Realtime
-- Publicera tabellerna så att Supabase skickar change-events över
-- Realtime-websocket. Detta driver live-synk i publikvyn + frågeikonen.
-- ============================================================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'sessions'
  ) then
    execute 'alter publication supabase_realtime add table public.sessions';
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'audience_questions'
  ) then
    execute 'alter publication supabase_realtime add table public.audience_questions';
  end if;
end $$;
