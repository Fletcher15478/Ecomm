-- Batch codes are grouped by week (week starts Wednesday). New batch every Wednesday.
alter table public.product_batch_codes
  add column if not exists week_start_date date;

-- Week = Wed–Tue. PostgreSQL dow: 0=Sun, 1=Mon, ..., 4=Wed. Days since Wed = (dow + 3) % 7.
-- So week_start_date = scanned_at::date - ((extract(dow from scanned_at)::int + 3) % 7) days.
update public.product_batch_codes
set week_start_date = ((scanned_at at time zone 'UTC')::date - ((extract(dow from scanned_at at time zone 'UTC')::int + 3) % 7) * interval '1 day')::date
where week_start_date is null;

-- Default for new rows: current week's Wednesday (server also sends explicitly).
alter table public.product_batch_codes
  alter column week_start_date set default (
    ((now() at time zone 'UTC')::date - ((extract(dow from now() at time zone 'UTC')::int + 3) % 7) * interval '1 day')::date
  );

update public.product_batch_codes set week_start_date = (scanned_at at time zone 'UTC')::date where week_start_date is null;
alter table public.product_batch_codes alter column week_start_date set not null;

create index if not exists product_batch_codes_week_start_date
  on public.product_batch_codes (week_start_date desc);
create index if not exists product_batch_codes_catalog_week
  on public.product_batch_codes (catalog_item_id, week_start_date desc);
