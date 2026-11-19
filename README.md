# MINEFIN

A minimal, Minecraft-inspired personal finance assistant built with **React, TypeScript, Vite, Tailwind CSS, Supabase, and Recharts**, featuring **MILO** — a pixel-art emerald mascot and transaction assistant.

## Features

- **Dashboard**: Real-time totals from saved Supabase records (total balance, monthly income/expenses, category breakdown, recent transactions, budget usage, savings progress, and a 6-month income-vs-expense Recharts bar chart).
- **Transactions & CSV Import**: Add, edit, delete, search, and filter income/expense records. Import CSV files (`date,description,category,type,amount`) with a row-by-row preview, validation, explicit confirmation before saving, and duplicate-import prevention without blocking identical manual purchases.
- **Budgets**: Monthly category limits with remaining balance and near/over-limit indicators.
- **Savings Goals**: Target amounts, current saved amounts, progress bars, and optional target dates.
- **MILO AI Assistant**: Persistent Supabase chat history. Natural-language transaction messages (e.g., `"Papa gave me ₹2000 today"`, `"Spent ₹150 on lunch"`) are parsed into a preview and saved only after confirmation. Broader financial questions route through a secure server-side AI adapter (`supabase/functions/milo-chat/index.ts`) that verifies the user's Supabase JWT and reads only their private records.

## 1. Install & Run Locally

```bash
npm install
cp .env.example .env
```

Fill in `.env` with your Supabase credentials (see below), then run:

```bash
npm run dev
```

To create a production build:

```bash
npm run build
```

## 2. Supabase Database & Auth Setup

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** in your Supabase dashboard, paste the contents of `supabase/migrations/001_init_minefin.sql`, and click **Run**.
   - Creates `profiles`, `transactions`, `budgets`, `savings_goals`, and `milo_messages` with foreign keys to `auth.users`, constraints, indexes, and strict Row Level Security (RLS) policies.
3. Enable **Email** authentication under **Authentication → Providers → Email**.
   - If **Confirm email** is enabled, MINEFIN will prompt new users to verify their email before signing in.
4. Copy your **Project URL** and **anon public key** from **Project Settings → API** into `.env`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

## 3. Server-Side MILO AI Adapter (Optional)

Broader financial Q&A uses `supabase/functions/milo-chat/index.ts` so model API keys are never exposed in frontend code.

1. Deploy the Edge Function using the Supabase CLI:
   ```bash
   supabase functions deploy milo-chat
   ```
2. Set your server-side secrets (never prefix these with `VITE_`):
   ```bash
   supabase secrets set AI_PROVIDER=openai AI_API_KEY=your_key_here AI_MODEL=gpt-4o-mini
   ```
   Supported `AI_PROVIDER` values: `openai`, `gemini`, `anthropic`, `openai_compatible` (set `AI_BASE_URL` for compatible endpoints).
3. If `AI_API_KEY` is not configured, MILO still supports natural-language transaction parsing and clearly explains why broader AI Q&A is unavailable.
