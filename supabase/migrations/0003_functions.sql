-- Shikhar — 0003_functions.sql
-- Postgres functions used by the app:
--   - update_streak(p_user_id, p_date, p_completed)  → maintains streak aggregate
--   - insert_note_with_version(...)          → auto-increments version per topic+section
--   - auto_close_stale_sessions()            → cron: marks running sessions auto-closed after 30min no heartbeat

-- ──────────────────────────────────────────────────────────────
-- auto_close_stale_sessions
-- Called by dispatch-reminders Edge Function every 5 min.
-- Marks sessions as auto-closed if running but no heartbeat for 30 minutes.
-- ──────────────────────────────────────────────────────────────

create or replace function public.auto_close_stale_sessions() returns void as $$
begin
  update public.study_sessions
  set status = 'auto-closed',
      ended_at = last_heartbeat_at,
      duration_seconds = extract(epoch from (last_heartbeat_at - started_at))::integer
  where status = 'running'
    and last_heartbeat_at < now() - interval '30 minutes';
end;
$$ language plpgsql security definer;

-- ──────────────────────────────────────────────────────────────
-- set_session_duration
-- Trigger: computes duration_seconds on manual stop (status -> completed).
-- Safety net in addition to API-layer computation.
-- ──────────────────────────────────────────────────────────────

create or replace function public.set_session_duration() returns trigger as $$
begin
  if new.status = 'completed' and new.ended_at is not null then
    new.duration_seconds := extract(epoch from (new.ended_at - new.started_at))::integer;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_set_session_duration
before update on public.study_sessions
for each row execute function public.set_session_duration();

-- ──────────────────────────────────────────────────────────────
-- insert_note_with_version
-- Inserts a new note, auto-incrementing version based on existing notes with
-- the same (user_id, topic, section). Returns the new note's id.
-- Per TRD: regenerating a topic creates a NEW row, never overwrites the old one.
-- Supports full note metadata: word_count, question_count, status, file_naming_key
-- ──────────────────────────────────────────────────────────────

create or replace function public.insert_note_with_version(
  p_user_id uuid,
  p_topic text,
  p_section note_section,
  p_content text,
  p_generated_by llm_provider,
  p_word_count int default 0,
  p_question_count int default 0,
  p_status note_status default 'complete',
  p_file_naming_key text default ''
)
returns uuid as $$
declare
  v_next_version int;
  v_new_id uuid;
begin
  select coalesce(max(version), 0) + 1 into v_next_version
    from public.notes
    where user_id = p_user_id and topic = p_topic and section = p_section;

  insert into public.notes (user_id, topic, section, content, version, generated_by, word_count, question_count, status, file_naming_key)
  values (p_user_id, p_topic, p_section, p_content, v_next_version, p_generated_by, p_word_count, p_question_count, p_status, p_file_naming_key)
  returning id into v_new_id;

  return v_new_id;
end;
$$ language plpgsql security definer;

-- Grant execute to authenticated users
grant execute on function public.auto_close_stale_sessions() to authenticated;
grant execute on function public.insert_note_with_version(uuid, text, note_section, text, llm_provider, int, int, note_status, text) to authenticated;

-- ──────────────────────────────────────────────────────────────
-- pg_cron jobs (requires pg_cron + pg_net extensions)
-- ──────────────────────────────────────────────────────────────

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- Schedule the reminder dispatcher: every 5 minutes
-- Calls the Supabase Edge Function which hits /api/cron/dispatch-reminders
do $$
begin
  if exists (select 1 from cron.job where jobname = 'shikhar-dispatch-reminders') then
    perform cron.unschedule('shikhar-dispatch-reminders');
  end if;
  perform cron.schedule(
    'shikhar-dispatch-reminders',
    '*/5 * * * *',
    $sql$
      select net.http_post(
        url := current_setting('app.functions_url') || '/dispatch-reminders',
        headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', current_setting('app.cron_secret')),
        body := '{}'::jsonb
      );
    $sql$
  );
exception when others then
  -- pg_cron or pg_net not available — skip silently
  null;
end $$;

-- Schedule the news refresh: every Monday at 09:00 IST (03:30 UTC)
do $$
begin
  if exists (select 1 from cron.job where jobname = 'shikhar-refresh-news') then
    perform cron.unschedule('shikhar-refresh-news');
  end if;
  perform cron.schedule(
    'shikhar-refresh-news',
    '30 3 * * 1',  -- Mondays at 03:30 UTC = 09:00 IST
    $sql$
      select net.http_post(
        url := current_setting('app.functions_url') || '/refresh-news',
        headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', current_setting('app.cron_secret')),
        body := '{}'::jsonb
      );
    $sql$
  );
exception when others then
  null;
end $$;

-- Schedule auto_close_stale_sessions: every 5 minutes (runs inline in DB)
do $$
begin
  if exists (select 1 from cron.job where jobname = 'shikhar-auto-close-sessions') then
    perform cron.unschedule('shikhar-auto-close-sessions');
  end if;
  perform cron.schedule(
    'shikhar-auto-close-sessions',
    '*/5 * * * *',
    'select public.auto_close_stale_sessions();'
  );
exception when others then
  null;
end $$;