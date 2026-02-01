# Database Schema Documentation

## Overview
The Kings Bakery POS system uses SQLite with a migration-based schema management system.

## Schema Relationships

### Core Entity Relationships

```
customers (1) ──< (many) orders
orders (1) ──< (many) order_items
menu_items (1) ──< (many) order_items
menu_items (1) ──< (many) menu_item_ingredients
inventory_items (1) ──< (many) menu_item_ingredients
inventory_items (1) ──< (many) inventory_transactions
```

### Table Details

#### 1. **customers**
- Stores customer information and loyalty data
- **Relationships:**
  - One-to-Many with `orders` (customer_id)
  - ON DELETE: SET NULL (orders remain if customer deleted)

#### 2. **orders**
- Main order records
- **Relationships:**
  - Many-to-One with `customers` (customer_id) - nullable
  - One-to-Many with `order_items` (order_id)
  - ON DELETE CASCADE for order_items

#### 3. **order_items**
- Line items for each order
- **Relationships:**
  - Many-to-One with `orders` (order_id)
  - Many-to-One with `menu_items` (menu_item_id)
  - ON DELETE CASCADE from orders
  - ON DELETE RESTRICT from menu_items (prevents deletion of items with orders)

#### 4. **menu_items**
- Product catalog
- **Relationships:**
  - One-to-Many with `order_items` (menu_item_id)
  - One-to-Many with `menu_item_ingredients` (menu_item_id)
  - Category stored as TEXT (flexible, can link to categories table later)

#### 5. **categories**
- Menu organization
- **Relationships:**
  - Currently referenced by TEXT in menu_items.category
  - Can be enhanced with foreign key relationship in future migration

#### 6. **inventory_items**
- Stock management
- **Relationships:**
  - One-to-Many with `inventory_transactions` (inventory_item_id)
  - One-to-Many with `menu_item_ingredients` (inventory_item_id)
  - ON DELETE RESTRICT (prevents deletion of items with transactions/recipes)

#### 7. **inventory_transactions**
- Stock change history
- **Relationships:**
  - Many-to-One with `inventory_items` (inventory_item_id)
  - Transaction types: 'in', 'out', 'adjustment', 'waste', 'transfer'
  - Can reference orders, purchases, etc. via reference_type/reference_id

#### 8. **menu_item_ingredients**
- Recipe management (links menu items to inventory)
- **Relationships:**
  - Many-to-One with `menu_items` (menu_item_id)
  - Many-to-One with `inventory_items` (inventory_item_id)
  - UNIQUE constraint on (menu_item_id, inventory_item_id)
  - ON DELETE CASCADE from menu_items
  - ON DELETE RESTRICT from inventory_items

#### 9. **analytics**
- Daily sales summaries
- **Relationships:**
  - Independent table (aggregated data)
  - UNIQUE constraint on date

#### 10. **discounts**
- Promotions and discounts
- **Relationships:**
  - Independent table
  - Referenced by orders.discount_amount (calculated value stored)

## Data Integrity

### Foreign Key Constraints
- All foreign keys properly defined
- ON DELETE behaviors:
  - **CASCADE**: Child records deleted when parent deleted (order_items, menu_item_ingredients)
  - **RESTRICT**: Prevents deletion if child records exist (menu_items, inventory_items)
  - **SET NULL**: Sets foreign key to NULL (orders.customer_id)

### Check Constraints
- `inventory_transactions.transaction_type`: Only allows valid types
- `discounts.discount_type`: Only allows 'percentage' or 'fixed'

### Unique Constraints
- `orders.order_number`: Unique order numbers
- `customers.email`: Indexed for lookups (not enforced unique - multiple customers can share email)
- `inventory_items.barcode`: Unique barcodes
- `analytics.date`: One record per day
- `menu_item_ingredients`: Unique (menu_item_id, inventory_item_id) pairs

## Indexes

### Performance Indexes
- `idx_orders_customer_id`: Fast customer order lookups
- `idx_orders_status`: Filter orders by status
- `idx_orders_created_at`: Sort orders by date
- `idx_orders_order_number`: Fast order number lookups
- `idx_order_items_order_id`: Fast order item retrieval
- `idx_order_items_menu_item_id`: Sales analysis queries
- `idx_inventory_transactions_item_id`: Stock history queries
- `idx_inventory_transactions_type`: Filter by transaction type
- `idx_menu_item_ingredients_menu_id`: Recipe queries
- `idx_analytics_date`: Date range queries
- `idx_customers_email`: Customer lookups
- `idx_customers_phone`: Customer lookups
- `idx_inventory_items_barcode`: Barcode scanning
- `idx_menu_items_category`: Category filtering
- `idx_menu_items_is_available`: Available items filtering

## Migration System

### How It Works
1. Schema version tracked in `schema_version` table
2. Migrations stored in `electron/migrations.js`
3. Each migration has `version`, `up()`, and `down()` functions
4. Migrations run automatically on app startup
5. Only pending migrations are applied

### Adding New Migrations
```javascript
{
  version: 2, // Next version number
  up: (db) => {
    // Add new tables, columns, indexes, etc.
    db.exec(`ALTER TABLE menu_items ADD COLUMN sku TEXT;`);
  },
  down: (db) => {
    // Rollback changes
    db.exec(`ALTER TABLE menu_items DROP COLUMN sku;`);
  }
}
```

## Schema Improvements Made

1. ✅ **Foreign Key Constraints**: All relationships properly defined
2. ✅ **ON DELETE Behaviors**: Appropriate cascade/restrict/set null rules
3. ✅ **Check Constraints**: Data validation at database level
4. ✅ **Unique Constraints**: Prevent duplicate data
5. ✅ **Comprehensive Indexes**: Optimized for common queries
6. ✅ **Migration System**: Version-controlled schema changes
7. ✅ **Foreign Keys Enabled**: `PRAGMA foreign_keys = ON`

## Future Enhancements

- Link `menu_items.category` to `categories.id` via foreign key
- Add soft delete support (is_deleted flag)
- Add audit logging table
- Add user/employee management tables
- Add receipt templates table
- Add tax configuration table

