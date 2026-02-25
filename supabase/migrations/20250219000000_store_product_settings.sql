-- Store product display settings: order, out-of-stock, custom image, hide from store.
-- Run this in Supabase SQL Editor if you use Supabase migrations manually.

CREATE TABLE IF NOT EXISTS store_product_settings (
  variation_id text PRIMARY KEY,
  catalog_item_id text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  is_out_of_stock boolean NOT NULL DEFAULT false,
  custom_image_url text,
  hidden boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_store_product_settings_display_order
  ON store_product_settings (display_order);
CREATE INDEX IF NOT EXISTS idx_store_product_settings_catalog_item_id
  ON store_product_settings (catalog_item_id);

COMMENT ON TABLE store_product_settings IS 'Admin overrides for storefront: sort order, out of stock, custom image, hide from store.';
