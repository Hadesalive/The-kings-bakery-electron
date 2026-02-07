# Supabase Schema for Kings Bakery POS

This folder contains the Supabase/PostgreSQL schema that mirrors the SQLite schema used locally.

## Setup

### Option 1: Supabase Dashboard (SQL Editor)

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** in the dashboard
3. Copy the contents of `migrations/20250207000000_initial_schema.sql`
4. Paste and run the SQL

### Option 2: Supabase CLI

If you have the [Supabase CLI](https://supabase.com/docs/guides/cli) installed:

```bash
supabase init
supabase link --project-ref your-project-ref
supabase db push
```

Or to run migrations manually:

```bash
supabase db reset  # Resets and runs all migrations
```

## Tables Created

| Table | Description |
|-------|-------------|
| `schema_version` | Migration tracking |
| `categories` | Menu categories |
| `menu_items` | Product catalog |
| `customers` | Customer info & loyalty |
| `inventory_items` | Stock items |
| `option_groups` | e.g. Size, Crust Type |
| `options` | e.g. Small, Medium, Large |
| `addons` | e.g. Extra Cheese |
| `users` | POS users (admin/cashier) |
| `settings` | App settings |
| `tables` | Restaurant seating |
| `orders` | Order records |
| `order_items` | Line items |
| `menu_item_option_groups` | Link menu ↔ option groups |
| `menu_item_addons` | Link menu ↔ addons |
| `order_item_options` | Selected options per item |
| `order_item_addons` | Selected addons per item |
| `menu_item_sizes` | Per-item sizes |
| `menu_item_custom_options` | Per-item custom options |
| `inventory_transactions` | Stock movements |
| `menu_item_ingredients` | Recipe/ingredients |
| `analytics` | Daily sales summaries |
| `discounts` | Promotions |

## Cloud Sync (Implemented)

The app includes a full sync implementation (data + menu images). To use it:

1. Run the Supabase schema migration (see above)
2. In the POS app: **Settings → Cloud Sync**
3. Enter your **Supabase Project URL** (e.g. `https://xxxxx.supabase.co`)
4. Enter your **Supabase Service Role Key** (Project Settings → API → `service_role` secret)
5. Click **Test Connection** to verify
6. Use **Push to Cloud** (backup), **Pull from Cloud** (restore), or **Full Sync** (both)

### How Sync Works

| Action | What it does |
|--------|--------------|
| **Push** | Uploads local SQLite data to Supabase (upsert by ID), then **removes rows in Supabase that no longer exist locally** (syncs deletes). Images: uploads referenced files, then **deletes from Storage any images no longer referenced by menu items**. |
| **Pull** | Replaces local data with Supabase data (full replace per table). Images: downloads only files that are missing locally. |
| **Full Sync** | Push first, then Pull (backs up local state, then restores from cloud). |

**Delete sync:** When you delete a menu item (or any record) locally and run **Push**, that delete is now synced: the row is removed from Supabase and, for menu items, the image file is removed from Storage.

**Image Sync:** Menu item images are stored in Supabase Storage (bucket `menu-images`). The bucket is created automatically when you run Test Connection or Push. If creation fails, create it manually—see `supabase/STORAGE_SETUP.md`. Efficient behavior:
- **Push:** Uploads only images that exist locally; dedupes by filename; removes orphaned images from Storage
- **Pull:** Downloads only images that are missing locally (saves egress on free tier)

**Note:** Use the `service_role` key (not anon) for full database and storage access. Keep it secure.

### Build with embedded credentials (internal systems)

To bake sync credentials into the packaged app:

1. Create `.env` in the project root with your Supabase URL and service key (see `.env.example`)
2. Run `npm run electron:build` – credentials are injected into the build and sync works without manual config
3. The generated `electron/sync-config.generated.cjs` is gitignored; do not commit it
