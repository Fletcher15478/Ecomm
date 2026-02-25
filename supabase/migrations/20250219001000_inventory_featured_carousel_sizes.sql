-- Inventory + merchandising controls for storefront:
-- - Featured/Seasonal flags on store_product_settings
-- - Flavor availability for Pick 4 / Pick 6 dropdowns
-- - Carousel image overrides per product
-- - Size availability per product (e.g. tees)

-- 1) Featured / Seasonal flags on store_product_settings
alter table public.store_product_settings
  add column if not exists featured boolean not null default false;

alter table public.store_product_settings
  add column if not exists seasonal boolean not null default false;

-- 2) Flavor options (for multi-pint packs)
create table if not exists public.flavor_options (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  in_stock boolean not null default true,
  featured boolean not null default false,
  seasonal boolean not null default false,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.flavor_options enable row level security;

drop policy if exists "Service role full access flavor_options" on public.flavor_options;
create policy "Service role full access flavor_options"
  on public.flavor_options for all
  using (auth.jwt() ->> 'role' = 'service_role');

create index if not exists idx_flavor_options_sort
  on public.flavor_options (featured desc, seasonal desc, sort_order asc, name asc);

-- 3) Carousel overrides (per Square catalog item id)
create table if not exists public.product_carousel_overrides (
  catalog_item_id text primary key,
  image_urls text[] not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.product_carousel_overrides enable row level security;

drop policy if exists "Service role full access product_carousel_overrides" on public.product_carousel_overrides;
create policy "Service role full access product_carousel_overrides"
  on public.product_carousel_overrides for all
  using (auth.jwt() ->> 'role' = 'service_role');

-- 4) Size options per variation (e.g. tees)
create table if not exists public.product_size_options (
  variation_id text not null,
  size text not null,
  in_stock boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (variation_id, size)
);

alter table public.product_size_options enable row level security;

drop policy if exists "Service role full access product_size_options" on public.product_size_options;
create policy "Service role full access product_size_options"
  on public.product_size_options for all
  using (auth.jwt() ->> 'role' = 'service_role');

create index if not exists idx_product_size_options_variation
  on public.product_size_options (variation_id, in_stock desc, sort_order asc, size asc);

