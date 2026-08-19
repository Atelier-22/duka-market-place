# Duka — personal shopping & local marketplace platform (MVP)

A working name — see `frontend/src/config/brand.ts` to rename everything in one place.

Read `docs/ARCHITECTURE.md` first — it explains every major decision (state
machine, transparent pricing, payment/storage abstractions). `docs/ROADMAP.md`
lists exactly what's built vs. what's next.

## Project structure

```
project/
├── frontend/   React + Vite + TypeScript + Tailwind (the glass UI)
├── backend/    Node + Express + TypeScript API
├── database/   PostgreSQL schema.sql + seed.sql
└── docs/       Architecture and roadmap
```

## Prerequisites

- Node.js 20+
- PostgreSQL 14+ running locally (or a connection string to a hosted instance)

## 1. Set up the database

```bash
createdb duka
psql -d duka -f database/schema.sql
psql -d duka -f database/seed.sql
```

## 2. Run the backend

```bash
cd backend
cp .env.example .env    # edit DATABASE_URL if needed
npm install
npm run dev              # http://localhost:4000
```

Health check: `curl http://localhost:4000/health`

## 3. Run the frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev               # http://localhost:5173
```

The Vite dev server proxies `/api` and `/uploads` to `http://localhost:4000`,
so the frontend "just works" against the local backend with no CORS setup
beyond what's already in `backend/.env.example`.

## 4. Try the core loop

1. Go to `http://localhost:5173`, click **Get started**, register as a
   **customer**.
2. Create a shopping request (`/app/requests/new`).
3. Open an incognito window, register as a **shopper**, go to
   **Available requests**, and submit an offer.
4. Back in the customer tab, open the request and accept the offer — this
   creates an order.
5. As the shopper, walk the order through the guided workflow: shopping →
   item found (upload a photo + real price) → the customer approves →
   shopper uploads a receipt → out for delivery → the customer confirms →
   either side marks it completed → the customer rates the shopper.
6. Register a third account and manually flip its role to `admin` in the
   database (`UPDATE users SET role = 'admin' WHERE phone = '...';`) to see
   the admin panel at `/admin`.

## Notes

- Payments are cash-on-delivery / manually confirmed in this MVP — see
  `backend/src/services/payment.service.ts` and
  `docs/ARCHITECTURE.md` section 7 for why, and how a real provider plugs in.
- File uploads are written to `backend/uploads` locally — see
  `backend/src/services/storage.service.ts` for the S3 swap point.
- Every order status change goes through
  `backend/src/utils/orderStateMachine.ts` — there is no code path that sets
  `orders.status` directly outside of it.
