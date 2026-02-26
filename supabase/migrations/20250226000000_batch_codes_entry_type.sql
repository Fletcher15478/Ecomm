-- Add entry type: new case, no new case, loosie, special
alter table public.product_batch_codes
  add column if not exists entry_type text not null default 'loosie';

alter table public.product_batch_codes
  add constraint product_batch_codes_entry_type_check
  check (entry_type in ('new_case', 'no_new_case', 'loosie', 'special'));

comment on column public.product_batch_codes.entry_type is 'How the pint was received: new_case, no_new_case, loosie, special';
