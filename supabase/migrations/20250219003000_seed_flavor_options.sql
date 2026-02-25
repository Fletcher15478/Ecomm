-- Seed default flavor options for Pick 4 / Pick 6 (only when table is empty)
do $$
begin
  if not exists (select 1 from public.flavor_options limit 1) then
    insert into public.flavor_options (name, in_stock, featured, seasonal, sort_order) values
      ('Best Chocolate', true, false, false, 0),
      ('Chad''s Vanilla (GF)', true, false, false, 1),
      ('Coffee Break (GF)', true, false, false, 2),
      ('Backyard S''mores', true, false, false, 3),
      ('Cookie Dough', true, false, false, 4),
      ('Cookies ''n'' Cream', true, false, false, 5),
      ('Nutty Pistachio', true, false, false, 6),
      ('Peanut Butter Buckeye', true, false, false, 7),
      ('Dairy-free Mint Chip (GF/V)', true, false, false, 8),
      ('Dairy-free Very Mango (GF/V)', true, false, false, 9);
  end if;
end $$;
