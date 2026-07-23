-- Logs each Gmail App Password purchase scan for admin debugging: which
-- candidate emails IMAP surfaced, and which subset of those were actually
-- sent to the Anthropic AI for extraction (the rest were already imported).
-- Bodies are included so admins can see exactly what the AI saw, so this
-- table holds full email content - same sensitivity as gmail_app_connections
-- and must only ever be read/written by the service role.
create table if not exists public.email_scan_logs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  scanned_at    timestamptz not null default now(),
  -- Every candidate email IMAP returned this scan, before dedup against
  -- already-imported items: [{ message_id, from, subject, body_text }]
  candidates    jsonb not null default '[]'::jsonb,
  -- The subset of `candidates` actually sent to the AI (fresh, not already
  -- imported): same shape as `candidates`.
  sent_to_ai    jsonb not null default '[]'::jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists email_scan_logs_user_id_idx
  on public.email_scan_logs (user_id, scanned_at desc);

alter table public.email_scan_logs enable row level security;

-- No select/insert/update/delete policies for anon or authenticated: this
-- holds full email content and must only be read/written via the service
-- role (which bypasses RLS), same as gmail_app_connections.app_password.
