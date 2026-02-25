You are a senior ecommerce systems architect.

We are building a production-ready custom ecommerce platform using:

Next.js 14 (App Router)

TypeScript (strict mode, no any)

Tailwind CSS

Square Node SDK

Supabase Postgres (free tier)

Hosted on Render

Real payment processing via Square

This is a secure commerce engine handling real money.

Do not oversimplify.

Core System Principles

Square is the source of truth for:

Catalog

Inventory

Pricing

Orders

Payments

Taxes

Customers

Supabase stores:

Shipping zone configuration

State restrictions

Heat surcharge rules

Feature flags

Admin roles

Audit logs

Order metadata

Never duplicate Square inventory or pricing in Supabase.

All Square API calls must occur in secure server routes.

Never expose Square secret keys to the frontend.

Never trust client cart totals. Validate all pricing server-side using Square catalog data.

Required System Areas
1) Public Storefront

Product listing pulled from Square Catalog API

Cart logic

Custom shipping engine

Checkout flow

Secure payment via Square Web Payments SDK

2) Admin Dashboard (Internal Only)

We need a secure admin side for:

Updating inventory (via Square Inventory API)

Updating pricing (via Square Catalog API)

Toggling product availability

Enabling/disabling products

Managing shipping zone config (stored in Supabase)

Viewing order logs

Viewing webhook logs

Admin Requirements:

Secure authentication using Supabase Auth

Role-based access control

Admin routes protected server-side

Audit logging for changes

No direct client-side Square calls

Admin folder structure:

/app/admin
/app/admin/products
/app/admin/shipping
/app/admin/orders
/app/admin/logs

All admin actions must go through secure API routes.

Shipping Engine Requirements

Shipping engine must:

Accept cart items + destination state

Detect frozen vs merch-only

Apply:

Zone pricing

Heat surcharges

Ice pack logic

Insulated packaging fee

State blocking

Pull configuration from Supabase

Return structured breakdown object

Be isolated in /lib/shipping.ts

Be fully testable

Order Flow

Fetch products from Square

User adds items to cart

On checkout:

Backend re-validates cart against Square

Backend calculates shipping

Backend creates Square order

Backend processes payment

Store metadata in Supabase

Trigger confirmation email

Implement idempotency keys.

Email Requirements

Emails must send when:

Order successfully completed

Payment failed

Admin manually updates order status (optional future)

Use a secure transactional email provider (Resend or SendGrid).

Email system must:

Run server-side only

Include order summary

Include shipping breakdown

Log email send status in Supabase

Retry safely if email fails

Create:

/lib/email.ts

Webhook Requirements

Implement webhook endpoint:

Verify Square webhook signature

Handle:

inventory.updated

order.created

payment.updated

Log all webhook events in Supabase

Fail securely if signature invalid

Security Requirements

Strict TypeScript

No any types

Environment variables for all secrets

Supabase Row Level Security enabled

Role-based admin access

Rate limit checkout route

Log payment failures

Verify idempotency

No secret keys exposed to frontend

Performance Requirements

Use Server Components for product listing

Cache catalog fetch with revalidation

Minimize client state

Optimize for Render cold starts

O(n) shipping calculation
