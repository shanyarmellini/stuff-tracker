-- Track whether the user has consented to AI scanning of their connected
-- Gmail account for purchase history. The sync route must check this before
-- ever reading email content.
alter table public.profiles
  add column if not exists email_scan_consent boolean not null default false,
  add column if not exists email_scan_consent_at timestamptz;
