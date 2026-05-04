-- ============================================
-- FEASTER — Actually lock pin_hash (column-level GRANT)
-- ============================================
--
-- Earlier 20260502000300 tried to revoke SELECT (pin_hash) but Supabase's
-- default table-wide GRANT to authenticated/anon shadows column-level
-- revokes. To actually restrict per-column you must revoke the table-wide
-- grant FIRST, then grant only the columns you want.
-- ============================================

-- Drop table-wide grants entirely so column-level grants take effect.
revoke select on customers from anon, authenticated;

-- Grant only the safe columns (everything except pin_hash + pin_set_at).
grant select (
  id, auth_user_id, phone, full_name, email, default_address_id,
  is_active, is_verified, created_at, updated_at
) on customers to authenticated;

-- Anon: nothing readable on customers (they shouldn't be reading customers anyway).
-- (No grants → no access; RLS would have blocked them too, but defence in depth.)

-- Re-grant INSERT/UPDATE/DELETE at table level — RLS still gates rows.
-- pin_hash UPDATE is handled by SECURITY DEFINER set_customer_pin RPC anyway.
grant insert (auth_user_id, phone, full_name, email, is_active, is_verified) on customers to authenticated;
grant update (full_name, email, default_address_id) on customers to authenticated;

-- Verify by querying information_schema after this runs:
--   select column_name from information_schema.column_privileges
--   where table_name='customers' and grantee='authenticated' and privilege_type='SELECT';
-- Should NOT include pin_hash or pin_set_at.
