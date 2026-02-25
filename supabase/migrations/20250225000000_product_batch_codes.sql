-- Batch codes per product (e.g. pint batch codes like 26-037, 25-034)
create table if not exists public.product_batch_codes (
  id uuid primary key default gen_random_uuid(),
  catalog_item_id text not null,
  code text not null,
  scanned_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists product_batch_codes_catalog_item_id
  on public.product_batch_codes (catalog_item_id);
create index if not exists product_batch_codes_scanned_at
  on public.product_batch_codes (scanned_at desc);

alter table public.product_batch_codes enable row level security;

drop policy if exists "Service role full access product_batch_codes" on public.product_batch_codes;
create policy "Service role full access product_batch_codes"
  on public.product_batch_codes for all
  using (auth.jwt() ->> 'role' = 'service_role');
