-- Run this in Supabase SQL Editor to create tables and RLS.

-- Admin roles: link Supabase Auth users to admin role
create table if not exists public.admin_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'viewer')),
  created_at timestamptz not null default now(),
  unique(user_id)
);

alter table public.admin_roles enable row level security;

drop policy if exists "Service role can manage admin_roles" on public.admin_roles;
create policy "Service role can manage admin_roles"
  on public.admin_roles for all
  using (auth.jwt() ->> 'role' = 'service_role');

drop policy if exists "Users can read own admin role" on public.admin_roles;
-- Only server uses service role; no direct client access to this table for writes
create policy "Users can read own admin role"
  on public.admin_roles for select
  using (auth.uid() = user_id);

-- Shipping zones
create table if not exists public.shipping_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  states text[] not null default '{}',
  base_price_cents integer not null check (base_price_cents >= 0),
  currency text not null default 'USD',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.shipping_zones enable row level security;

drop policy if exists "Service role full access shipping_zones" on public.shipping_zones;
create policy "Service role full access shipping_zones"
  on public.shipping_zones for all
  using (auth.jwt() ->> 'role' = 'service_role');

drop policy if exists "Anonymous read shipping_zones for storefront" on public.shipping_zones;
create policy "Anonymous read shipping_zones for storefront"
  on public.shipping_zones for select
  using (true);

-- State restrictions (blocked states)
create table if not exists public.state_restrictions (
  id uuid primary key default gen_random_uuid(),
  state_code text not null unique,
  reason text,
  created_at timestamptz not null default now()
);

alter table public.state_restrictions enable row level security;

drop policy if exists "Service role full access state_restrictions" on public.state_restrictions;
create policy "Service role full access state_restrictions"
  on public.state_restrictions for all
  using (auth.jwt() ->> 'role' = 'service_role');

drop policy if exists "Anonymous read state_restrictions" on public.state_restrictions;
create policy "Anonymous read state_restrictions"
  on public.state_restrictions for select
  using (true);

-- Heat surcharge rules (e.g. per-zone or global)
create table if not exists public.heat_surcharge_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  zone_id uuid references public.shipping_zones(id) on delete set null,
  surcharge_cents integer not null check (surcharge_cents >= 0),
  applies_to_frozen_only boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.heat_surcharge_rules enable row level security;

drop policy if exists "Service role full access heat_surcharge_rules" on public.heat_surcharge_rules;
create policy "Service role full access heat_surcharge_rules"
  on public.heat_surcharge_rules for all
  using (auth.jwt() ->> 'role' = 'service_role');

drop policy if exists "Anonymous read heat_surcharge_rules" on public.heat_surcharge_rules;
create policy "Anonymous read heat_surcharge_rules"
  on public.heat_surcharge_rules for select
  using (true);

-- Ice pack and insulated packaging fees (global or by zone)
create table if not exists public.packaging_fees (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('ice_pack', 'insulated')),
  zone_id uuid references public.shipping_zones(id) on delete set null,
  fee_cents integer not null check (fee_cents >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.packaging_fees enable row level security;

drop policy if exists "Service role full access packaging_fees" on public.packaging_fees;
create policy "Service role full access packaging_fees"
  on public.packaging_fees for all
  using (auth.jwt() ->> 'role' = 'service_role');

drop policy if exists "Anonymous read packaging_fees" on public.packaging_fees;
create policy "Anonymous read packaging_fees"
  on public.packaging_fees for select
  using (true);

-- Feature flags (optional)
create table if not exists public.feature_flags (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.feature_flags enable row level security;

drop policy if exists "Service role full access feature_flags" on public.feature_flags;
create policy "Service role full access feature_flags"
  on public.feature_flags for all
  using (auth.jwt() ->> 'role' = 'service_role');

-- Order metadata (after Square order + payment)
create table if not exists public.order_metadata (
  id uuid primary key default gen_random_uuid(),
  square_order_id text not null unique,
  square_payment_id text,
  idempotency_key text not null unique,
  email text not null,
  shipping_state text not null,
  shipping_breakdown jsonb,
  amount_total_cents bigint not null,
  currency text not null default 'USD',
  status text not null check (status in ('pending', 'completed', 'payment_failed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists order_metadata_square_order_id on public.order_metadata(square_order_id);
create index if not exists order_metadata_idempotency_key on public.order_metadata(idempotency_key);
create index if not exists order_metadata_created_at on public.order_metadata(created_at desc);

alter table public.order_metadata enable row level security;

drop policy if exists "Service role full access order_metadata" on public.order_metadata;
create policy "Service role full access order_metadata"
  on public.order_metadata for all
  using (auth.jwt() ->> 'role' = 'service_role');

-- Audit logs for admin actions
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  resource_type text,
  resource_id text,
  details jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_created_at on public.audit_logs(created_at desc);

alter table public.audit_logs enable row level security;

drop policy if exists "Service role full access audit_logs" on public.audit_logs;
create policy "Service role full access audit_logs"
  on public.audit_logs for all
  using (auth.jwt() ->> 'role' = 'service_role');

drop policy if exists "Admins can read audit_logs" on public.audit_logs;
create policy "Admins can read audit_logs"
  on public.audit_logs for select
  using (
    exists (
      select 1 from public.admin_roles ar
      where ar.user_id = auth.uid() and ar.role in ('admin', 'viewer')
    )
  );

-- Webhook event log
create table if not exists public.webhook_logs (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  payload jsonb,
  signature_valid boolean not null,
  processed boolean not null default false,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists webhook_logs_created_at on public.webhook_logs(created_at desc);

alter table public.webhook_logs enable row level security;

drop policy if exists "Service role full access webhook_logs" on public.webhook_logs;
create policy "Service role full access webhook_logs"
  on public.webhook_logs for all
  using (auth.jwt() ->> 'role' = 'service_role');

-- Email send log
create table if not exists public.email_logs (
  id uuid primary key default gen_random_uuid(),
  to_email text not null,
  template_type text not null,
  order_metadata_id uuid references public.order_metadata(id) on delete set null,
  status text not null check (status in ('sent', 'failed')),
  provider_message_id text,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists email_logs_created_at on public.email_logs(created_at desc);

alter table public.email_logs enable row level security;

drop policy if exists "Service role full access email_logs" on public.email_logs;
create policy "Service role full access email_logs"
  on public.email_logs for all
  using (auth.jwt() ->> 'role' = 'service_role');

-- Store product settings: display order, out-of-stock, custom image, hidden (admin-managed)
create table if not exists public.store_product_settings (
  variation_id text primary key,
  catalog_item_id text not null,
  display_order integer not null default 0,
  is_out_of_stock boolean not null default false,
  custom_image_url text,
  hidden boolean not null default false,
  updated_at timestamptz not null default now()
);

create index if not exists idx_store_product_settings_display_order
  on public.store_product_settings (display_order);
create index if not exists idx_store_product_settings_catalog_item_id
  on public.store_product_settings (catalog_item_id);

alter table public.store_product_settings enable row level security;

drop policy if exists "Service role full access store_product_settings" on public.store_product_settings;
create policy "Service role full access store_product_settings"
  on public.store_product_settings for all
  using (auth.jwt() ->> 'role' = 'service_role');
