# Decibels Audio — Architecture

## 1. What This Is

Decibels Audio Business Management System is an internal web application for **Decibels Audio Systems**, a home-theater/AV integration business. It manages the full sales-to-completion lifecycle: a master catalog of products/services, reusable project templates, customer records, quotations with line items and GST, payment tracking against quotations, project notes, stock movement, employee salary/advance tracking, and reporting. It also generates branded PDF quotations and Excel exports. It is used internally by two roles — Admin and Staff — not by external customers.

## 2. Tech Stack

| Concern | Technology | Notes |
|---|---|---|
| Language | TypeScript | Strict-ish, App Router conventions |
| Framework | **Next.js 16** (App Router) | Note: `AGENTS.md` warns this is a non-standard/pre-release Next.js with breaking API changes vs. training data — check `node_modules/next/dist/docs/` before assuming conventional Next.js behavior |
| Runtime libs | React 19.2, react-dom 19.2 | |
| Database | **PostgreSQL** (Neon serverless-compatible) | Connection via `DATABASE_URL` |
| ORM | **Prisma v7** with `@prisma/adapter-pg` driver adapter | Client generated to `src/generated/prisma/` (not `node_modules`) — this is a Prisma 7-specific pattern |
| Auth | Custom JWT (`jsonwebtoken`) + `bcryptjs` for password hashing | Stored in an httpOnly `auth-token` cookie; NextAuth is a listed dependency (`next-auth@5.0.0-beta.31`) but is **not actually wired up** — no NextAuth provider/route/config found. All auth is hand-rolled in `src/lib/auth.ts` and `src/middleware.ts`. |
| UI | Tailwind CSS v4 + shadcn/ui v4 (built on `@base-ui/react`, not Radix) | Dark theme forced via `dark` class on `<html>` |
| Forms/validation | react-hook-form + `@hookform/resolvers` + `zod` v4 | |
| Tables | `@tanstack/react-table` v8 | |
| Charts | `recharts` v3 | Used in Reports/Dashboard |
| PDF generation | `jsPDF` + `jspdf-autotable` (client-side, `"use client"`) | `src/lib/pdf-generator.ts` and siblings (salary/advance/deduction PDFs) |
| Excel | `exceljs` + `xlsx` + `file-saver` | `src/lib/excel-generator.ts` |
| Toasts | `sonner` | |
| Package manager | npm | `package-lock.json` present |
| Hosting target | **Render** (per `DEPLOY-RENDER.md`) — README also documents a Vercel path | Neon Postgres as the DB in both cases |
| CI/CD | **None found** — no `.github/workflows/`, no other CI config | Deploys are manual/git-push-triggered on the hosting platform |

## 3. Architecture Map

```
src/
├── middleware.ts              # Edge auth gate — checks auth-token cookie on every request
├── app/
│   ├── (auth)/login/          # Public login page
│   ├── (dashboard)/           # Protected pages, wrapped in AppShell (sidebar + content)
│   │   ├── page.tsx           # Dashboard home
│   │   ├── items/             # Master catalog CRUD (Admin only)
│   │   ├── categories/        # Category/SubCategory management (Admin only)
│   │   ├── templates/         # Reusable item bundles (Admin only)
│   │   ├── customers/         # Customer + Dealer records
│   │   ├── quotations/        # Quotation list + [id] detail (line items, payments, notes, status)
│   │   ├── payments/          # Payment tracking across quotations
│   │   ├── employees/         # Employee records
│   │   ├── reports/           # Revenue/analytics (recharts)
│   │   ├── users/             # User management (Admin only)
│   │   ├── help/              # Help ticket system
│   │   └── settings/          # Bank details, app settings
│   └── api/                   # REST endpoints, one route.ts per resource (+ [id] for item ops)
│       ├── auth/{login,logout,me}
│       ├── quotations/, quotations/[id]/{notes,payments,status}
│       ├── items/, items/[id]/stock, items/next-code
│       ├── categories/, subcategories/
│       ├── customers/, dealers/
│       ├── employees/, salaries/, salary-advances/, salary-deductions/
│       ├── payments/[paymentId]
│       ├── divisions/, templates/, users/, help-tickets/, bank-details/, reports/, dashboard/
├── components/
│   ├── ui/                    # shadcn/ui primitives (button, dialog, select, table, etc.)
│   ├── shared/app-shell.tsx   # Sidebar + layout shell for dashboard routes
│   └── line-item-editor.tsx   # Quotation line-item editing widget
├── lib/
│   ├── prisma.ts              # Prisma client singleton (pg adapter, global caching in dev)
│   ├── auth.ts                # hash/verify password, JWT sign/verify, getSession/requireAuth/requireAdmin
│   ├── auth-context.tsx       # Client-side useAuth() hook (calls /api/auth/me)
│   ├── api-helpers.ts         # withAuth() wrapper, jsonResponse/errorResponse, validators (email, mobile, GST, etc.)
│   ├── quotation-calc.ts      # Quotation numbering + total/GST calculations
│   ├── pdf-generator.ts       # Client-side quotation PDF (jsPDF)
│   ├── salary-pdf.ts / advance-pdf.ts / deduction-pdf.ts / pdf-fonts.ts
│   └── excel-generator.ts     # Excel export
└── generated/prisma/          # Prisma-generated client (checked into src/, regenerate via npm run db:generate)
```

There are no separate microservices or packages — this is a single Next.js monolith serving both UI and API routes.

### Domain model (Prisma schema, `prisma/schema.prisma`)

Central entity is **Quotation**, with status flow `DRAFT → SENT → APPROVED → IN_PRODUCTION → COMPLETED → CLOSED`. Related models:
- `QuotationItem` (line items, linked to a catalog `Item` and a `Division`)
- `Payment` (per-quotation payments with mode: CASH/BANK_TRANSFER/UPI/CARD/CHEQUE/OTHER)
- `ProjectNote` (notes/photos on a quotation)
- `StockTransaction` (stock in/out tied to `Item` and optionally a `Quotation`)
- `Customer` (type: CUSTOMER or DEALER)
- Catalog: `Division` → `Category` → `SubCategory` → `Item`
- `Template` / `TemplateItem` (bundles of items for fast quotation creation)
- HR: `Employee`, `Salary`, `SalaryAdvance`, `SalaryDeduction`
- `User` (role: ADMIN/STAFF) — creator of quotations, payments, notes, stock transactions
- `HelpTicket`, `BankDetail`

## 4. Entry Points

- **Main entry**: `src/app/layout.tsx` (root layout) → route groups `(auth)` and `(dashboard)`
- **Run locally**:
  ```bash
  npm install
  cp .env.example .env      # set DATABASE_URL
  npm run db:setup          # generate + push schema + seed
  npm run dev                # http://localhost:3000
  ```
- **Tests**: none exist in this repo (no `*.test.*`/`*.spec.*` files outside `node_modules`, no test runner configured)
- **Build for production**: `npm run build` then `npm run start`
- **Lint**: `npm run lint` (ESLint flat config, `eslint-config-next` core-web-vitals + typescript)

## 5. Environment Variables

From `.env.example`:

| Variable | Purpose | Required | Default |
|---|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string (Neon-compatible) | Yes | none — app throws if missing at Prisma client init |
| `NEXTAUTH_SECRET` | JWT signing secret for auth tokens | Yes | none — `src/lib/auth.ts` throws at import time if unset |
| `NEXTAUTH_URL` | Base URL for auth callbacks | Yes (per example) | `http://localhost:3000` |
| `NEXT_PUBLIC_APP_NAME` | Display name in UI | No | `"Decibels Audio"` |
| `NEXT_PUBLIC_APP_URL` | Public app URL (client-exposed) | No | `http://localhost:3000` |

Despite the `NEXTAUTH_*` naming (a holdover from the unused NextAuth dependency), these are consumed directly by the custom JWT code, not by NextAuth itself.

## 6. Deployment Flow

- No CI/CD pipeline — no GitHub Actions or other automation found.
- **Documented path (`DEPLOY-RENDER.md`)**: push to GitHub → Render Web Service (Node runtime) → build command `npm install && npx prisma generate && npm run build` → start command `npm run start`. Render auto-redeploys on push to the connected branch. Schema push/seed (`npx prisma db push`, `npx tsx prisma/seed.ts`) is a **manual** step run locally or via Render Shell after first deploy.
- **Alternative path (README)**: Vercel + Neon, env vars set in Vercel dashboard, Prisma generates on build automatically.
- Branch strategy: not formally documented; repo currently just uses `master`.

```
Browser  -->  Render/Vercel (Next.js)  -->  Neon (PostgreSQL)
```

## 7. Key Risk Areas

- **No automated tests whatsoever.** Business-critical logic (GST/total calculations in `quotation-calc.ts`, payment balances, stock transactions) has no regression safety net.
- **No CI pipeline.** Lint/build/type errors are only caught locally or at deploy time on Render/Vercel.
- **Dead dependency creating confusion**: `next-auth` is installed and env vars are named `NEXTAUTH_*`, but auth is fully custom (JWT + bcrypt + cookie). A new contributor could easily assume NextAuth is in use and go looking for its config.
- **AGENTS.md warns this Next.js version has non-standard/breaking APIs** vs. what's in general training data — any AI-assisted or unfamiliar-contributor changes to routing/server APIs should verify against `node_modules/next/dist/docs/` rather than assumed Next.js behavior.
- **Data safety constraint (from `CLAUDE.md`)**: Items, Categories, SubCategories, Quotations, and Employees are live production data seeded from a master Excel sheet — no `deleteMany()` or destructive schema pushes (`db push --accept-data-loss`) are permitted without explicit approval.
- **Seed credentials are checked into docs** (`admin@decibels.audio` / `admin123`, `staff@decibels.audio` / `staff123`) — fine for dev/seed, but ensure these are rotated/disabled in any real production deployment.
- **`prisma db push` (no migration history)** is the primary workflow (`db:push`) rather than tracked migrations (`db:migrate`) — schema drift between environments is possible since there's no committed migration log by default.
- **Render free tier spins down after 15 min idle** (per `DEPLOY-RENDER.md`) — cold starts of 30-60s if that tier is used for anything user-facing.
- **Client-side PDF/Excel generation** (jsPDF, exceljs run in the browser) means large quotations or catalogs could be slow/memory-heavy on low-end client devices; no server-side fallback exists.

## 8. Good Starting Points

1. `README.md` — feature overview, stack, setup, role permissions
2. `prisma/schema.prisma` — the full domain model in one file
3. `src/middleware.ts` + `src/lib/auth.ts` + `src/lib/api-helpers.ts` — how auth and API responses work end-to-end
4. `src/app/(dashboard)/quotations/[id]/page.tsx` and `src/app/api/quotations/route.ts` — the central Quotation flow (UI + API) that most other features hang off of
5. `src/lib/quotation-calc.ts` — GST/total/quotation-number logic that most business rules depend on
