# Supabase Setup Guide

## Overview
This guide helps you set up a persistent database for FlatMatch listings using Supabase (free tier). Once configured, all listings will be saved to the cloud and persist across sessions.

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click **"Start your project"** or sign in if you already have an account
3. Create a free project:
   - **Project name:** `flatmatch` (or whatever you prefer)
   - **Database password:** Choose a strong password (you won't need it often)
   - **Region:** Choose the closest region (e.g., Sydney for Australia/NZ)
   - Click **"Create new project"**
4. Wait 2-3 minutes for your project to initialize

## Step 2: Get Your API Keys

1. In your Supabase dashboard, go to **Settings** (bottom left) → **API**
2. Copy these values:
   - **Project URL** (under "Your API URL")
   - **anon public** (under "Project API keys")
3. Keep these handy — you'll need them in a moment

## Step 3: Create the Database Schema

1. In your Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **"New Query"**
3. Paste the following SQL and click **"Run"**:

```sql
-- Create listings table
CREATE TABLE listings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  type text NOT NULL CHECK (type IN ('group', 'solo')),
  people integer NOT NULL,
  spotsNeeded integer NOT NULL,
  suburb text NOT NULL,
  area text NOT NULL,
  distanceKm real,
  budget text NOT NULL,
  moveIn text NOT NULL,
  bio text NOT NULL,
  contact text NOT NULL,
  tags jsonb NOT NULL,
  filled boolean DEFAULT false,
  createdAt timestamp with time zone DEFAULT now(),
  renewedAt timestamp with time zone DEFAULT now(),
  expiresAt timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX idx_listings_filled ON listings(filled);
CREATE INDEX idx_listings_expiresAt ON listings(expiresAt);
CREATE INDEX idx_listings_createdAt ON listings(createdAt DESC);
CREATE INDEX idx_listings_suburb ON listings(suburb);

-- Enable Row Level Security (optional but recommended)
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

-- Create a policy allowing anyone to read listings (no authentication needed)
CREATE POLICY "Enable read access for all users" ON listings
  FOR SELECT USING (true);

-- Create a policy allowing anyone to insert listings (no authentication needed)
CREATE POLICY "Enable insert for all users" ON listings
  FOR INSERT WITH CHECK (true);

-- Create a policy allowing users to update/delete their own listings
-- (This is optional; you can add authentication later if needed)
CREATE POLICY "Enable update for all users" ON listings
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete for all users" ON listings
  FOR DELETE USING (true);
```

4. If you see success messages, you're good! The table is created.

## Step 4: Configure Your App

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Open `.env.local` and add your Supabase credentials:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anonymous-key-here
   ```
   
   Replace `your-project` with your actual project ID and paste the keys you copied earlier.

3. Save the file and restart your dev server:
   ```bash
   npm run dev
   ```

## Step 5: Test It Out

1. Start your app: `npm run dev`
2. Post a new listing
3. Refresh the page — your listing should still be there! ✨
4. Try posting more listings and browsing them

## Fallback: What If Supabase Isn't Configured?

The app is set up to work without Supabase:
- If `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` aren't set, listings use browser localStorage
- Listings persist during your session but disappear on refresh
- This is useful for local development

## Production Notes

### Before deploying:
1. **Generate a new key for production** — go to Settings → API → Click the eye icon next to your anon key
2. Add your production Supabase credentials to your hosting provider's environment variables
3. Consider enabling Row Level Security with proper authentication

### Going live:
- Supabase free tier includes plenty of storage for a student marketplace
- You get 2 GB of database storage, which is more than enough
- No credit card required for the free tier

## Troubleshooting

**"Supabase credentials not configured. Using local storage fallback."**
- Check that `.env.local` exists and has your credentials
- Restart your dev server after adding environment variables
- Verify you copied the keys correctly (no extra spaces)

**Listings still disappearing after refresh**
- Check browser console for errors (F12 → Console tab)
- Verify your Supabase table was created successfully
- Check that Row Level Security policies are enabled

**Can't connect to Supabase**
- Verify your internet connection
- Check that your project URL is correct (no typos)
- Try logging into supabase.com to confirm your project is active

## Next Steps

Once listings are persisting:
1. Add authentication so users can only delete their own listings
2. Add a payment system (Stripe) for the listing fee
3. Monitor Supabase usage in the dashboard
4. Consider adding features like renewal reminders
