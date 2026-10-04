-- Interaktivitet: quiz + reflektioner
-- Körs efter 0001_audience_mode.sql. Bygger på sessions-tabellen.

-- ============================================================
-- Tabell: interactions
-- En interaktion kan vara en quiz (med alternativ) eller en
-- reflektion (öppen text). Båda har en prompt och en aktiv-flagga.
-- ============================================================
create table if not exists public.interactions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  type text not null check (type in ('quiz', 'reflection')),
  prompt text not null check (length(prompt) between 1 and 1000),
  -- För quiz: [{ "text": "Alt A" }, { "text": "Alt B", "correct": true }]
  options jsonb,
  slide_index int,
  active boolean not null default true,
  reveal_results boolean not null default false,
  created_at timestamptz not null default now(),
  ended_at timestamptz
);

create index if not exists interactions_session_active_idx
  on public.interactions (session_id, active, created_at desc);

-- ============================================================
-- Tabell: interaction_responses
-- En röst/reflektion per (interaktion, åhörare).
-- audience_id är ett anonymt UUID som publikklienten genererar
-- och sparar i localStorage.
-- ============================================================
create table if not exists public.interaction_responses (
  id uuid primary key default gen_random_uuid(),
  interaction_id uuid not null references public.interactions(id) on delete cascade,
  audience_id text not null check (length(audience_id) between 8 and 64),
  option_index int,
  text text check (text is null or length(text) between 1 and 2000),
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  unique (interaction_id, audience_id)
);

create index if not exists interaction_responses_interaction_idx
  on public.interaction_responses (interaction_id, created_at desc);

-- ============================================================
-- Row Level Security
-- Öppna policies för anon — samma modell som 0001.
-- ============================================================
alter table public.interactions enable row level security;
alter table public.interaction_responses enable row level security;

drop policy if exists "interactions_anon_select" on public.interactions;
create policy "interactions_anon_select"
  on public.interactions for select
  to anon, authenticated
  using (true);

drop policy if exists "interactions_anon_insert" on public.interactions;
create policy "interactions_anon_insert"
  on public.interactions for insert
  to anon, authenticated
  with check (true);

drop policy if exists "interactions_anon_update" on public.interactions;
create policy "interactions_anon_update"
  on public.interactions for update
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "responses_anon_select" on public.interaction_responses;
create policy "responses_anon_select"
  on public.interaction_responses for select
  to anon, authenticated
  using (true);

drop policy if exists "responses_anon_insert" on public.interaction_responses;
create policy "responses_anon_insert"
  on public.interaction_responses for insert
  to anon, authenticated
  with check (true);

drop policy if exists "responses_anon_update" on public.interaction_responses;
create policy "responses_anon_update"
  on public.interaction_responses for update
  to anon, authenticated
  using (true)
  with check (true);

-- ============================================================
-- Realtime
-- ============================================================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'interactions'
  ) then
    execute 'alter publication supabase_realtime add table public.interactions';
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'interaction_responses'
  ) then
    execute 'alter publication supabase_realtime add table public.interaction_responses';
  end if;
end $$;
