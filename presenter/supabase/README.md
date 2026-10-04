# Supabase-schema för publikläge

Kör migreringar i Supabase Studio → SQL Editor → Kör `0001_audience_mode.sql`.

## Tabeller

- **`sessions`** — aktiva publiksessioner. En rad per föreläsningstillfälle där publikläge är igång. `code` är den 6-siffriga koden publiken skriver in.
- **`audience_questions`** — frågor från publiken.

## Realtime

Båda tabellerna är med i `supabase_realtime`-publiceringen. Klienterna lyssnar på `postgres_changes` för att få live-uppdateringar.

## RLS

Helt öppna policyer för `anon`. Säkerheten ligger i att sessionskoden är svår att gissa (en miljon kombinationer) + 24h expiry. När vi inför autentisering byter vi policyerna mot presenter-ägda sessions.

## Housekeeping

Avaktivera gamla sessioner och rensa frågor en gång per dygn:

```sql
update public.sessions set active = false where expires_at < now();
delete from public.sessions where expires_at < now() - interval '30 days';
```

Kan läggas som Supabase Scheduled Function senare.
