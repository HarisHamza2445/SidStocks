-- SidStocks database tables.
-- Run this once: Supabase dashboard > SQL Editor > paste > Run.
-- Row-level security makes sure every user only sees their own rows.

create table if not exists watchlist (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  market text not null check (market in ('IN', 'US')),
  ticker text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, market, ticker)
);

create table if not exists trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  market text not null check (market in ('IN', 'US')),
  ticker text not null,
  side text not null check (side in ('Buy', 'Sell')),
  qty integer not null check (qty > 0),
  entry numeric not null check (entry > 0),
  stop numeric not null check (stop > 0),
  setup text,
  status text not null default 'open' check (status in ('open', 'closed')),
  exit numeric,
  pnl numeric,
  r_multiple numeric,
  opened_at timestamptz not null default now(),
  closed_at timestamptz
);

create index if not exists trades_user_market on trades (user_id, market, opened_at desc);

alter table watchlist enable row level security;
alter table trades enable row level security;

drop policy if exists "own watchlist" on watchlist;
create policy "own watchlist" on watchlist
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own trades" on trades;
create policy "own trades" on trades
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Phase 5: notes and manual trades (stop is optional). Safe to run again.
alter table trades add column if not exists notes text;
alter table trades alter column stop drop not null;
