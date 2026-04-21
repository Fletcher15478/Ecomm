-- Persist order line items (including flavor choice notes) for admin order history
alter table public.order_metadata
  add column if not exists order_items jsonb;

comment on column public.order_metadata.order_items is 'Array of {name, quantity, price_cents, total_cents, note?} captured at checkout or backfilled from Square';

