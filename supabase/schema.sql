-- ============================================================
-- utah-deals schema
-- ============================================================

-- Extensions
create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------
-- Enums
-- ------------------------------------------------------------

create type property_type as enum (
  'Single Family',
  'Multi-Family',
  'Small Apartment'
);

create type change_type as enum (
  'new',
  'price-drop',
  'price-up',
  'status-change'
);

-- ------------------------------------------------------------
-- listings
-- ------------------------------------------------------------

create table if not exists listings (
  id            uuid primary key default uuid_generate_v4(),
  address       text not null,
  city          text not null,
  state         text not null default 'UT',
  type          property_type not null,
  price         numeric(12, 2) not null,
  rent_estimate numeric(10, 2),
  beds          smallint,
  baths         numeric(3, 1),
  sqft          integer,
  year_built    smallint,
  lot_size      numeric(10, 2),        -- sq ft
  garage        boolean default false,
  hoa_monthly   numeric(8, 2) default 0,
  snapshot_tag  text,                  -- e.g. "Price Drop", "New Listing"
  snapshot_note text,
  photos        jsonb default '[]'::jsonb,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- auto-update updated_at
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger listings_updated_at
  before update on listings
  for each row execute procedure set_updated_at();

-- ------------------------------------------------------------
-- snapshots
-- ------------------------------------------------------------

create table if not exists snapshots (
  id            uuid primary key default uuid_generate_v4(),
  listing_id    uuid not null references listings(id) on delete cascade,
  date          date not null default current_date,
  price         numeric(12, 2),
  rent_estimate numeric(10, 2),
  status        text,
  change_type   change_type not null,
  change_delta  numeric(12, 2),        -- dollar or pct delta; sign indicates direction
  created_at    timestamptz not null default now()
);

create index snapshots_listing_id_idx on snapshots(listing_id);

-- ------------------------------------------------------------
-- saved_listings
-- ------------------------------------------------------------

create table if not exists saved_listings (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null,           -- auth.uid()
  listing_id  uuid not null references listings(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (user_id, listing_id)
);

create index saved_listings_user_id_idx on saved_listings(user_id);

-- ------------------------------------------------------------
-- notes
-- ------------------------------------------------------------

create table if not exists notes (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null,           -- auth.uid()
  listing_id  uuid not null references listings(id) on delete cascade,
  body        text not null,
  created_at  timestamptz not null default now()
);

create index notes_listing_id_idx  on notes(listing_id);
create index notes_user_id_idx     on notes(user_id);

-- ============================================================
-- Row-Level Security
-- ============================================================

alter table listings       enable row level security;
alter table snapshots      enable row level security;
alter table saved_listings enable row level security;
alter table notes          enable row level security;

-- listings: public read, no direct write (managed via service role / admin)
create policy "listings_public_read"
  on listings for select
  using (true);

-- snapshots: public read
create policy "snapshots_public_read"
  on snapshots for select
  using (true);

-- saved_listings: users manage only their own rows
create policy "saved_listings_select_own"
  on saved_listings for select
  using (auth.uid() = user_id);

create policy "saved_listings_insert_own"
  on saved_listings for insert
  with check (auth.uid() = user_id);

create policy "saved_listings_delete_own"
  on saved_listings for delete
  using (auth.uid() = user_id);

-- notes: users manage only their own rows
create policy "notes_select_own"
  on notes for select
  using (auth.uid() = user_id);

create policy "notes_insert_own"
  on notes for insert
  with check (auth.uid() = user_id);

create policy "notes_update_own"
  on notes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "notes_delete_own"
  on notes for delete
  using (auth.uid() = user_id);
