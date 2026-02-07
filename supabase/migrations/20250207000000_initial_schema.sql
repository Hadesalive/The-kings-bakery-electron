-- Kings Bakery POS - Supabase Schema
-- Mirrors SQLite schema from electron/migrations.js

-- Enable required extensions (Supabase has these by default)
-- Enable UUID if we want to use UUIDs for sync (optional, keeping INTEGER IDs for compatibility)

-- =============================================================================
-- SCHEMA VERSION (for tracking migrations)
-- =============================================================================
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- CORE TABLES (no foreign key dependencies)
-- =============================================================================

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS menu_items (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price DOUBLE PRECISION NOT NULL,
  category TEXT,
  image_path TEXT,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  loyalty_points INTEGER DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  total_spent DOUBLE PRECISION DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_items (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  unit TEXT DEFAULT 'unit',
  current_stock DOUBLE PRECISION DEFAULT 0,
  min_stock DOUBLE PRECISION DEFAULT 0,
  max_stock DOUBLE PRECISION DEFAULT 0,
  cost_per_unit DOUBLE PRECISION DEFAULT 0,
  supplier TEXT,
  category TEXT,
  location TEXT,
  barcode TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS option_groups (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_required BOOLEAN DEFAULT false,
  min_selections INTEGER DEFAULT 1,
  max_selections INTEGER DEFAULT 1,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS options (
  id SERIAL PRIMARY KEY,
  option_group_id INTEGER NOT NULL REFERENCES option_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price_modifier DOUBLE PRECISION DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS addons (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price DOUBLE PRECISION NOT NULL,
  category TEXT,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- USERS & SETTINGS (for auth - local POS users, not Supabase Auth)
-- =============================================================================

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'cashier')),
  full_name TEXT,
  email TEXT,
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  description TEXT,
  category TEXT DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- TABLES (restaurant seating)
-- Create without current_order_id FK (circular dep with orders - add after orders)
-- =============================================================================

CREATE TABLE IF NOT EXISTS tables (
  id SERIAL PRIMARY KEY,
  number TEXT NOT NULL UNIQUE,
  name TEXT,
  capacity INTEGER DEFAULT 4,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'reserved', 'cleaning')),
  current_order_id INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- ORDERS (depends on customers, tables, users)
-- =============================================================================

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL,
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  table_id INTEGER REFERENCES tables(id) ON DELETE SET NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  total_amount DOUBLE PRECISION NOT NULL,
  subtotal DOUBLE PRECISION NOT NULL DEFAULT 0,
  tax_amount DOUBLE PRECISION DEFAULT 0,
  discount_amount DOUBLE PRECISION DEFAULT 0,
  status TEXT DEFAULT 'pending',
  payment_method TEXT,
  payment_status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Add circular FK: tables.current_order_id -> orders (must run after orders exists)
ALTER TABLE tables
  DROP CONSTRAINT IF EXISTS fk_tables_current_order;
ALTER TABLE tables
  ADD CONSTRAINT fk_tables_current_order FOREIGN KEY (current_order_id) REFERENCES orders(id) ON DELETE SET NULL;

-- =============================================================================
-- ORDER ITEMS (depends on orders, menu_items)
-- =============================================================================

CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id INTEGER NOT NULL REFERENCES menu_items(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL,
  price DOUBLE PRECISION NOT NULL,
  subtotal DOUBLE PRECISION NOT NULL,
  notes TEXT
);

-- =============================================================================
-- JUNCTION & LINK TABLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS menu_item_option_groups (
  id SERIAL PRIMARY KEY,
  menu_item_id INTEGER NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  option_group_id INTEGER NOT NULL REFERENCES option_groups(id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,
  UNIQUE(menu_item_id, option_group_id)
);

CREATE TABLE IF NOT EXISTS menu_item_addons (
  id SERIAL PRIMARY KEY,
  menu_item_id INTEGER NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  addon_id INTEGER NOT NULL REFERENCES addons(id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,
  UNIQUE(menu_item_id, addon_id)
);

CREATE TABLE IF NOT EXISTS order_item_options (
  id SERIAL PRIMARY KEY,
  order_item_id INTEGER NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  option_id INTEGER NOT NULL REFERENCES options(id) ON DELETE RESTRICT,
  option_group_id INTEGER NOT NULL REFERENCES option_groups(id) ON DELETE RESTRICT,
  price_modifier DOUBLE PRECISION DEFAULT 0
);

CREATE TABLE IF NOT EXISTS order_item_addons (
  id SERIAL PRIMARY KEY,
  order_item_id INTEGER NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  addon_id INTEGER NOT NULL REFERENCES addons(id) ON DELETE RESTRICT,
  quantity INTEGER DEFAULT 1,
  price DOUBLE PRECISION NOT NULL,
  subtotal DOUBLE PRECISION NOT NULL
);

-- =============================================================================
-- MENU ITEM SIZES & CUSTOM OPTIONS (migration 2)
-- =============================================================================

CREATE TABLE IF NOT EXISTS menu_item_sizes (
  id SERIAL PRIMARY KEY,
  menu_item_id INTEGER NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price DOUBLE PRECISION NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(menu_item_id, name)
);

CREATE TABLE IF NOT EXISTS menu_item_custom_options (
  id SERIAL PRIMARY KEY,
  menu_item_id INTEGER NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price DOUBLE PRECISION NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- INVENTORY & RECIPES
-- =============================================================================

CREATE TABLE IF NOT EXISTS inventory_transactions (
  id SERIAL PRIMARY KEY,
  inventory_item_id INTEGER NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('in', 'out', 'adjustment', 'waste', 'transfer')),
  quantity DOUBLE PRECISION NOT NULL,
  unit_cost DOUBLE PRECISION,
  reference_type TEXT,
  reference_id INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT
);

CREATE TABLE IF NOT EXISTS menu_item_ingredients (
  id SERIAL PRIMARY KEY,
  menu_item_id INTEGER NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  inventory_item_id INTEGER NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
  quantity_required DOUBLE PRECISION NOT NULL,
  unit TEXT,
  UNIQUE(menu_item_id, inventory_item_id)
);

-- =============================================================================
-- ANALYTICS & DISCOUNTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS analytics (
  id SERIAL PRIMARY KEY,
  date TEXT NOT NULL UNIQUE,
  total_revenue DOUBLE PRECISION DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  average_order_value DOUBLE PRECISION DEFAULT 0,
  total_items_sold INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS discounts (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DOUBLE PRECISION NOT NULL,
  min_purchase_amount DOUBLE PRECISION,
  applicable_items TEXT,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_table_id ON orders(table_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_menu_item_id ON order_items(menu_item_id);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_item_id ON inventory_transactions(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_type ON inventory_transactions(transaction_type);

CREATE INDEX IF NOT EXISTS idx_menu_item_ingredients_menu_id ON menu_item_ingredients(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_menu_item_ingredients_inventory_id ON menu_item_ingredients(inventory_item_id);

CREATE INDEX IF NOT EXISTS idx_analytics_date ON analytics(date);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

CREATE INDEX IF NOT EXISTS idx_inventory_items_barcode ON inventory_items(barcode);
CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON inventory_items(category);

CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category);
CREATE INDEX IF NOT EXISTS idx_menu_items_is_available ON menu_items(is_available);

CREATE INDEX IF NOT EXISTS idx_options_group_id ON options(option_group_id);
CREATE INDEX IF NOT EXISTS idx_menu_item_option_groups_menu_id ON menu_item_option_groups(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_menu_item_option_groups_group_id ON menu_item_option_groups(option_group_id);
CREATE INDEX IF NOT EXISTS idx_menu_item_addons_menu_id ON menu_item_addons(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_menu_item_addons_addon_id ON menu_item_addons(addon_id);

CREATE INDEX IF NOT EXISTS idx_order_item_options_order_item_id ON order_item_options(order_item_id);
CREATE INDEX IF NOT EXISTS idx_order_item_addons_order_item_id ON order_item_addons(order_item_id);

CREATE INDEX IF NOT EXISTS idx_menu_item_sizes_menu_id ON menu_item_sizes(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_menu_item_custom_options_menu_id ON menu_item_custom_options(menu_item_id);

CREATE INDEX IF NOT EXISTS idx_tables_number ON tables(number);
CREATE INDEX IF NOT EXISTS idx_tables_status ON tables(status);
CREATE INDEX IF NOT EXISTS idx_tables_current_order_id ON tables(current_order_id);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);
CREATE INDEX IF NOT EXISTS idx_settings_category ON settings(category);

-- =============================================================================
-- SCHEMA VERSION - Mark as migrated (matches SQLite migration version 7)
-- =============================================================================
INSERT INTO schema_version (version) VALUES (7) ON CONFLICT (version) DO NOTHING;
