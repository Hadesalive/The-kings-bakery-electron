// Database migration system
// Each migration exports: version, up, down

export const migrations = [
  {
    version: 1,
    up: (db) => {
      // Check if orders table exists and has customer_id column
      // If not, add it before creating indexes
      try {
        const tableInfo = db.prepare("PRAGMA table_info(orders)").all();
        const hasCustomerId = tableInfo.some(col => col.name === 'customer_id');
        
        if (tableInfo.length > 0 && !hasCustomerId) {
          // Table exists but doesn't have customer_id column, add it
          db.exec(`ALTER TABLE orders ADD COLUMN customer_id INTEGER;`);
        }
      } catch (error) {
        // Table doesn't exist yet, that's fine - it will be created with customer_id
      }
      
      // Check if menu_items table exists and has updated_at column
      // If not, add it
      try {
        const menuItemsInfo = db.prepare("PRAGMA table_info(menu_items)").all();
        const hasUpdatedAt = menuItemsInfo.some(col => col.name === 'updated_at');
        
        if (menuItemsInfo.length > 0 && !hasUpdatedAt) {
          // Table exists but doesn't have updated_at column, add it
          db.exec(`ALTER TABLE menu_items ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP;`);
        }
      } catch (error) {
        // Table doesn't exist yet, that's fine - it will be created with updated_at
      }
      
      // Initial schema
      db.exec(`
        -- Schema version tracking
        CREATE TABLE IF NOT EXISTS schema_version (
          version INTEGER PRIMARY KEY,
          applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Menu Items
        CREATE TABLE IF NOT EXISTS menu_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          price REAL NOT NULL,
          category TEXT,
          image_path TEXT,
          is_available INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Categories for organizing menu items
        CREATE TABLE IF NOT EXISTS categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          description TEXT,
          display_order INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Customers
        CREATE TABLE IF NOT EXISTS customers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT,
          phone TEXT,
          address TEXT,
          loyalty_points INTEGER DEFAULT 0,
          total_orders INTEGER DEFAULT 0,
          total_spent REAL DEFAULT 0,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Orders
        CREATE TABLE IF NOT EXISTS orders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_number TEXT UNIQUE NOT NULL,
          customer_id INTEGER,
          total_amount REAL NOT NULL,
          subtotal REAL NOT NULL,
          tax_amount REAL DEFAULT 0,
          discount_amount REAL DEFAULT 0,
          status TEXT DEFAULT 'pending',
          payment_method TEXT,
          payment_status TEXT DEFAULT 'pending',
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          completed_at DATETIME,
          FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
        );

        -- Order Items
        CREATE TABLE IF NOT EXISTS order_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_id INTEGER NOT NULL,
          menu_item_id INTEGER NOT NULL,
          quantity INTEGER NOT NULL,
          price REAL NOT NULL,
          subtotal REAL NOT NULL,
          notes TEXT,
          FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
          FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE RESTRICT
        );

        -- Inventory Items
        CREATE TABLE IF NOT EXISTS inventory_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          unit TEXT DEFAULT 'unit',
          current_stock REAL DEFAULT 0,
          min_stock REAL DEFAULT 0,
          max_stock REAL DEFAULT 0,
          cost_per_unit REAL DEFAULT 0,
          supplier TEXT,
          category TEXT,
          location TEXT,
          barcode TEXT UNIQUE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Inventory Transactions
        CREATE TABLE IF NOT EXISTS inventory_transactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          inventory_item_id INTEGER NOT NULL,
          transaction_type TEXT NOT NULL CHECK(transaction_type IN ('in', 'out', 'adjustment', 'waste', 'transfer')),
          quantity REAL NOT NULL,
          unit_cost REAL,
          reference_type TEXT,
          reference_id INTEGER,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          created_by TEXT,
          FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id) ON DELETE RESTRICT
        );

        -- Menu Item Ingredients
        CREATE TABLE IF NOT EXISTS menu_item_ingredients (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          menu_item_id INTEGER NOT NULL,
          inventory_item_id INTEGER NOT NULL,
          quantity_required REAL NOT NULL,
          unit TEXT,
          FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE,
          FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id) ON DELETE RESTRICT,
          UNIQUE(menu_item_id, inventory_item_id)
        );

        -- Analytics
        CREATE TABLE IF NOT EXISTS analytics (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date TEXT NOT NULL UNIQUE,
          total_revenue REAL DEFAULT 0,
          total_orders INTEGER DEFAULT 0,
          average_order_value REAL DEFAULT 0,
          total_items_sold INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Discounts/Promotions
        CREATE TABLE IF NOT EXISTS discounts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          discount_type TEXT NOT NULL CHECK(discount_type IN ('percentage', 'fixed')),
          discount_value REAL NOT NULL,
          min_purchase_amount REAL,
          applicable_items TEXT,
          start_date DATETIME,
          end_date DATETIME,
          is_active INTEGER DEFAULT 1,
          usage_limit INTEGER,
          usage_count INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Option Groups (e.g., "Size", "Crust Type", "Coffee Size")
        CREATE TABLE IF NOT EXISTS option_groups (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          is_required INTEGER DEFAULT 0,
          min_selections INTEGER DEFAULT 1,
          max_selections INTEGER DEFAULT 1,
          display_order INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Options (e.g., "Small", "Medium", "Large" within "Size" group)
        CREATE TABLE IF NOT EXISTS options (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          option_group_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          description TEXT,
          price_modifier REAL DEFAULT 0,
          display_order INTEGER DEFAULT 0,
          is_available INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (option_group_id) REFERENCES option_groups(id) ON DELETE CASCADE
        );

        -- Link Menu Items to Option Groups
        CREATE TABLE IF NOT EXISTS menu_item_option_groups (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          menu_item_id INTEGER NOT NULL,
          option_group_id INTEGER NOT NULL,
          display_order INTEGER DEFAULT 0,
          FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE,
          FOREIGN KEY (option_group_id) REFERENCES option_groups(id) ON DELETE CASCADE,
          UNIQUE(menu_item_id, option_group_id)
        );

        -- Addons (e.g., "Extra Cheese", "Bacon", "Extra Shot")
        CREATE TABLE IF NOT EXISTS addons (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          price REAL NOT NULL,
          category TEXT,
          is_available INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Link Menu Items to Available Addons
        CREATE TABLE IF NOT EXISTS menu_item_addons (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          menu_item_id INTEGER NOT NULL,
          addon_id INTEGER NOT NULL,
          display_order INTEGER DEFAULT 0,
          FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE,
          FOREIGN KEY (addon_id) REFERENCES addons(id) ON DELETE CASCADE,
          UNIQUE(menu_item_id, addon_id)
        );

        -- Store Selected Options for Order Items
        CREATE TABLE IF NOT EXISTS order_item_options (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_item_id INTEGER NOT NULL,
          option_id INTEGER NOT NULL,
          option_group_id INTEGER NOT NULL,
          price_modifier REAL DEFAULT 0,
          FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE,
          FOREIGN KEY (option_id) REFERENCES options(id) ON DELETE RESTRICT,
          FOREIGN KEY (option_group_id) REFERENCES option_groups(id) ON DELETE RESTRICT
        );

        -- Store Selected Addons for Order Items
        CREATE TABLE IF NOT EXISTS order_item_addons (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_item_id INTEGER NOT NULL,
          addon_id INTEGER NOT NULL,
          quantity INTEGER DEFAULT 1,
          price REAL NOT NULL,
          subtotal REAL NOT NULL,
          FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE,
          FOREIGN KEY (addon_id) REFERENCES addons(id) ON DELETE RESTRICT
        );

        -- Indexes
        CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
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
      `);
    },
    down: (db) => {
      // Drop all tables in reverse order
      db.exec(`
        DROP TABLE IF EXISTS order_item_addons;
        DROP TABLE IF EXISTS order_item_options;
        DROP TABLE IF EXISTS menu_item_addons;
        DROP TABLE IF EXISTS addons;
        DROP TABLE IF EXISTS menu_item_option_groups;
        DROP TABLE IF EXISTS options;
        DROP TABLE IF EXISTS option_groups;
        DROP TABLE IF EXISTS discounts;
        DROP TABLE IF EXISTS analytics;
        DROP TABLE IF EXISTS menu_item_ingredients;
        DROP TABLE IF EXISTS inventory_transactions;
        DROP TABLE IF EXISTS inventory_items;
        DROP TABLE IF EXISTS order_items;
        DROP TABLE IF EXISTS orders;
        DROP TABLE IF EXISTS customers;
        DROP TABLE IF EXISTS categories;
        DROP TABLE IF EXISTS menu_items;
        DROP TABLE IF EXISTS schema_version;
      `);
    }
  },
  {
    version: 2,
    up: (db) => {
      // Add tables for per-menu-item sizes and custom options
      db.exec(`
        -- Menu Item Sizes (per-menu-item, not shared)
        CREATE TABLE IF NOT EXISTS menu_item_sizes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          menu_item_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          price REAL NOT NULL,
          display_order INTEGER DEFAULT 0,
          is_default INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE,
          UNIQUE(menu_item_id, name)
        );

        -- Menu Item Custom Options (per-menu-item, not shared)
        CREATE TABLE IF NOT EXISTS menu_item_custom_options (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          menu_item_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          price REAL NOT NULL,
          display_order INTEGER DEFAULT 0,
          is_available INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE
        );

        -- Indexes
        CREATE INDEX IF NOT EXISTS idx_menu_item_sizes_menu_id ON menu_item_sizes(menu_item_id);
        CREATE INDEX IF NOT EXISTS idx_menu_item_custom_options_menu_id ON menu_item_custom_options(menu_item_id);
      `);
    },
    down: (db) => {
      db.exec(`
        DROP TABLE IF EXISTS menu_item_custom_options;
        DROP TABLE IF EXISTS menu_item_sizes;
      `);
    }
  },
  {
    version: 3,
    up: (db) => {
      // Add tables table and link orders to tables
      db.exec(`
        -- Restaurant Tables
        CREATE TABLE IF NOT EXISTS tables (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          number TEXT NOT NULL UNIQUE,
          name TEXT,
          capacity INTEGER DEFAULT 4,
          status TEXT DEFAULT 'available' CHECK(status IN ('available', 'occupied', 'reserved', 'cleaning')),
          current_order_id INTEGER,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (current_order_id) REFERENCES orders(id) ON DELETE SET NULL
        );

        -- Add table_id to orders table
        -- Check if table_id column already exists
        PRAGMA table_info(orders);
      `);
      
      // Check if table_id column exists in orders table
      const ordersInfo = db.prepare("PRAGMA table_info(orders)").all();
      const hasTableId = ordersInfo.some(col => col.name === 'table_id');
      
      if (!hasTableId) {
        db.exec(`ALTER TABLE orders ADD COLUMN table_id INTEGER REFERENCES tables(id) ON DELETE SET NULL;`);
      }

      // Check if subtotal column exists in orders table
      const hasSubtotal = ordersInfo.some(col => col.name === 'subtotal');
      if (!hasSubtotal) {
        db.exec(`ALTER TABLE orders ADD COLUMN subtotal REAL NOT NULL DEFAULT 0;`);
      }

      // Create indexes
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_tables_number ON tables(number);
        CREATE INDEX IF NOT EXISTS idx_tables_status ON tables(status);
        CREATE INDEX IF NOT EXISTS idx_orders_table_id ON orders(table_id);
      `);
    },
    down: (db) => {
      db.exec(`
        DROP INDEX IF EXISTS idx_orders_table_id;
        DROP INDEX IF EXISTS idx_tables_status;
        DROP INDEX IF EXISTS idx_tables_number;
        DROP TABLE IF EXISTS tables;
      `);
      
      // Note: We don't drop the table_id column from orders as SQLite doesn't support DROP COLUMN
      // This would require recreating the table, which is complex
    }
  },
  {
    version: 4,
    up: (db) => {
      // Check and add all missing columns to orders table
      const ordersInfo = db.prepare("PRAGMA table_info(orders)").all();
      const existingColumns = ordersInfo.map(col => col.name);
      
      const columnsToAdd = [
        { name: 'subtotal', sql: 'ALTER TABLE orders ADD COLUMN subtotal REAL NOT NULL DEFAULT 0;' },
        { name: 'discount_amount', sql: 'ALTER TABLE orders ADD COLUMN discount_amount REAL DEFAULT 0;' },
        { name: 'table_id', sql: 'ALTER TABLE orders ADD COLUMN table_id INTEGER REFERENCES tables(id) ON DELETE SET NULL;' },
        { name: 'payment_status', sql: 'ALTER TABLE orders ADD COLUMN payment_status TEXT DEFAULT \'pending\';' },
      ];
      
      columnsToAdd.forEach(col => {
        if (!existingColumns.includes(col.name)) {
          console.log(`Adding ${col.name} column to orders table...`);
          try {
            db.exec(col.sql);
            console.log(`${col.name} column added successfully`);
          } catch (error) {
            console.error(`Error adding ${col.name} column:`, error.message);
          }
        } else {
          console.log(`${col.name} column already exists in orders table`);
        }
      });
    },
    down: (db) => {
      // Note: SQLite doesn't support DROP COLUMN, so we can't remove them
      // This would require recreating the table, which is complex
      console.log('Cannot remove columns (SQLite limitation)');
    }
  },
  {
    version: 5,
    up: (db) => {
      // Check and add any remaining missing columns to orders table
      const ordersInfo = db.prepare("PRAGMA table_info(orders)").all();
      const existingColumns = ordersInfo.map(col => col.name);
      
      const columnsToAdd = [
        { name: 'subtotal', sql: 'ALTER TABLE orders ADD COLUMN subtotal REAL NOT NULL DEFAULT 0;' },
        { name: 'discount_amount', sql: 'ALTER TABLE orders ADD COLUMN discount_amount REAL DEFAULT 0;' },
        { name: 'table_id', sql: 'ALTER TABLE orders ADD COLUMN table_id INTEGER REFERENCES tables(id) ON DELETE SET NULL;' },
        { name: 'payment_status', sql: 'ALTER TABLE orders ADD COLUMN payment_status TEXT DEFAULT \'pending\';' },
      ];
      
      columnsToAdd.forEach(col => {
        if (!existingColumns.includes(col.name)) {
          console.log(`Adding ${col.name} column to orders table...`);
          try {
            db.exec(col.sql);
            console.log(`${col.name} column added successfully`);
          } catch (error) {
            console.error(`Error adding ${col.name} column:`, error.message);
          }
        } else {
          console.log(`${col.name} column already exists in orders table`);
        }
      });
    },
    down: (db) => {
      // Note: SQLite doesn't support DROP COLUMN, so we can't remove them
      console.log('Cannot remove columns (SQLite limitation)');
    }
  },
  {
    version: 6,
    up: (db) => {
      // Create users table for authentication
      db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL CHECK(role IN ('admin', 'cashier')),
          full_name TEXT,
          email TEXT,
          is_active INTEGER DEFAULT 1,
          last_login DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Create settings table
        CREATE TABLE IF NOT EXISTS settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          key TEXT NOT NULL UNIQUE,
          value TEXT,
          description TEXT,
          category TEXT DEFAULT 'general',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Indexes
        CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
        CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
        CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);
        CREATE INDEX IF NOT EXISTS idx_settings_category ON settings(category);
      `);

      // Create default admin user (password: admin123)
      // Using bcrypt hash for 'admin123' - in production, use proper bcrypt
      // For now, we'll use a simple hash that we'll verify properly
      const defaultAdminHash = '$2b$10$rOzJqJqJqJqJqJqJqJqJqO'; // Placeholder - will be properly hashed
      
      // Check if admin user exists
      const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
      
      if (!adminExists) {
        // Insert default admin (password: admin123)
        // Note: In production, use proper password hashing (bcrypt)
        db.prepare(`
          INSERT INTO users (username, password_hash, role, full_name, is_active)
          VALUES (?, ?, ?, ?, ?)
        `).run('admin', 'admin123', 'admin', 'Administrator', 1);
        
        console.log('Default admin user created (username: admin, password: admin123)');
      }

      // Insert default settings
      const defaultSettings = [
        { key: 'business_name', value: 'The Kings Bakery', description: 'Business name', category: 'general' },
        { key: 'business_address', value: '', description: 'Business address', category: 'general' },
        { key: 'business_phone', value: '', description: 'Business phone number', category: 'general' },
        { key: 'business_email', value: '', description: 'Business email', category: 'general' },
        { key: 'tax_rate', value: '0', description: 'Tax rate percentage', category: 'financial' },
        { key: 'currency_symbol', value: 'SLE', description: 'Currency symbol', category: 'financial' },
        { key: 'receipt_footer', value: 'Thank you for your visit!', description: 'Receipt footer text', category: 'receipt' },
      ];

      defaultSettings.forEach(setting => {
        const exists = db.prepare('SELECT id FROM settings WHERE key = ?').get(setting.key);
        if (!exists) {
          db.prepare(`
            INSERT INTO settings (key, value, description, category)
            VALUES (?, ?, ?, ?)
          `).run(setting.key, setting.value, setting.description, setting.category);
        }
      });
    },
    down: (db) => {
      db.exec(`
        DROP INDEX IF EXISTS idx_settings_category;
        DROP INDEX IF EXISTS idx_settings_key;
        DROP INDEX IF EXISTS idx_users_role;
        DROP INDEX IF EXISTS idx_users_username;
        DROP TABLE IF EXISTS settings;
        DROP TABLE IF EXISTS users;
      `);
    }
  },
  {
    version: 7,
    up: (db) => {
      // Add user_id column to orders table for audit logging
      const ordersInfo = db.prepare("PRAGMA table_info(orders)").all();
      const existingColumns = ordersInfo.map(col => col.name);
      
      if (!existingColumns.includes('user_id')) {
        console.log('Adding user_id column to orders table...');
        try {
          db.exec(`ALTER TABLE orders ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;`);
          console.log('user_id column added successfully');
          
          // Create index for better query performance
          db.exec(`CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);`);
        } catch (error) {
          console.error('Error adding user_id column:', error.message);
        }
      } else {
        console.log('user_id column already exists in orders table');
      }
    },
    down: (db) => {
      // Note: SQLite doesn't support DROP COLUMN, so we can't remove it
      // This would require recreating the table, which is complex
      console.log('Cannot remove user_id column (SQLite limitation)');
      db.exec(`DROP INDEX IF EXISTS idx_orders_user_id;`);
    }
  }
];

export function getCurrentVersion(db) {
  try {
    const result = db.prepare('SELECT MAX(version) as version FROM schema_version').get();
    return result?.version || 0;
  } catch (error) {
    // Table doesn't exist yet
    return 0;
  }
}

export function applyMigration(db, migration) {
  const transaction = db.transaction(() => {
    migration.up(db);
    db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(migration.version);
  });
  transaction();
}

export function runMigrations(db) {
  const currentVersion = getCurrentVersion(db);
  const pendingMigrations = migrations.filter(m => m.version > currentVersion);
  
  if (pendingMigrations.length === 0) {
    console.log(`Database is up to date (version ${currentVersion})`);
    return;
  }

  console.log(`Applying ${pendingMigrations.length} migration(s)...`);
  
  pendingMigrations
    .sort((a, b) => a.version - b.version)
    .forEach(migration => {
      console.log(`Applying migration ${migration.version}...`);
      try {
        applyMigration(db, migration);
        console.log(`Migration ${migration.version} applied successfully`);
      } catch (error) {
        console.error(`Error applying migration ${migration.version}:`, error);
        throw error;
      }
    });
  
  console.log(`Database migrations complete. Current version: ${migrations[migrations.length - 1].version}`);
}

