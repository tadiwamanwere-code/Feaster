-- ============================================
-- FEASTER — Fix haversine_km double-precision bug
-- ============================================
-- round(double precision, int) does not exist in Postgres; only round(numeric, int).
-- The original haversine returned double from the trig math and round() rejected it.

create or replace function haversine_km(lat1 numeric, lng1 numeric, lat2 numeric, lng2 numeric)
returns numeric
language plpgsql
immutable
as $$
declare
  r numeric := 6371; -- earth radius km
  dlat numeric;
  dlng numeric;
  a numeric;
  km double precision;
begin
  dlat := radians(lat2 - lat1);
  dlng := radians(lng2 - lng1);
  a := sin(dlat/2)^2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlng/2)^2;
  km := r::double precision * 2 * asin(sqrt(a::double precision));
  return round(km::numeric, 2);
end;
$$;
