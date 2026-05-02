-- ============================================
-- FEASTER — Server-side PIN + Rate Limiting
-- Applies after 20260502000200_critical_security_fixes.sql
-- ============================================
--
-- Goals:
--   1. PIN is exactly 6 digits, hashed server-side (pgcrypto bcrypt).
--   2. pin_hash is NOT readable from the client (column-level revoke).
--   3. PIN verify has hard rate limit: 5 wrong attempts in 15 min => 15 min lockout.
--   4. OTP send is rate-limited per phone + per IP via auth_rate_limits.
-- ============================================

create extension if not exists pgcrypto;

-- ─── 1. Lock pin_hash from client reads ────────────────────────
-- Customers self-read RLS still applies to the row, but column-level
-- SELECT is revoked from authenticated/anon for pin_hash.
revoke select (pin_hash) on customers from anon, authenticated;
revoke select (pin_hash, pin_set_at) on customers from anon, authenticated;

-- (We keep SELECT on the rest of the columns via the existing policy.)
grant select (
  id, auth_user_id, phone, full_name, email, default_address_id,
  is_active, is_verified, created_at, updated_at
) on customers to authenticated;

-- ─── 2. Server-side PIN set + verify with rate limit ───────────

create or replace function set_customer_pin(p_pin text)
returns table (success boolean, error text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_caller uuid;
  v_customer_id uuid;
begin
  v_caller := auth.uid();
  if v_caller is null then return query select false, 'not authenticated'; return; end if;

  if p_pin is null or p_pin !~ '^[0-9]{6}$' then
    return query select false, 'PIN must be exactly 6 digits'; return;
  end if;

  -- Reject obviously weak PINs
  if p_pin in ('000000','111111','222222','333333','444444','555555',
               '666666','777777','888888','999999','123456','654321',
               '012345','543210') then
    return query select false, 'PIN too weak — pick something less obvious'; return;
  end if;

  select id into v_customer_id from customers where auth_user_id = v_caller;
  if v_customer_id is null then return query select false, 'customer profile required'; return; end if;

  update customers set
    pin_hash = crypt(p_pin, gen_salt('bf', 10)),
    pin_set_at = now(),
    updated_at = now()
  where id = v_customer_id;

  -- Reset any failed-attempt counters
  delete from pin_attempts where customer_id = v_customer_id;

  return query select true, null::text;
end;
$$;

revoke all on function set_customer_pin(text) from public, anon;
grant execute on function set_customer_pin(text) to authenticated;

-- Verify PIN: returns success boolean, locks after 5 fails in 15 min.
create or replace function verify_customer_pin(p_pin text)
returns table (success boolean, error text, attempts_remaining integer, locked_until timestamptz)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_caller uuid;
  v_customer_id uuid;
  v_pin_hash text;
  v_window timestamptz := now() - interval '15 minutes';
  v_recent_fails integer;
  v_last_fail timestamptz;
  v_lock_until timestamptz;
  v_match boolean;
begin
  v_caller := auth.uid();
  if v_caller is null then
    return query select false, 'not authenticated', 0, null::timestamptz; return;
  end if;

  select id, pin_hash into v_customer_id, v_pin_hash
  from customers where auth_user_id = v_caller;
  if v_customer_id is null then
    return query select false, 'customer profile required', 0, null::timestamptz; return;
  end if;
  if v_pin_hash is null then
    return query select false, 'PIN not set', 0, null::timestamptz; return;
  end if;

  -- Check lockout: if there have been 5+ failed attempts in last 15 min, lock for 15 more
  select count(*), max(attempted_at)
  into v_recent_fails, v_last_fail
  from pin_attempts
  where customer_id = v_customer_id
    and succeeded = false
    and attempted_at > v_window;

  if v_recent_fails >= 5 then
    v_lock_until := v_last_fail + interval '15 minutes';
    if now() < v_lock_until then
      return query select false, 'too many wrong attempts — try again later', 0, v_lock_until;
      return;
    end if;
  end if;

  -- Format/length check before bcrypt cost
  if p_pin is null or p_pin !~ '^[0-9]{6}$' then
    insert into pin_attempts (customer_id, succeeded) values (v_customer_id, false);
    return query select false, 'PIN must be 6 digits', greatest(0, 5 - (v_recent_fails + 1)), null::timestamptz;
    return;
  end if;

  v_match := crypt(p_pin, v_pin_hash) = v_pin_hash;

  insert into pin_attempts (customer_id, succeeded) values (v_customer_id, v_match);

  if v_match then
    -- Clear failed-attempt history on success
    delete from pin_attempts where customer_id = v_customer_id and succeeded = false;
    return query select true, null::text, 5, null::timestamptz;
  else
    return query select false, 'incorrect PIN', greatest(0, 5 - (v_recent_fails + 1)), null::timestamptz;
  end if;
end;
$$;

revoke all on function verify_customer_pin(text) from public, anon;
grant execute on function verify_customer_pin(text) to authenticated;

-- Convenience: does the caller have a PIN set?
create or replace function customer_has_pin()
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_caller uuid;
  v_has boolean;
begin
  v_caller := auth.uid();
  if v_caller is null then return false; end if;
  select pin_hash is not null into v_has from customers where auth_user_id = v_caller;
  return coalesce(v_has, false);
end;
$$;

revoke all on function customer_has_pin() from public, anon;
grant execute on function customer_has_pin() to authenticated;

-- ─── 3. Auth rate-limit table (OTP sends, future endpoints) ────
create table if not exists auth_rate_limits (
  id uuid default gen_random_uuid() primary key,
  bucket text not null,                 -- 'otp_send', 'otp_verify', etc.
  identifier text not null,             -- phone, IP, or composite
  window_started_at timestamptz default now() not null,
  attempts integer default 1 not null,
  last_attempt_at timestamptz default now() not null,
  unique (bucket, identifier, window_started_at)
);

create index if not exists idx_rate_limits_lookup
  on auth_rate_limits (bucket, identifier, last_attempt_at desc);

-- RLS: nobody can read or write directly; access only through SECURITY DEFINER funcs
alter table auth_rate_limits enable row level security;
-- (no policies = denied to all clients)

-- Bump a rate-limit counter; returns whether the request should be allowed.
-- Default window is 1 hour, max attempts configurable.
create or replace function rate_limit_check(
  p_bucket text,
  p_identifier text,
  p_max_attempts integer default 5,
  p_window_minutes integer default 60
)
returns table (allowed boolean, attempts_in_window integer, retry_after_seconds integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window_start timestamptz := now() - (p_window_minutes || ' minutes')::interval;
  v_total integer;
  v_oldest timestamptz;
  v_retry_secs integer;
begin
  -- Garbage-collect rows older than 24h opportunistically
  delete from auth_rate_limits where last_attempt_at < now() - interval '24 hours';

  select count(*), min(last_attempt_at)
  into v_total, v_oldest
  from auth_rate_limits
  where bucket = p_bucket
    and identifier = p_identifier
    and last_attempt_at > v_window_start;

  if v_total >= p_max_attempts then
    v_retry_secs := greatest(1, extract(epoch from (v_oldest + (p_window_minutes || ' minutes')::interval - now()))::int);
    return query select false, v_total, v_retry_secs;
    return;
  end if;

  insert into auth_rate_limits (bucket, identifier, attempts, last_attempt_at)
  values (p_bucket, p_identifier, 1, now());

  return query select true, v_total + 1, 0;
end;
$$;

revoke all on function rate_limit_check(text, text, integer, integer) from public, anon;
grant execute on function rate_limit_check(text, text, integer, integer) to authenticated;

-- Public helper for unauthenticated OTP-send rate limits (called from client
-- BEFORE Supabase auth.signInWithOtp). Intentionally allows anon.
create or replace function rate_limit_otp_send(p_phone text)
returns table (allowed boolean, retry_after_seconds integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_check record;
begin
  if p_phone is null or p_phone !~ '^\+[1-9][0-9]{6,14}$' then
    return query select false, 0; return;
  end if;
  -- 5 OTP sends per phone per hour
  select * into v_check from rate_limit_check('otp_send_phone', p_phone, 5, 60);
  return query select v_check.allowed, v_check.retry_after_seconds;
end;
$$;

revoke all on function rate_limit_otp_send(text) from public;
grant execute on function rate_limit_otp_send(text) to anon, authenticated;

-- ─── 4. Tighten PIN attempts policy ────────────────────────────
-- pin_attempts already had self-only RLS (set in 20260502000100). The
-- verify_customer_pin RPC writes via SECURITY DEFINER so it bypasses RLS,
-- but to make absolutely sure clients can't tamper with the log we revoke
-- direct INSERT from authenticated.
revoke insert on pin_attempts from authenticated, anon;

-- Ensure SELECT still allowed for self-read so the UI can show "n attempts left"
-- (already covered by existing policy).
