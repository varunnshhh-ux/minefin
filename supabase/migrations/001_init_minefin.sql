-- MINEFIN Database Schema & Row Level Security (RLS)
-- Run this entire script in your Supabase project's SQL Editor.

-- 1. Extensions
create extension if not exists "pgcrypto";

-- 2. Profiles table (linked to auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  currency text not null default 'INR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Trigger to auto-create a profile row when a new user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3. Transactions table
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('income', 'expense')),
  amount numeric(12, 2) not null check (amount > 0),
  category text not null check (char_length(trim(category)) > 0),
  description text not null check (char_length(trim(description)) > 0),
  tx_date date not null,
  import_hash text,
  created_at timestamptz not null default now()
);

create index if not exists idx_transactions_user_date
  on public.transactions (user_id, tx_date desc, created_at desc);

-- Prevent duplicate CSV imports while allowing identical manual purchases (where import_hash is null)
create unique index if not exists idx_transactions_user_import_hash
  on public.transactions (user_id, import_hash)
  where import_hash is not null;

alter table public.transactions enable row level security;

create policy "Users can view own transactions"
  on public.transactions for select
  using (auth.uid() = user_id);

create policy "Users can insert own transactions"
  on public.transactions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own transactions"
  on public.transactions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own transactions"
  on public.transactions for delete
  using (auth.uid() = user_id);

-- 4. Budgets table
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (char_length(trim(category)) > 0),
  monthly_limit numeric(12, 2) not null check (monthly_limit > 0),
  created_at timestamptz not null default now(),
  unique (user_id, category)
);

create index if not exists idx_budgets_user
  on public.budgets (user_id);

alter table public.budgets enable row level security;

create policy "Users can view own budgets"
  on public.budgets for select
  using (auth.uid() = user_id);

create policy "Users can insert own budgets"
  on public.budgets for insert
  with check (auth.uid() = user_id);

create policy "Users can update own budgets"
  on public.budgets for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own budgets"
  on public.budgets for delete
  using (auth.uid() = user_id);

-- 5. Savings Goals table
create table if not exists public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  target_amount numeric(12, 2) not null check (target_amount > 0),
  current_amount numeric(12, 2) not null default 0 check (current_amount >= 0),
  target_date date,
  created_at timestamptz not null default now()
);

create index if not exists idx_savings_goals_user
  on public.savings_goals (user_id, created_at desc);

alter table public.savings_goals enable row level security;

create policy "Users can view own savings goals"
  on public.savings_goals for select
  using (auth.uid() = user_id);

create policy "Users can insert own savings goals"
  on public.savings_goals for insert
  with check (auth.uid() = user_id);

create policy "Users can update own savings goals"
  on public.savings_goals for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own savings goals"
  on public.savings_goals for delete
  using (auth.uid() = user_id);

-- 6. MILO Chat Messages table
create table if not exists public.milo_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_milo_messages_user_created
  on public.milo_messages (user_id, created_at asc);

alter table public.milo_messages enable row level security;

create policy "Users can view own milo messages"
  on public.milo_messages for select
  using (auth.uid() = user_id);

create policy "Users can insert own milo messages"
  on public.milo_messages for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own milo messages"
  on public.milo_messages for delete
  using (auth.uid() = user_id);
