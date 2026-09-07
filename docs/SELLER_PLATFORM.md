# Duka seller platform

Sellers are the third Duka category, alongside customers (who request things) and shoppers (who fulfil requests). A seller opens a store, publishes products, and receives marketplace orders that customers pay for on delivery.

## Architecture

- **Identity.** A seller is a row in `users` with `role = 'seller'`, exactly like customers and shoppers. Uniqueness is scoped by role, so one phone number can hold a customer, a shopper and a seller account; the sibling accounts link automatically and the account switcher moves between them. `POST /api/seller/enroll` opens a seller account for a signed-in customer or shopper by copying their credentials; `/register?role=seller` creates one from scratch.
- **Isolation.** Everything a seller owns lives in `seller_*` tables that hang off `seller_stores` or `seller_profiles` with `ON DELETE CASCADE`. The backend module in `backend/src/seller/` is the only code that touches those tables. It reaches the rest of Duka through existing services only: the users table, `addresses` (delivery address snapshot at checkout), `notifications`, `user_preferences.notify_store_updates`, uploads, and the admin audit log.
- **Guards.** Private seller routes use `requireAuth` + `requireRole('seller')`, then every handler resolves the caller's own store and checks ownership by `owner_id` or `store_id` in SQL. Suspended sellers can read but not write. Admin seller routes sit under the existing `/api/admin` guard.

## Database (migrations 016 and 017)

| Table | Purpose |
| --- | --- |
| `seller_profiles` | Verification status, suspension |
| `seller_stores` | One store per seller: identity, contact, delivery fee, counters |
| `seller_products` | Products with price, sale price, stock, reserved stock, status, flags, full-text `search_text` |
| `seller_product_images`, `seller_product_variations` | Media and options (each option has its own stock) |
| `seller_inventory_events` | Every stock movement with a reason |
| `seller_orders`, `seller_order_items`, `seller_order_events` | Marketplace orders, one per store per checkout, with price snapshots |
| `seller_followers` | Store follows |
| `seller_store_reviews`, `seller_product_reviews` | Reviews tied to a completed order |
| `seller_promotions`, `seller_promotion_products` | Percentage or fixed discounts |
| `seller_settings` | Notification flags, auto-confirm, payout details |
| `seller_verifications` | Business details and a private document, deleted after the decision |
| `seller_product_views` | Daily view counter for conversion analytics |

`016_seller_role.sql` only adds the enum value; Postgres cannot use a new enum value in the same transaction that creates it, which is why the tables are in `017`.

## Stock

Checkout reserves stock inside a transaction (`stock - reserved >= quantity`, row-locked). Confirming does nothing to stock; completing commits it (`stock -= quantity`, `sales_count += quantity`); cancelling releases it. Variation products track stock per option and keep the product total in sync. Low-stock notifications fire when available stock crosses the product's threshold, at most once every twelve hours per product.

## Pricing

The public price is `min(sale_price ?? price, best live promotion)`, computed on the server in `pricing.ts` at read time and again inside the checkout transaction. Clients never send prices.

## API

Private (`/api/seller`, seller role): `me`, `enroll`, `dashboard`, `store` (POST/PATCH), `products` (CRUD, publish, unpublish, archive, duplicate, inventory history), `inventory` (list, adjust), `orders` (list, detail, status), `customers`, `reviews` (list, reply), `followers`, `analytics?range=`, `forecast`, `promotions` (CRUD), `settings`, `payments`, `verification`.

Public (`/api/marketplace`): `home`, `products`, `products/:id`, `stores`, `stores/:slug`, `search`, `categories`. Signed in: `stores/:slug/follow` (POST/DELETE), `following`, `orders` (checkout, customer or shopper role), `orders/mine`, `orders/:id`, `orders/:id/cancel`, `orders/:id/review`.

Admin (`/api/admin/sellers`): `stats`, list, `:id`, `:id/suspend`, `:id/reactivate`, `verifications`, `verifications/:id/document`, `verifications/:id/decision`, `products`, `products/:id/unpublish|flag|unflag`, `orders`, `stores`. The admin dashboard and search also include sellers.

A marketplace sitemap is served at `GET /sitemap-marketplace.xml` on the API host.

## Frontend routes

Public: `/marketplace`, `/store/:slug`, `/product/:id`, `/cart`, `/checkout`, `/sell`. These render inside whichever shell fits the viewer (public, customer, shopper or seller), so a signed-in customer keeps their navigation while shopping.

Customer: `/app/purchases`, `/app/purchases/:id`, `/app/following`.

Seller (`/seller`): dashboard, `products`, `products/new`, `products/:id/edit`, `orders`, `orders/:id`, `inventory`, `customers`, `store`, `reviews`, `followers`, `analytics`, `forecast`, `promotions`, `payments`, `settings/:section`.

Admin: `/admin/sellers`, `/admin/sellers/:id`, `/admin/seller-products`.

## Notifications

Sellers: new order, customer cancellation, review, follower, low stock, verification decision, product moderated, suspension. Each respects `seller_settings`. Customers: order status changes and, for stores they follow, newly published products (`notify_store_updates`). All use the existing `notifications` table and bell.

## Forecasting

`GET /seller/forecast` is arithmetic, not a model: a weighted average of the last 30 and 7 days of confirmed sales per product, projected forward to give days of stock, a stock-out date and a 30-day restock quantity. The response says so in its `method` field and the page shows it.

## Verification

Sellers submit a business name, an optional registration number and an optional document. Documents are stored in the private `seller-verification` folder, which the public uploads route refuses to serve; admins read them through an authenticated endpoint, and the file is deleted when the decision is made.

## Testing

`npm run test:seller` in `backend/` runs `scripts/seller-probe.cjs`: 84 checks covering registration, store and product lifecycle, publication, public visibility, following and follower notifications, checkout pricing and stock reservation, order transitions and stock commit, reviews and rating aggregates, analytics and forecast, promotions, settings, verification, admin statistics and moderation, suspension, enrolment, and cross-seller, customer, shopper and unauthenticated access attempts. It runs against the configured database and leaves accounts behind; remove them with `node scripts/purge-test-data.cjs --apply`.

## Seed data

`database/seed-sellers.sql` inserts a demo seller (TechHub Electronics) with published products for local development. Do not run it against production.

## Environment

No new variables. Uploads, notifications and storage reuse the existing configuration.
