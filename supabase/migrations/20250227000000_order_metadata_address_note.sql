-- Store customer name, full shipping address, and order note for admin order detail
alter table public.order_metadata
  add column if not exists customer_name text;

alter table public.order_metadata
  add column if not exists shipping_address jsonb;

alter table public.order_metadata
  add column if not exists order_note text;

comment on column public.order_metadata.customer_name is 'First + last name from checkout';
comment on column public.order_metadata.shipping_address is 'Full address: firstName, lastName, addressLine1, locality, administrativeDistrictLevel1, postalCode';
comment on column public.order_metadata.order_note is 'Optional note from customer at checkout';
