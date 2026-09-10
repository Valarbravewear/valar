# VALAR — Brave & Wear — E-commerce v2

This package is a real Supabase-backed storefront starter.

## 1. Create a NEW Supabase project

Do not use the FCA database. Create a separate project for VALAR.

## 2. Run `schema.sql`

Open Supabase → SQL Editor → New query, paste `schema.sql`, and run it.

## 3. Create the admin account

In Supabase Authentication → Users, create a user with:

Email: `mejaalex33@gmail.com','mercydrainagecuthanasia@gmail.com'

Use a strong password and keep it private.

## 4. Configure the website

Open `config.js` and replace:

- `YOUR_SUPABASE_PROJECT_URL`
- `YOUR_SUPABASE_PUBLISHABLE_KEY`

with the values from the VALAR Supabase project.

Only use the publishable/anon browser key. NEVER use a `service_role` key in website files.

## 5. Add products

Open `admin/login.html`, sign in, then use the dashboard to add products.

For now product photos use image URLs. This keeps the first production setup simple. Supabase Storage upload can be added next.

## 6. Real payments

The checkout records the selected payment method and creates an order. It does NOT yet charge Airtel Money, Mpamba or Visa.

Before accepting real money, connect a legitimate Malawi-supported payment gateway and process payment server-side/webhook-side. Never place private payment secrets in frontend JavaScript.

## Included

- Customer storefront
- Supabase product loading
- Product categories
- Cart
- Checkout/order creation
- Supabase orders + order items
- Admin login
- Admin product management
- Admin order dashboard
- Order status updates
- VALAR supplied branding images
- Responsive mobile design
