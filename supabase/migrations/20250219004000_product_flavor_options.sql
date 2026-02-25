-- Per-product flavor list (which flavors appear in Pick 4 / Pick 6 dropdown for this product)
create table if not exists public.product_flavor_options (
  catalog_item_id text not null,
  flavor_name text not null,
  sort_order integer not null default 0,
  primary key (catalog_item_id, flavor_name)
);

alter table public.product_flavor_options enable row level security;

drop policy if exists "Service role full access product_flavor_options" on public.product_flavor_options;
create policy "Service role full access product_flavor_options"
  on public.product_flavor_options for all
  using (auth.jwt() ->> 'role' = 'service_role');

create index if not exists idx_product_flavor_options_catalog
  on public.product_flavor_options (catalog_item_id, sort_order asc);
