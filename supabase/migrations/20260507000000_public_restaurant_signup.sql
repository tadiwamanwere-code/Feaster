-- ─────────────────────────────────────────────────────────────────────
-- FEASTER — Public restaurant signup RPC
--
-- Problem: RestaurantSignup page is a public form (anon). The RLS policy
-- on `restaurants` only lets `is_platform_admin()` insert, so signups
-- fail with "new row violates row-level security policy".
--
-- Fix: a SECURITY DEFINER RPC that:
--   1. Is callable by anon (the new restaurant owner has no account yet)
--   2. Rate-limits by WhatsApp number (1 signup attempt / hour)
--   3. Validates inputs (slug shape, name length, etc.)
--   4. Rejects duplicate slugs explicitly
--   5. Inserts a minimally-trusted row — only the columns the form sends
-- ─────────────────────────────────────────────────────────────────────

create or replace function public.signup_restaurant(
  p_name text,
  p_slug text,
  p_city text,
  p_cuisine_type text,
  p_whatsapp_number text,
  p_kitchen_pin text,
  p_opening_hours jsonb default null,
  p_payment_methods text[] default array['cash','ecocash'],
  p_subscription_tier text default 'pro',
  p_table_count integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_slug text := lower(trim(p_slug));
  v_phone_norm text := regexp_replace(coalesce(p_whatsapp_number,''), '\D', '', 'g');
  v_rl record;
begin
  -- ── Input validation ──────────────────────────────────────────────
  if coalesce(trim(p_name),'') = '' or length(trim(p_name)) < 2 then
    raise exception 'Restaurant name is required' using errcode = '22023';
  end if;

  if v_slug !~ '^[a-z0-9][a-z0-9-]{2,39}$' then
    raise exception 'Invalid URL handle' using errcode = '22023';
  end if;

  if length(v_phone_norm) < 9 then
    raise exception 'Valid WhatsApp number required' using errcode = '22023';
  end if;

  if p_kitchen_pin !~ '^[0-9]{4,6}$' then
    raise exception 'Kitchen PIN must be 4–6 digits' using errcode = '22023';
  end if;

  -- ── Rate limit by WhatsApp number: 3 attempts / hour ─────────────
  select * into v_rl
  from rate_limit_check(
    'restaurant_signup',
    v_phone_norm,
    3,    -- max 3 attempts
    60    -- per 60 minutes
  );

  if not v_rl.allowed then
    raise exception 'Too many signup attempts. Try again in % seconds.', v_rl.retry_after_seconds
      using errcode = 'P0001';
  end if;

  -- ── Slug uniqueness ──────────────────────────────────────────────
  if exists (select 1 from restaurants where slug = v_slug) then
    raise exception 'That URL handle is already taken' using errcode = '23505';
  end if;

  -- ── Insert ───────────────────────────────────────────────────────
  insert into restaurants (
    name,
    slug,
    city,
    cuisine_type,
    whatsapp_number,
    kitchen_pin,
    opening_hours,
    payment_methods,
    subscription_tier,
    table_count,
    is_active
  )
  values (
    trim(p_name),
    v_slug,
    p_city,
    p_cuisine_type,
    trim(p_whatsapp_number),
    p_kitchen_pin,
    coalesce(p_opening_hours, jsonb_build_object(
      'mon','11:00-22:00','tue','11:00-22:00','wed','11:00-22:00',
      'thu','11:00-22:00','fri','11:00-23:00','sat','11:00-23:00',
      'sun','12:00-21:00'
    )),
    p_payment_methods,
    coalesce(p_subscription_tier, 'pro'),
    coalesce(p_table_count, 0),
    true
  )
  returning id into v_id;

  return jsonb_build_object(
    'id',   v_id,
    'slug', v_slug
  );
end;
$$;

-- Anon must be able to call this — that's the whole point.
revoke all on function public.signup_restaurant(
  text, text, text, text, text, text, jsonb, text[], text, integer
) from public;
grant execute on function public.signup_restaurant(
  text, text, text, text, text, text, jsonb, text[], text, integer
) to anon, authenticated;
