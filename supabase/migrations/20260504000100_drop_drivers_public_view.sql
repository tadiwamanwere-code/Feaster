-- ============================================
-- FEASTER — Drop unused drivers_public view
-- ============================================
--
-- Supabase linter flagged drivers_public as CRITICAL because Postgres
-- views run with the CREATOR's privileges by default — bypassing RLS
-- on the underlying drivers table.
--
-- We never used the view from the client (driver info access for
-- customers goes through SECURITY DEFINER RPCs get_driver_for_delivery
-- and get_offers_for_my_delivery, which check caller authorization).
-- So just drop it.
--
-- If you ever need a similar surface in the future, recreate with
--   create view ... with (security_invoker = true) as ...
-- so the view uses the caller's RLS context, not the creator's.
-- ============================================

drop view if exists public.drivers_public;
