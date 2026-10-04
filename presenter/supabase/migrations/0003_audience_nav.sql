-- Audience-navigation: presenter bestämmer om publiken får navigera själv
-- Körs efter 0001 + 0002.
--
-- Två flaggor på sessions:
--   allow_back    — publiken kan gå tillbaka till tidigare slides (default true)
--   allow_forward — publiken kan gå framåt före presentatören (default false)
--
-- Publikvyn följer automatiskt presentatörens current_slide när presentatören
-- byter slide. En "följ live"-knapp visas om publiken avvikit från presentatören.

alter table public.sessions
  add column if not exists allow_back boolean not null default true;

alter table public.sessions
  add column if not exists allow_forward boolean not null default false;
