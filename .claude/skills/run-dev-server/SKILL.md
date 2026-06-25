---
description: Launch the Decibels Next.js dev server locally and verify it's running
---

# Run Dev Server

## Prerequisites
- Node.js installed
- `.env` file with `DATABASE_URL` and `NEXTAUTH_SECRET` configured (see `.env.example`)
- Dependencies installed (`npm install`)

## Steps

1. Start the dev server in the background:
   ```bash
   npm run dev
   ```

2. Wait ~10 seconds for Turbopack to compile, then verify the server responds:
   ```bash
   curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/auth/me
   ```
   Expected: HTTP 401 (no session — confirms the server is up and auth middleware is working).

3. The app is available at:
   - **Local:** http://localhost:3000
   - **Network:** http://192.168.64.2:3000

## Test credentials
- Admin: `admin@decibels.audio` / `admin123`
- Staff: `staff@decibels.audio` / `staff123`

## Notes
- Next.js 16 with Turbopack — cold start is under 2 seconds
- The middleware deprecation warning about "proxy" is cosmetic and does not affect functionality
