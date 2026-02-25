# Ecommerce Platform – Setup & What You Need to Provide

This document lists everything you need to do and provide to run the platform.

---

## 1. Environment variables

Copy `.env.example` to `.env.local` and fill in every value. **Never commit `.env.local`.**

### Square (Developer Dashboard: https://developer.squareup.com)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SQUARE_APPLICATION_ID` | Square application ID (safe to expose) |
| `NEXT_PUBLIC_SQUARE_LOCATION_ID` | Square location ID where orders/payments are taken |
| `SQUARE_ACCESS_TOKEN` | **Secret** – Square access token (sandbox or production) |
| `SQUARE_ENVIRONMENT` | `sandbox` or `production` |
| `NEXT_PUBLIC_SQUARE_ENVIRONMENT` | Same as above (used by Web Payments SDK script) |
| `SQUARE_WEBHOOK_SIGNATURE_KEY` | From Square Webhooks subscription (signature key) |

### Supabase (Project Settings → API)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret** – service role key (bypasses RLS; server only) |

### Email (Resend: https://resend.com)

| Variable | Description |
|----------|-------------|
| `RESEND_API_KEY` | Resend API key |
| `EMAIL_FROM` | Sender address (e.g. `orders@yourdomain.com`) |
| `EMAIL_REPLY_TO` | Optional reply-to address |
| `ORDER_NOTIFY_EMAILS` | Optional comma-separated emails to receive “new order” notifications (default: support@millieshomemade.com) |

**Square sandbox (fake card):** Use card number `4111 1111 1111 1111`, any future expiry, any CVC, any billing details.

### App

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_APP_URL` | Full URL of the app (e.g. `https://yourapp.onrender.com` or `http://localhost:3000`) |

---

## 2. Supabase database

1. In the Supabase project, open **SQL Editor**.
2. Run the entire contents of **`supabase/schema.sql`** once.  
   This creates: `admin_roles`, `shipping_zones`, `state_restrictions`, `heat_surcharge_rules`, `packaging_fees`, `feature_flags`, `order_metadata`, `audit_logs`, `webhook_logs`, `email_logs`, **`store_product_settings`** (for admin store board: order, out-of-stock, custom image, hide), and RLS policies.  
   If you already ran an older `schema.sql` that did not include `store_product_settings`, run **`supabase/migrations/20250219000000_store_product_settings.sql`** instead to add just that table.

3. (Optional, for inventory/merchandising controls) Run **`supabase/migrations/20250219001000_inventory_featured_carousel_sizes.sql`**.  
   This adds:
   - `flavor_options` (Pick 4 / Pick 6 dropdown flavors + out-of-stock)
   - `product_size_options` (per-size stock, e.g. tees)
   - `product_carousel_overrides` (admin-edited carousel URLs)
   - `featured` / `seasonal` flags on `store_product_settings`

---

## 3. First admin user

1. In Supabase **Authentication**, create a user (e.g. sign up once on your app or create user in Supabase dashboard).
2. Copy that user’s **UUID** from Authentication → Users.
3. In **SQL Editor** run:

```sql
insert into public.admin_roles (user_id, role)
values ('PASTE_USER_UUID_HERE', 'admin');
```

Replace `PASTE_USER_UUID_HERE` with the real UUID.  
Then log in at **`/admin/login`** with that user’s email and password.

---

## 4. Square catalog & Web Payments

- **Catalog**: Add items and variations in the Square Dashboard (or via Square API). Each item can have a custom attribute `is_frozen` (string `"true"`) so the shipping engine treats it as frozen.
- **Web Payments**: In Square Developer Dashboard, add your site URL (and Render URL in production) under Web Payments SDK allowed origins.
- **Webhooks**: Create a subscription with notification URL  
  `https://YOUR_APP_URL/api/webhooks/square`  
  and subscribe to at least: `inventory.updated`, `order.created`, `payment.updated`.  
  Set the subscription’s **signature key** in `SQUARE_WEBHOOK_SIGNATURE_KEY`.

---

## 5. Shipping configuration (optional but recommended)

After the schema is applied, configure shipping in **Admin → Shipping** (or via Supabase):

- **Shipping zones**: At least one zone with `states` (e.g. `['CA','NY']`), `base_price_cents`, and optionally one zone with `is_default = true` for states not in any zone.
- **State restrictions**: Add state codes to block (e.g. HI, AK if you don’t ship there).
- **Heat surcharge rules**: Surcharge in cents, optionally scoped to frozen only and/or a zone.
- **Packaging fees**: Rows with `kind` = `ice_pack` or `insulated` and `fee_cents`.

---

## 6. Install and run

```bash
npm install
npm run dev
```

- Storefront: `http://localhost:3000`
- Admin: `http://localhost:3000/admin` (log in at `/admin/login`)

---

## 7. Deploy to Render

- Connect the repo to Render; use a **Web Service**.
- Build: `npm install && npm run build`
- Start: `npm start`
- Add all environment variables from step 1 in Render’s Environment tab.
- Set `NEXT_PUBLIC_APP_URL` to the Render URL (e.g. `https://yourapp.onrender.com`).
- Use the same URL (with `/api/webhooks/square`) as the Square webhook notification URL and the same URL in Square’s Web Payments SDK allowed origins.

---

## Summary checklist

- [ ] `.env.local` created and all variables set (Square, Supabase, Resend, `NEXT_PUBLIC_APP_URL`)
- [ ] `supabase/schema.sql` run in Supabase SQL Editor
- [ ] First admin user created and `admin_roles` row inserted
- [ ] Square catalog has at least one item (and optional `is_frozen` custom attribute)
- [ ] Square Web Payments SDK allowed origins include your app URL
- [ ] Square webhook subscription points to `/api/webhooks/square` and signature key set in env
- [ ] Shipping zones/restrictions/fees configured in Admin or Supabase (optional for testing)
- [ ] On Render: env vars set and `NEXT_PUBLIC_APP_URL` equals the live URL

Once these are done, you can run the app locally and deploy to Render.
