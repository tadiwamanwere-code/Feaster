# Feaster — Supabase setup

## 1. Run the base schema (existing)

In Supabase Dashboard → SQL Editor → New Query, paste and run:

```
supabase-setup.sql   (project root)
```

## 2. Run the marketplace extension migration

Then run:

```
supabase/migrations/20260502000000_marketplace_extensions.sql
```

This adds:
- `customers`, `customer_addresses`
- `drivers`, `driver_documents`, `driver_wallets`, `wallet_transactions`
- `deliveries`, `dispatch_offers`, `pricing_config`
- SQL functions: `haversine_km`, `calculate_delivery_fee`, `find_nearby_drivers`, `wallet_transact`, `accept_delivery_offer`, `complete_delivery`
- Tightened RLS policies on customers/drivers/wallets/deliveries/orders
- Storage bucket `driver-docs` (private)
- Realtime subscriptions for `deliveries`, `dispatch_offers`, `driver_wallets`

## 3. Configure Phone Auth

Customer + driver login uses Supabase phone-OTP auth. In the Supabase Dashboard:

1. **Authentication → Providers → Phone**: enable.
2. Choose an SMS provider (Twilio is the default; Supabase routes via your Twilio account).
3. Set the SMS template if desired.

For Zimbabwe, Twilio is the typical choice but Africa's Talking can be used via a custom SMTP/HTTP integration if cost matters.

## 4. Configure Storage policies

The migration creates a private `driver-docs` bucket with RLS that lets authenticated users upload to / read from it. For production, tighten further so each driver can only access their own folder by adding path-based policies (see security review notes).

## 5. Pricing config

Two cities are seeded: `Harare`, `Bulawayo` with default fees:
- base $1.50
- per-km $0.50
- service fee 5%
- min delivery $2.00
- platform commission 15%

Edit via SQL or build a platform-admin UI.

## 6. Customer + Driver routes

After migration, the PWA exposes:

- `/app` — customer (browse, cart, checkout, orders, profile)
- `/app/auth` — customer phone+OTP+PIN login
- `/driver` — driver (jobs, wallet, profile)
- `/driver/auth` — driver phone+OTP login
- `/driver/onboarding` — driver KYC (one-time)

Existing admin (`/admin/:slug`) gains a new **Deliveries** tab.
