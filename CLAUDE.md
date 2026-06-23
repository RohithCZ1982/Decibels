# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev              # Start dev server (http://localhost:3000)
npm run build            # Production build
npm run lint             # ESLint (flat config, next core-web-vitals + typescript)

npm run db:generate      # Generate Prisma client to src/generated/prisma/
npm run db:push          # Push schema changes to database (no migration files)
npm run db:migrate       # Create and apply migration files
npm run db:seed          # Seed with sample data (npx tsx prisma/seed.ts)
npm run db:setup         # Generate + push + seed in one command
npm run db:studio        # Open Prisma Studio GUI
```

After changing `prisma/schema.prisma`, run `npm run db:generate` then `npm run db:push` (or `db:migrate` for tracked migrations).

## Architecture

**Next.js 16 App Router** with custom JWT auth (no NextAuth provider — just the secret for signing). PostgreSQL via Prisma v7 with the `@prisma/adapter-pg` driver adapter. Prisma client is generated into `src/generated/prisma/` (not `node_modules`).

### Auth flow

- JWT stored in `auth-token` httpOnly cookie, verified in `src/middleware.ts`
- Server-side: `getSession()` / `requireAuth()` / `requireAdmin()` from `src/lib/auth.ts`
- Client-side: `useAuth()` hook from `src/lib/auth-context.tsx` (calls `/api/auth/me`)
- API routes use `withAuth(handler, requiredRole?)` wrapper from `src/lib/api-helpers.ts`

### Route groups

- `(auth)/login` — public login page
- `(dashboard)/*` — protected pages wrapped in `AppShell` (sidebar + main content)
- `api/*` — REST endpoints, all protected by middleware except `/api/auth/login` and `/api/auth/logout`

### Key domain model

Quotation is the central entity. Flow: **Draft → Sent → Approved → In Production → Completed → Closed**. Quotations have line items (`QuotationItem`), payments (`Payment`), and project notes (`ProjectNote`). Items are catalog products organized by `Category`. Templates are reusable item bundles for quick quotation creation.

### Roles

Two roles: `ADMIN` and `STAFF`. Admin-only features: Items (master DB), Templates, User Management. Both roles can manage Quotations, Customers, Payments, Reports.

### UI stack

Tailwind CSS v4 + shadcn/ui v4 (base-ui). Dark theme forced via `dark` class on `<html>`. Components in `src/components/ui/` (shadcn primitives) and `src/components/shared/` (app-level). Uses `cn()` utility from `src/lib/utils.ts` for class merging.

### PDF generation

Client-side via jsPDF + jspdf-autotable in `src/lib/pdf-generator.ts`. Marked `"use client"`.

### Path alias

`@/*` maps to `./src/*` (configured in tsconfig).

## Environment

Requires `DATABASE_URL` (PostgreSQL connection string) and `NEXTAUTH_SECRET` (JWT signing key). See `.env.example`.

## IMPORTANT: Data Safety

**NEVER clear, delete, or truncate Items, Categories, SubCategories, Quotations, or Employees from the database.** These contain production data imported from the master Excel sheet and live business records. Do not run `clear-all.ts` or any `deleteMany()` on these tables. Schema changes must use `db:push` without `--accept-data-loss` unless explicitly approved by the user.

## Seed credentials

Admin: `admin@decibels.audio` / `admin123` | Staff: `staff@decibels.audio` / `staff123`
