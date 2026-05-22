# Lab Chemical Inventory — Setup Guide

## Step 1: Install Node.js

Download and install from https://nodejs.org (choose "LTS" version).
After installing, restart Terminal.

## Step 2: Install project dependencies

Open Terminal, then run:

```bash
cd ~/chemical-inventory
npm install
```

## Step 3: Set up Supabase (free database)

1. Go to https://supabase.com and create a free account
2. Click **New Project**, give it a name (e.g. "lab-inventory"), set a database password
3. Once the project loads, go to **SQL Editor** on the left sidebar
4. Paste the entire contents of `schema.sql` and click **Run**
5. Go to **Settings → API** on the left sidebar
6. Copy:
   - **Project URL** (looks like `https://abcdefgh.supabase.co`)
   - **anon public** key (long string starting with `eyJ...`)

## Step 4: Configure environment variables

```bash
cp .env.local.example .env.local
```

Open `.env.local` in any text editor and fill in:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-key...
SITE_PASSWORD=choose-a-password-for-your-lab
AUTH_SECRET=type-any-random-characters-here-like-xk39qmz7
```

## Step 5: Test locally (optional)

```bash
npm run dev
```
Open http://localhost:3000 in your browser.

## Step 6: Deploy to Vercel (free hosting)

1. Install Git: https://git-scm.com/downloads
2. Create a free account at https://github.com
3. Create a free account at https://vercel.com (sign in with GitHub)

Then in Terminal:
```bash
cd ~/chemical-inventory
git init
git add .
git commit -m "Initial commit"
```

4. Go to https://github.com/new, create a new repo called `lab-inventory`
5. Follow the "push an existing repository" instructions GitHub shows you
6. Go to https://vercel.com/new, click **Import** next to your `lab-inventory` repo
7. Before deploying, click **Environment Variables** and add all 4 variables from your `.env.local`
8. Click **Deploy**

Your inventory will be live at a URL like `https://lab-inventory-xyz.vercel.app` — share that with lab members!

## Updating the site later

Any time you push new code to GitHub, Vercel automatically redeploys.

---

## Features

- **Add chemicals** manually with the "+ Add Chemical" button
- **Import from file** — upload any CSV or Excel; columns are auto-matched
- **Import from URL** — in the Add Chemical form, paste a Sigma-Aldrich, Fisher, or ThermoFisher product URL and click "Auto-fill"
- **Export** — download as CSV or Excel from the Export button
- **Sort** — click any column header
- **Filter** — search box + location tabs
- **Expiration warnings** — expired chemicals show in red, expiring within 90 days show in amber
