# Decibels Audio - Business Management System

A production-ready web application for **Decibels Audio Pvt Ltd**, managing home theater construction, quotations, payments, and project lifecycle.

## Features

- **Authentication** — JWT-based login with Admin and Staff roles
- **Master Database** — CRUD for products/services with categories, suppliers, pricing
- **Project Templates** — Reusable configurations (e.g., "Premium 7.2.4 Dolby Atmos Setup")
- **Quotation Management** — Create quotes with item autocomplete, dynamic line items, GST, discounts
- **PDF Generation** — Professional branded quotation PDFs with jsPDF
- **Project Lifecycle** — Status workflow: Draft → Sent → Approved → In Production → Completed → Closed
- **Payment Tracking** — Record payments (Cash, UPI, Bank Transfer, etc.) with running balance
- **Customer Management** — Customer database with search and quotation history
- **Dashboard** — Revenue overview, active projects, outstanding payments
- **Reports** — Monthly revenue, popular items, template usage analytics
- **Responsive Design** — Dark-themed audiophile UI with Tailwind CSS and shadcn/ui

## Tech Stack

- **Framework**: Next.js 16 (App Router, TypeScript)
- **Database**: PostgreSQL (Neon serverless compatible) with Prisma v7 ORM
- **UI**: Tailwind CSS v4 + shadcn/ui v4 (base-ui)
- **Auth**: Custom JWT with httpOnly cookies
- **PDF**: jsPDF + jspdf-autotable

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (local or [Neon](https://neon.tech))

### Setup

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and set your `DATABASE_URL` to a PostgreSQL connection string:
   ```
   DATABASE_URL="postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/decibels?sslmode=require"
   ```

3. **Set up the database:**
   ```bash
   npm run db:generate    # Generate Prisma client
   npm run db:push        # Push schema to database
   npm run db:seed        # Seed with sample data
   ```
   Or all at once:
   ```bash
   npm run db:setup
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000)

### Default Login Credentials

| Role  | Email                  | Password  |
|-------|------------------------|-----------|
| Admin | admin@decibels.audio   | admin123  |
| Staff | staff@decibels.audio   | staff123  |

## Project Structure

```
src/
├── app/
│   ├── (auth)/login/        # Login page
│   ├── (dashboard)/         # Protected pages
│   │   ├── items/           # Master DB management (Admin)
│   │   ├── templates/       # Project templates (Admin)
│   │   ├── customers/       # Customer management
│   │   ├── quotations/      # Quotation CRUD + detail
│   │   ├── payments/        # Payment tracking
│   │   ├── reports/         # Analytics
│   │   └── users/           # User management (Admin)
│   └── api/                 # REST API routes
├── components/
│   ├── ui/                  # shadcn/ui components
│   └── shared/              # App shell, sidebar
├── lib/
│   ├── prisma.ts            # Database client
│   ├── auth.ts              # JWT auth utilities
│   ├── auth-context.tsx     # React auth provider
│   ├── api-helpers.ts       # API response helpers
│   └── pdf-generator.ts     # Quotation PDF generation
└── generated/prisma/        # Prisma generated client
```

## Role Permissions

| Feature            | Admin | Staff |
|--------------------|-------|-------|
| Dashboard          | Yes   | Yes   |
| Quotations CRUD    | Yes   | Yes   |
| Customer CRUD      | Yes   | Yes   |
| Payments           | Yes   | Yes   |
| Reports            | Yes   | Yes   |
| Master DB (Items)  | Yes   | No    |
| Templates          | Yes   | No    |
| User Management    | Yes   | No    |

## Deployment

Deploy to Vercel with a Neon PostgreSQL database:

1. Push to GitHub
2. Import in Vercel
3. Set environment variables (`DATABASE_URL`, `NEXTAUTH_SECRET`)
4. Deploy — Prisma generates on build automatically

## Scripts

| Command           | Description                      |
|-------------------|----------------------------------|
| `npm run dev`     | Start dev server                 |
| `npm run build`   | Production build                 |
| `npm run db:generate` | Generate Prisma client       |
| `npm run db:push` | Push schema to database          |
| `npm run db:seed` | Seed sample data                 |
| `npm run db:setup`| Generate + push + seed           |
| `npm run db:studio`| Open Prisma Studio              |
