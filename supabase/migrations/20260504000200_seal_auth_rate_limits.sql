-- ============================================
-- FEASTER — Explicit deny policy on auth_rate_limits
-- ============================================
--
-- The table is intentionally sealed off: all access goes through the
-- SECURITY DEFINER funcs rate_limit_check / rate_limit_otp_send.
-- Without an explicit policy, Supabase's linter flags it as
-- "RLS enabled but no policies" — same effective behaviour, but
-- now the intent is recorded in the schema.
-- ============================================

drop policy if exists "Deny all client access" on auth_rate_limits;
create policy "Deny all client access" on auth_rate_limits
  for all
  using (false)
  with check (false);
