# FlatMatch Real Listings Database — Quick Start

## What's New ✨

Your app now supports a **real persistent database** using Supabase! Listings are no longer lost on page refresh.

### Changes Made:

1. **Installed Supabase client** (`@supabase/supabase-js`)
2. **Created Supabase configuration** (`src/supabaseClient.js`)
3. **Built listings service** (`src/listingsService.js`) — handles all database operations
4. **Updated App.jsx** — now uses Supabase to load, create, and manage listings
5. **Added environment variables setup** (`.env.example`)
6. **Created full setup guide** (`SUPABASE_SETUP.md`)

## Quick Setup (5 minutes)

### 1. Create a Supabase Account
- Go to https://supabase.com → **"Start your project"**
- Create a free project (no credit card needed)
- Wait 2-3 minutes for it to initialize

### 2. Get Your Credentials
- In your Supabase dashboard: **Settings** → **API**
- Copy your **Project URL** and **anon public key**

### 3. Create the Database Table
- Go to **SQL Editor** in your Supabase dashboard
- Click **"New Query"** → Paste the SQL from `SUPABASE_SETUP.md` → Click **Run**
- (The setup guide has the complete SQL for you)

### 4. Configure Your App
```bash
# Create .env.local
cp .env.example .env.local
```

Edit `.env.local` and add your credentials:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anonymous-key-here
```

### 5. Test It
```bash
npm run dev
```

Post a listing → refresh the page → **it's still there!** 🎉

## How It Works

- **Listings Service** (`src/listingsService.js`) is your interface to the database
  - `fetchListings()` — get all active listings
  - `createListing()` — save a new listing
  - `markListingFilled()` — hide a filled listing
  - `renewListing()` — extend listing expiry date
  - `deleteListing()` — permanently remove a listing

- **Automatic Fallback** — if Supabase isn't configured, the app uses browser localStorage so it still works during development

- **Row Level Security** — the setup allows anyone to read/write listings (perfect for an open marketplace)

## What to Do Next

1. **Follow the full setup guide:** Read `SUPABASE_SETUP.md` for detailed instructions
2. **Test thoroughly:** Create listings, refresh, check they persist
3. **Consider authentication:** Later, you may want users to only delete their own listings
4. **Add Stripe integration:** Connect payment processing for the listing fee (currently simulated)

## Architecture

```
App.jsx
  ↓
listingsService.js (your API)
  ↓
supabaseClient.js (Supabase SDK)
  ↓
Supabase Cloud (PostgreSQL database)
```

The service layer means:
- Easy to test
- Can swap backends later if needed
- Automatic localStorage fallback

## Files Changed/Created

- ✅ `src/supabaseClient.js` — Supabase client initialization
- ✅ `src/listingsService.js` — All database operations
- ✅ `src/App.jsx` — Updated to use listingsService
- ✅ `.env.example` — Template for environment variables
- ✅ `SUPABASE_SETUP.md` — Complete setup guide
- ✅ `QUICKSTART.md` — This file

## Questions?

- **Listings still disappearing?** → Check `.env.local` has correct credentials, restart dev server
- **How much does Supabase cost?** → Free tier is generous (2GB storage, no credit card needed)
- **Can I use a different database?** → Yes! The service layer makes it easy to swap backends

---

**Ready to set it up?** → Follow the steps in `SUPABASE_SETUP.md` 🚀
