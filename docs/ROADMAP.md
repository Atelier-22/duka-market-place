# Roadmap

## What's in this build (Stage 1 — foundation + core loop)

- Full PostgreSQL schema (every table from the brief)
- Backend: auth, shopping requests, offers, the full order state machine,
  transparent pricing, messages, evidence/receipts, ratings, disputes,
  admin read endpoints — all with real validation and a real Postgres layer
- Payment/storage/location service **abstractions** with working mock
  implementations (clearly marked where a real provider slots in)
- Frontend design system (glass components, tokens, motion) fully built
- Public site: Landing, How It Works, Become a Shopper, Login, Register
- Customer app: Dashboard, Create Request (multi-step), My Requests,
  Request Details w/ offers, Active Order tracker, Messages
- Shopper app: Dashboard, Available Requests, Job Details, guided
  Shopping Workflow, Earnings
- Admin: Dashboard overview + Requests/Orders/Disputes tables

## Stage 2 (next) — polish & remaining screens

- About, FAQ/Help, Settings pages (customer + shopper), full Profile edit
- Shopper verification document upload UI
- Admin: Customers/Shoppers detail views, Fees editor, Locations CRUD,
  Notifications centre, Platform Settings UI
- Payments page (customer-facing history) and Order History page
- Toast/notification centre wired to the `notifications` table
- Empty/loading/error state pass across every list view

## Stage 3 — real integrations

- Swap `PaymentService` mock for MTN MoMo + Airtel Money (requires
  business registration with each provider — not a code problem)
- Swap `LocationService` mock for Google Maps/Mapbox (geocoding + routing)
- Socket.IO for live order-status push and live chat (currently polls)
- Object storage (S3-compatible) for photos/receipts instead of local disk
- SMS/email delivery for notifications (e.g. Africa's Talking for SMS in
  Uganda)

## Stage 4 — scale & hardening

- Rate limiting, request signing, refresh-token rotation
- Background jobs (request expiry, payout batching) via a queue (BullMQ)
- Automated tests (unit for state machine + pricing, integration for API)
- CI/CD, staging environment, structured logging/observability

---

**How to continue this project in follow-up chats:** paste
`docs/ARCHITECTURE.md` plus whichever specific file you want extended, and
ask for that file by path — e.g. "extend
`frontend/src/pages/admin/AdminFees.tsx`" — so the next stage snaps onto
what's already here instead of restarting the design system from scratch.
