# Architecture — Duka (working name)

## 1. What this is

A two-sided marketplace connecting **customers** who want a physical item
found and delivered, with **shoppers** who go to a market/shop/social seller,
buy it, and deliver it. It is explicitly *not* a product catalogue — the
core object is a **request** ("go find me X"), not a SKU.

## 2. Technology stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React 18 + Vite + TypeScript | Fast dev loop, no framework lock-in, easy to hand to any frontend dev later |
| Styling | Tailwind CSS + custom design tokens | Enables the glassmorphism system as reusable utility classes rather than one-off CSS |
| Backend | Node.js + Express + TypeScript | Same language across the stack, huge ecosystem, easy to find engineers in Uganda/remotely |
| Database | PostgreSQL | Strong relational integrity for money/state — this is not a document-shaped problem |
| Auth | JWT (access + refresh tokens), bcrypt password hashing | Stateless, works cleanly for a mobile app later |
| File storage | Storage abstraction (`StorageService`) — local disk in dev, swappable for S3/Cloudinary/etc. | Product photos, receipts, verification docs need a real object store in production, but we shouldn't block the MVP on picking one |
| Payments | Payment abstraction (`PaymentService`) — cash-on-delivery + manual confirmation in MVP | MTN MoMo / Airtel Money require business licensing/agreements — the code is written so a real provider slots in behind the same interface without touching business logic |
| Maps/geocoding | Location abstraction (`LocationService`) — static lat/lng + haversine distance in MVP | Google Maps/Mapbox can be added later behind the same interface |
| Real-time | Not wired in MVP; architecture reserves `orderId`-scoped rooms for Socket.IO | Order tracking and chat currently poll; swapping to push is additive, not a rewrite |

## 3. The core loop

```
CUSTOMER                         PLATFORM                          SHOPPER
   │                                                                   │
   │ 1. Create shopping request  ─────────────────────────────────►   │
   │    (what/where/budget/delivery)                                  │
   │                                                                   │
   │                              request status = OPEN                │
   │                              visible to shoppers nearby ────────► │ browses Available Requests
   │                                                                   │
   │                                          ◄──────────────────────  │ 2. Accepts or submits offer
   │                              request status = ASSIGNED            │
   │                              order created, status = REQUESTED    │
   │                                                                   │
   │                                          ◄──────────────────────  │ 3. Travels, marks SHOPPING
   │                                          ◄──────────────────────  │ 4. Finds item, uploads photo,
   │                                                                    │    enters real price → ITEM_FOUND
   │  ◄─────────────────────────────────────────────────────────────  │    status = AWAITING_CUSTOMER_APPROVAL
   │ 5. Approves price/photo    ─────────────────────────────────►    │
   │                              status = PURCHASED (shopper buys,     │
   │                                        uploads receipt)            │
   │                                          ◄──────────────────────  │ 6. OUT_FOR_DELIVERY → DELIVERED
   │ 7. Confirms delivery       ─────────────────────────────────►    │
   │                              status = COMPLETED                    │
   │                              earnings released to shopper           │
   │ 8. Rates shopper                                                    │
```

Every arrow above is a guarded transition in
`backend/src/utils/orderStateMachine.ts`. Nothing can jump straight from
`requested` to `completed`, and every transition is recorded in
`order_status_history` for audit/dispute purposes.

## 4. Transparent pricing model

An order's total is always the sum of four explicit, separately-recorded
numbers — never a single opaque "total":

```
item_price_ugx      — what the shopper actually paid at the market (set at ITEM_FOUND)
shopping_fee_ugx     — the shopper's fee for their time/effort
delivery_fee_ugx     — the shopper's fee for delivering it
platform_fee_ugx     — Duka's cut, computed from platform_settings.platform_fee_percentage
──────────────────────
total_amount_ugx
```

The customer sees this exact breakdown before approving a purchase
(`AWAITING_CUSTOMER_APPROVAL`), and the shopper's payout
(`shopper_earnings`) is `shopping_fee_ugx + delivery_fee_ugx`, computed the
same way, from the same row. There is no code path where the shopper's
displayed price and the platform's recorded price can diverge — see
`backend/src/services/pricing.service.ts`.

## 5. "Find it for me" mode

When `sourcing_type = shopper_choice`, the shopper is allowed to submit
*multiple* `order_items` rows (Option 1/2/3, each with its own price and
photo) once they're physically at the market. The customer picks one
(`is_selected = true`); that becomes the order's `item_price_ugx` and the
flow continues exactly as above. This is the same state machine, not a
separate code path — it only changes what happens during `ITEM_FOUND`.

## 6. Social-media sourced items

`shopping_requests.social_seller_url` stores the pasted link as a reference
only. The MVP does **not** scrape TikTok/Instagram/Facebook — the shopper
reads the link themselves and uses it to identify the seller. This keeps
the platform inside each network's terms of service; a real integration
would require each platform's official (and likely paid/partnered) API.

## 7. Why not hold customer money in escrow ourselves

Holding customer funds is a regulated activity in most jurisdictions,
Uganda included. The MVP payment layer supports cash-on-delivery and
manual confirmation only, with a clean `PaymentService` interface so a
licensed provider (MTN MoMo, Airtel Money, a card processor, or a
licensed escrow partner) can be plugged in later **without changing order
logic** — the state machine and pricing model don't care which payment
method was used, only whether `payments.status = 'paid'`.

## 8. Fraud/trust surface

| Risk | Mitigation in this MVP |
|---|---|
| Shopper disappears | `order_status_history` timestamps + admin can force-cancel and reassign |
| Fake receipt/photo | `evidence` table timestamps every upload; admin review queue in disputes |
| Price mismatch | Item price is a required field to progress past `ITEM_FOUND`; customer must explicitly approve before `PURCHASED` |
| Fake delivery confirmation | Delivery requires customer's own confirmation action (`delivered_at` is only set by the customer's transition, not the shopper's) |
| Repeat bad actors | `ratings`, `completion_rate`, `cancelled_jobs` surface on the shopper's public profile and offer cards |
| Disputes | Dedicated `disputes` table + admin resolution workflow, independent of the happy-path state machine |

## 9. What is *not* built in this MVP (see ROADMAP.md)

Real-time WebSocket push, a real payment provider integration, real
geocoding/routing, push notifications, and the full admin analytics suite
are all designed for (interfaces exist) but not implemented — they are
listed explicitly in the roadmap rather than faked.
