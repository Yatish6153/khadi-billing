# Khadi GST Billing

GST billing, inventory and reporting web app for a Khadi shop.

| Layer    | Tech                                                        |
| -------- | ----------------------------------------------------------- |
| Frontend | Next.js 15 (App Router), React 19, TypeScript, Tailwind, shadcn/ui |
| Backend  | Node.js, Express 5, TypeScript, Zod                         |
| Database | PostgreSQL + Prisma ORM                                     |
| Auth     | JWT in an httpOnly cookie, bcrypt password hashing          |

## Build status

| Phase | Module          | Status  |
| ----- | --------------- | ------- |
| 1     | Authentication  | Done    |
| 2     | Dashboard       | Done    |
| 3     | Customers       | Done    |
| 4     | Products        | Done    |
| 5     | Billing         | Done    |
| 6     | Reports         | Pending |
| 7     | Settings        | Pending |
| 8     | Deployment      | Pending |

## Local setup

**Requirements:** Node.js 20+ and a PostgreSQL database (Docker, a local install, or a free Supabase/Neon project).

### 1. Database

```bash
docker compose up -d
```

Or create a database elsewhere and copy its connection string.

### 2. Backend (http://localhost:4000)

```bash
cd backend
cp .env.example .env      # then edit DATABASE_URL, JWT_SECRET, ADMIN_* values
npm install
# npm 11+ only: allow Prisma/esbuild setup scripts, then rebuild
npm install-scripts approve prisma @prisma/client @prisma/engines esbuild
npm rebuild
npm run db:migrate -- --name init
npm run db:seed
npm run dev
```

### 3. Frontend (http://localhost:3000)

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Open http://localhost:3000 and sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `backend/.env`.
Change the password straight away from the user menu → **Change password**.

## How auth works

1. `POST /api/auth/login` checks the bcrypt hash and sets a signed JWT in the `kb_token` httpOnly cookie.
2. The browser only talks to the Next.js origin; `next.config.mjs` proxies `/api/*` to Express, so the cookie is first-party.
3. `src/middleware.ts` (frontend) redirects visitors without a cookie to `/login`.
4. `requireAuth` (backend) verifies the JWT on every protected request and checks `tokenVersion`.
   Changing the password bumps `tokenVersion`, which signs out every other device.
5. Login is rate-limited to 10 failed attempts per IP per 15 minutes.

## API (Phase 1)

| Method | Path                        | Auth | Description                          |
| ------ | --------------------------- | ---- | ------------------------------------ |
| GET    | `/api/health`               | —    | Server + DB health check             |
| POST   | `/api/auth/login`           | —    | `{ email, password }` → sets cookie  |
| POST   | `/api/auth/logout`          | —    | Clears cookie                        |
| GET    | `/api/auth/me`              | ✔    | Current user                         |
| POST   | `/api/auth/change-password` | ✔    | `{ currentPassword, newPassword }`   |
| GET    | `/api/dashboard/summary?days=30` | ✔ | Today/month sales, counts, low stock, recent bills, daily trend (7/30/90 days, IST) |
| GET    | `/api/customers?search=&page=&pageSize=&sort=name\|recent` | ✔ | Paginated list with bills count + total purchase |
| POST   | `/api/customers`            | ✔    | Create (name required; mobile unique; GSTIN must match state) |
| GET    | `/api/customers/:id`        | ✔    | Customer + stats (bills, total, last purchase) |
| GET    | `/api/customers/:id/invoices` | ✔  | Purchase history (paginated) |
| PUT    | `/api/customers/:id`        | ✔    | Update (existing bills keep their own copy of details) |
| DELETE | `/api/customers/:id`        | ✔    | Delete; their bills are kept but unlinked |
| GET/POST/PUT/DELETE | `/api/categories[/:id]` | ✔ | Categories with active product counts |
| GET    | `/api/products?search=&categoryId=&stock=all\|low\|out&status=&sort=` | ✔ | Paginated product list |
| GET    | `/api/products/stock-summary` | ✔  | Stock value at cost / selling, low & out counts |
| POST   | `/api/products`             | ✔    | Create (blank SKU → KH-0001; opening stock → ledger) |
| PUT    | `/api/products/:id`         | ✔    | Update (stock is not editable here) |
| DELETE | `/api/products/:id`         | ✔    | Deletes, or deactivates if the product is on any bill |
| POST/DELETE | `/api/products/:id/image` | ✔  | Upload (JPG/PNG/WebP, 2 MB) / remove photo |
| POST   | `/api/products/:id/stock`   | ✔    | `{ mode: add\|remove\|set, quantity, note }` → ledger entry |
| GET    | `/api/products/:id/stock-movements` | ✔ | Stock history |

| GET    | `/api/settings`             | ✔    | Shop details, next bill number, default % Less / GST |
| GET    | `/api/invoices?search=&from=&to=&customerId=&paymentMode=` | ✔ | Bill history + `totalAmount` |
| GET    | `/api/invoices/lookup?q=`   | ✔    | Item suggestions: products (with stock) + names used on earlier bills |
| POST   | `/api/invoices`             | ✔    | Create bill; totals computed on the server; stock reduced |
| GET    | `/api/invoices/:id`         | ✔    | Bill with items |
| PUT    | `/api/invoices/:id`         | ✔    | Edit bill (old stock returned, new stock taken) |
| DELETE | `/api/invoices/:id`         | ✔    | Soft-delete; stock returned |

### Bill maths (same as the shop's Excel bill)

रकम = मीटर/Ft. (or नग when no length) × दर → Total = Σ रकम → "X% Less" = Total × X% → **Total Net Pay** = Total − Less.
Rates include GST; the GST inside each line is stored (CGST+SGST, or IGST for other-state customers) for the GST report,
but not printed, matching the existing bill. See `docs/invoice-format.md`.

## Local database (Prisma Dev)

On this machine the database is Prisma's built-in local Postgres (`npx prisma dev --name khadi`).
It can pick a different port each time it starts, so `Start Khadi Billing.bat` reads the address it
reports and passes it to the backend as `DATABASE_URL` (overriding `.env`). Always start the app with that file.
