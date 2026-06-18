# Deploying Decibels Audio on Render

Step-by-step guide to host this application on [Render](https://render.com) with Neon PostgreSQL.

---

## Prerequisites

- A [Render](https://render.com) account (free tier works)
- A [Neon](https://neon.tech) PostgreSQL database (already set up)
- This repository pushed to GitHub or GitLab

---

## Step 1: Push Code to GitHub

If not already done, create a GitHub repository and push the code.

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/decibels-app.git
git branch -M main
git push -u origin main
```

---

## Step 2: Create a Web Service on Render

1. Log in to [Render Dashboard](https://dashboard.render.com)
2. Click **New** > **Web Service**
3. Connect your GitHub account if not already connected
4. Select your **decibels-app** repository
5. Configure the service:

| Setting          | Value                        |
|------------------|------------------------------|
| **Name**         | `decibels-audio`             |
| **Region**       | Singapore (closest to India) |
| **Branch**       | `main`                       |
| **Runtime**      | `Node`                       |
| **Build Command**| `npm install && npx prisma generate && npm run build` |
| **Start Command**| `npm run start`              |
| **Instance Type**| Free (or Starter $7/month)   |

---

## Step 3: Set Environment Variables

In the Render service settings, go to **Environment** tab and add these variables:

| Key                  | Value                                                             |
|----------------------|-------------------------------------------------------------------|
| `DATABASE_URL`       | `postgresql://neondb_owner:YOUR_PASSWORD@ep-xxx.neon.tech/decibels_db?sslmode=require` |
| `NEXTAUTH_SECRET`    | Generate one: run `openssl rand -base64 32` in your terminal      |
| `NEXTAUTH_URL`       | `https://decibels-audio.onrender.com` (your Render URL)           |
| `NEXT_PUBLIC_APP_URL`| `https://decibels-audio.onrender.com`                             |

> Replace the `DATABASE_URL` with your actual Neon connection string.
> Replace `decibels-audio.onrender.com` with your actual Render URL after deployment.
> Do NOT set `NODE_ENV` manually — Render sets it automatically. Setting it to `production` before the build will skip devDependencies and break the build.

---

## Step 4: Deploy

1. Click **Create Web Service**
2. Render will automatically:
   - Install dependencies (`npm install`)
   - Generate Prisma client (`npx prisma generate`)
   - Build the Next.js app (`npm run build`)
   - Start the server (`npm run start`)
3. Wait for the build to complete (first build takes 3-5 minutes)
4. Once deployed, you'll see a green **Live** status

---

## Step 5: Set Up the Database

After the first deployment, you need to push the schema and seed data. You can do this from your local machine since the database is on Neon (accessible from anywhere).

### Option A: From Your Local Machine

Make sure your local `.env` has the same Neon `DATABASE_URL`, then run:

```bash
npx prisma db push
npx tsx prisma/seed.ts
```

### Option B: From Render Shell

1. Go to your Render service dashboard
2. Click **Shell** tab (available on paid plans)
3. Run:

```bash
npx prisma db push
npx tsx prisma/seed.ts
```

---

## Step 6: Verify

1. Open your Render URL: `https://decibels-audio.onrender.com`
2. You should see the login page
3. Log in with:
   - **Admin**: `admin@decibels.audio` / `admin123`
   - **Staff**: `staff@decibels.audio` / `staff123`

---

## Custom Domain (Optional)

1. Go to your Render service > **Settings** > **Custom Domains**
2. Click **Add Custom Domain**
3. Enter your domain: `app.decibels.audio`
4. Render will show DNS records to add
5. Go to your domain registrar and add the CNAME record:
   - **Type**: CNAME
   - **Name**: `app` (or your subdomain)
   - **Value**: `decibels-audio.onrender.com`
6. Wait for DNS propagation (5-30 minutes)
7. Render will automatically provision an SSL certificate
8. Update `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` environment variables to your custom domain

---

## Troubleshooting

### Build Fails with Prisma Error

Make sure the build command includes `npx prisma generate`:

```
npm install && npx prisma generate && npm run build
```

### Application Shows 500 Error

- Check that `DATABASE_URL` is set correctly in Render environment variables
- Verify the Neon database is accessible (not paused)
- Check Render logs: go to your service > **Logs** tab

### Login Not Working

- Make sure you ran the seed script (`npx tsx prisma/seed.ts`)
- Verify `NEXTAUTH_SECRET` is set in Render environment variables

### Free Tier Spin Down

Render free tier services spin down after 15 minutes of inactivity. The first request after spin-down takes 30-60 seconds. For production use, upgrade to the Starter plan ($7/month) for always-on.

---

## Updating the Application

After pushing changes to GitHub:

1. Render will automatically detect the push and rebuild
2. Or manually trigger a deploy: go to your service > click **Manual Deploy** > **Deploy latest commit**

---

## Architecture

```
Browser  -->  Render (Next.js)  -->  Neon (PostgreSQL)
                 |
              Port 3000
              (auto-assigned by Render)
```

Render handles SSL, load balancing, and process management automatically.
