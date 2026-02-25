-- Store product overrides: catalogue page, price, long description
alter table public.store_product_settings
  add column if not exists product_type_override text;

alter table public.store_product_settings
  add column if not exists price_override_cents integer;

alter table public.store_product_settings
  add column if not exists long_description_override text;

comment on column public.store_product_settings.product_type_override is 'Override catalogue tab: ice_cream | merchandise | gift_card';
comment on column public.store_product_settings.price_override_cents is 'Override price in cents when set';
comment on column public.store_product_settings.long_description_override is 'Big product description (overrides productContent / Square)';
