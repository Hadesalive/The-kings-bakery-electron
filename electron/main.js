import { app, BrowserWindow, ipcMain, protocol } from 'electron';
import path from 'path';
import Database from 'better-sqlite3';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { parse } from 'url';
import { extname } from 'path';
import { runMigrations } from './migrations.js';
import { setDatabase } from './services/databaseService.js';
import * as menuService from './services/menuService.js';
import * as categoryService from './services/categoryService.js';
import * as optionGroupService from './services/optionGroupService.js';
import * as optionService from './services/optionService.js';
import * as addonService from './services/addonService.js';
import * as tableService from './services/tableService.js';
import * as printService from './services/printService.js';
import * as syncService from './services/syncService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if we're in development mode
// Explicitly check NODE_ENV - if it's 'development', we're in dev mode
// If it's 'production' or not set, check if dist folder exists to determine mode
const explicitDev = process.env.NODE_ENV === 'development';
const explicitProd = process.env.NODE_ENV === 'production';
const distExists = fs.existsSync(path.join(__dirname, '../dist/index.html'));

let isDev;
if (explicitDev) {
  isDev = true;
} else if (explicitProd) {
  isDev = false;
} else {
  // If NODE_ENV is not set, default to production build mode if dist exists
  // Otherwise assume dev mode (for electron:dev command)
  isDev = !distExists;
}

const isProductionBuild = !isDev && !app.isPackaged;


// Database setup
const dbPath = path.join(app.getPath('userData'), 'kings-bakery.db');
const mediaPath = path.join(app.getPath('userData'), 'media');

// Ensure media directory exists
if (!fs.existsSync(mediaPath)) {
  fs.mkdirSync(mediaPath, { recursive: true });
}

// Simple HTTP server for production builds (needed for ES modules)
let productionServer = null;
const PRODUCTION_PORT = 5174; // Different from dev server port

function startProductionServer() {
  if (productionServer) return PRODUCTION_PORT;
  
  // Determine dist directory based on whether app is packaged
  let distDir;
  if (app.isPackaged) {
    // When packaged, dist is in resources/app.asar/dist or resources/app/dist
    const possibleDistPaths = [
      path.join(process.resourcesPath, 'app.asar', 'dist'),
      path.join(process.resourcesPath, 'app', 'dist'),
      path.join(__dirname, '../dist'),
    ];
    
    for (const tryPath of possibleDistPaths) {
      if (fs.existsSync(tryPath)) {
        distDir = tryPath;
        console.log('Found dist directory at:', distDir);
        break;
      }
    }
    
    if (!distDir) {
      console.error('Could not find dist directory in packaged app');
      distDir = path.join(process.resourcesPath, 'app', 'dist');
    }
  } else {
    distDir = path.join(__dirname, '../dist');
  }
  
  productionServer = createServer((req, res) => {
    const parsedUrl = parse(req.url || '/', true);
    let pathname = parsedUrl.pathname || '/';
    
    // Decode URL-encoded path (handles spaces and special characters)
    try {
      pathname = decodeURIComponent(pathname);
    } catch (e) {
      // If decoding fails, use original pathname
    }
    
    // Remove leading slash for file system access
    let fileSystemPath = pathname;
    if (fileSystemPath.startsWith('/')) {
      fileSystemPath = fileSystemPath.substring(1);
    }
    
    // Handle root-level public files (like logo)
    // In Vite, files in public/ are served from root
    const filePath = path.join(distDir, fileSystemPath);
    
    // Security: ensure file is within dist directory
    if (!filePath.startsWith(distDir)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    
    // Handle root path - serve index.html
    if (pathname === '/' || pathname === '/index.html') {
      const indexPath = path.join(distDir, 'index.html');
      if (fs.existsSync(indexPath)) {
        const fileContent = fs.readFileSync(indexPath);
        res.writeHead(200, {
          'Content-Type': 'text/html',
          'Access-Control-Allow-Origin': '*',
        });
        res.end(fileContent);
        return;
      }
    }
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      // If file doesn't exist and it's not an asset request, serve index.html for client-side routing
      // This allows React Router to handle routes like /login, /pos, etc.
      const isAssetRequest = pathname.startsWith('/assets/') || 
                             pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/i);
      
      if (!isAssetRequest) {
        // Serve index.html for all non-asset routes (React Router will handle routing)
        const indexPath = path.join(distDir, 'index.html');
        if (fs.existsSync(indexPath)) {
          const fileContent = fs.readFileSync(indexPath);
          res.writeHead(200, {
            'Content-Type': 'text/html',
            'Access-Control-Allow-Origin': '*',
          });
          res.end(fileContent);
          return;
        }
      }
      
      console.log(`File not found: ${filePath} (requested: ${pathname}, decoded: ${fileSystemPath})`);
      res.writeHead(404);
      res.end('Not Found');
      return;
    }
    
    console.log(`Serving file: ${pathname} -> ${filePath}`);
    
    // Set content type
    const ext = extname(filePath).toLowerCase();
    const contentTypes = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.mjs': 'application/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
    };
    const contentType = contentTypes[ext] || 'application/octet-stream';
    
    // Read and serve file
    try {
      const fileContent = fs.readFileSync(filePath);
      res.writeHead(200, {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
      });
      res.end(fileContent);
    } catch (error) {
      console.error('Error serving file:', error);
      res.writeHead(500);
      res.end('Internal Server Error');
    }
  });
  
  productionServer.listen(PRODUCTION_PORT, 'localhost', () => {
    console.log(`Production server started on http://localhost:${PRODUCTION_PORT}`);
  });
  
  return PRODUCTION_PORT;
}

function stopProductionServer() {
  if (productionServer) {
    productionServer.close();
    productionServer = null;
  }
}

// Initialize database
let db = null;

// Auto-sync interval handle (cleared when off or changed)
let autoSyncIntervalId = null;

function startAutoSync() {
  if (autoSyncIntervalId) {
    clearInterval(autoSyncIntervalId);
    autoSyncIntervalId = null;
  }
  if (!db) return;
  const row = db.prepare("SELECT value FROM settings WHERE key = 'sync_auto_interval'").get();
  const val = (row?.value || 'off').toLowerCase().trim();
  if (val === 'off' || val === '0' || val === '') return;
  const mins = parseInt(val, 10);
  if (![1, 5, 15, 30].includes(mins)) return;
  const ms = mins * 60 * 1000;
  autoSyncIntervalId = setInterval(async () => {
    try {
      if (!db) return;
      await syncService.pushToSupabase(db, null, { mediaPath });
    } catch (err) {
      console.warn('[Sync] Auto-sync failed:', err.message);
    }
  }, ms);
}

function initDatabase() {
  db = new Database(dbPath);
  
  // Enable foreign keys
  db.pragma('foreign_keys = ON');
  
  // Run migrations to set up or update schema
  runMigrations(db);
  
  // Set database instance for services
  setDatabase(db);

  // Start auto-sync if enabled
  startAutoSync();
}

// IPC Handlers
ipcMain.handle('db-query', async (_event, query, params = []) => {
  try {
    if (!db) throw new Error('Database not initialized');
    
    // Ensure foreign keys are enabled for all queries
    db.pragma('foreign_keys = ON');
    
    if (query.trim().toUpperCase().startsWith('SELECT')) {
      const stmt = db.prepare(query);
      return stmt.all(...params);
    } else {
      const stmt = db.prepare(query);
      return stmt.run(...params);
    }
  } catch (error) {
    console.error('Database error:', error);
    console.error('Query:', query);
    console.error('Params:', params);
    throw error;
  }
});

ipcMain.handle('save-media', async (_event, filename, buffer) => {
  try {
    const filePath = path.join(mediaPath, filename);
    fs.writeFileSync(filePath, Buffer.from(buffer));
    return filePath;
  } catch (error) {
    console.error('Media save error:', error);
    throw error;
  }
});

ipcMain.handle('get-media', async (_event, filename) => {
  try {
    const filePath = path.join(mediaPath, filename);
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath);
    }
    return null;
  } catch (error) {
    console.error('Media read error:', error);
    return null;
  }
});

// Menu Item IPC Handlers
ipcMain.handle('menu:getAll', async () => {
  try {
    return await menuService.getAllMenuItems();
  } catch (error) {
    console.error('Error in menu:getAll handler:', error);
    throw error;
  }
});

ipcMain.handle('menu:getAvailable', async () => {
  try {
    return await menuService.getAvailableMenuItems();
  } catch (error) {
    console.error('Error in menu:getAvailable handler:', error);
    throw error;
  }
});

ipcMain.handle('menu:getById', async (_event, id) => {
  try {
    return await menuService.getMenuItemById(id);
  } catch (error) {
    console.error('Error in menu:getById handler:', error);
    throw error;
  }
});

ipcMain.handle('menu:create', async (_event, itemData) => {
  try {
    return await menuService.createMenuItem(itemData);
  } catch (error) {
    console.error('Error in menu:create handler:', error);
    throw error;
  }
});

ipcMain.handle('menu:update', async (_event, id, itemData) => {
  try {
    return await menuService.updateMenuItem(id, itemData);
  } catch (error) {
    console.error('Error in menu:update handler:', error);
    throw error;
  }
});

ipcMain.handle('menu:delete', async (_event, id) => {
  try {
    return await menuService.deleteMenuItem(id);
  } catch (error) {
    console.error('Error in menu:delete handler:', error);
    throw error;
  }
});

ipcMain.handle('menu:toggleAvailability', async (_event, id) => {
  try {
    return await menuService.toggleMenuItemAvailability(id);
  } catch (error) {
    console.error('Error in menu:toggleAvailability handler:', error);
    throw error;
  }
});

ipcMain.handle('menu:getSizes', async (_event, menuItemId) => {
  try {
    return menuService.getMenuItemSizes(menuItemId);
  } catch (error) {
    console.error('Error in menu:getSizes handler:', error);
    throw error;
  }
});

ipcMain.handle('menu:saveSizes', async (_event, menuItemId, sizes) => {
  try {
    return menuService.saveMenuItemSizes(menuItemId, sizes);
  } catch (error) {
    console.error('Error in menu:saveSizes handler:', error);
    throw error;
  }
});

ipcMain.handle('menu:getCustomOptions', async (_event, menuItemId) => {
  try {
    return menuService.getMenuItemCustomOptions(menuItemId);
  } catch (error) {
    console.error('Error in menu:getCustomOptions handler:', error);
    throw error;
  }
});

ipcMain.handle('menu:saveCustomOptions', async (_event, menuItemId, options) => {
  try {
    return menuService.saveMenuItemCustomOptions(menuItemId, options);
  } catch (error) {
    console.error('Error in menu:saveCustomOptions handler:', error);
    throw error;
  }
});

// Category IPC Handlers
ipcMain.handle('category:getAll', async () => {
  try {
    return await categoryService.getAllCategories();
  } catch (error) {
    console.error('Error in category:getAll handler:', error);
    throw error;
  }
});

ipcMain.handle('category:getById', async (_event, id) => {
  try {
    return await categoryService.getCategoryById(id);
  } catch (error) {
    console.error('Error in category:getById handler:', error);
    throw error;
  }
});

ipcMain.handle('category:create', async (_event, categoryData) => {
  try {
    console.log('category:create called with data:', categoryData);
    const result = await categoryService.createCategory(categoryData);
    console.log('category:create result:', result);
    return result;
  } catch (error) {
    console.error('Error in category:create handler:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    throw error;
  }
});

ipcMain.handle('category:update', async (_event, id, categoryData) => {
  try {
    return await categoryService.updateCategory(id, categoryData);
  } catch (error) {
    console.error('Error in category:update handler:', error);
    throw error;
  }
});

ipcMain.handle('category:delete', async (_event, id) => {
  try {
    return await categoryService.deleteCategory(id);
  } catch (error) {
    console.error('Error in category:delete handler:', error);
    throw error;
  }
});

// Option Group IPC Handlers
ipcMain.handle('optionGroup:getAll', async () => {
  try {
    return optionGroupService.getAllOptionGroups();
  } catch (error) {
    console.error('Error in optionGroup:getAll handler:', error);
    throw error;
  }
});

ipcMain.handle('optionGroup:getById', async (_event, id) => {
  try {
    return optionGroupService.getOptionGroupById(id);
  } catch (error) {
    console.error('Error in optionGroup:getById handler:', error);
    throw error;
  }
});

ipcMain.handle('optionGroup:create', async (_event, groupData) => {
  try {
    return optionGroupService.createOptionGroup(groupData);
  } catch (error) {
    console.error('Error in optionGroup:create handler:', error);
    throw error;
  }
});

ipcMain.handle('optionGroup:update', async (_event, id, groupData) => {
  try {
    return optionGroupService.updateOptionGroup(id, groupData);
  } catch (error) {
    console.error('Error in optionGroup:update handler:', error);
    throw error;
  }
});

ipcMain.handle('optionGroup:delete', async (_event, id) => {
  try {
    return optionGroupService.deleteOptionGroup(id);
  } catch (error) {
    console.error('Error in optionGroup:delete handler:', error);
    throw error;
  }
});

// Option IPC Handlers
ipcMain.handle('option:getAll', async (_event, optionGroupId) => {
  try {
    return optionService.getAllOptions(optionGroupId);
  } catch (error) {
    console.error('Error in option:getAll handler:', error);
    throw error;
  }
});

ipcMain.handle('option:getById', async (_event, id) => {
  try {
    return optionService.getOptionById(id);
  } catch (error) {
    console.error('Error in option:getById handler:', error);
    throw error;
  }
});

ipcMain.handle('option:create', async (_event, optionData) => {
  try {
    return optionService.createOption(optionData);
  } catch (error) {
    console.error('Error in option:create handler:', error);
    throw error;
  }
});

ipcMain.handle('option:update', async (_event, id, optionData) => {
  try {
    return optionService.updateOption(id, optionData);
  } catch (error) {
    console.error('Error in option:update handler:', error);
    throw error;
  }
});

ipcMain.handle('option:delete', async (_event, id) => {
  try {
    return optionService.deleteOption(id);
  } catch (error) {
    console.error('Error in option:delete handler:', error);
    throw error;
  }
});

// Addon IPC Handlers
ipcMain.handle('addon:getAll', async () => {
  try {
    return addonService.getAllAddons();
  } catch (error) {
    console.error('Error in addon:getAll handler:', error);
    throw error;
  }
});

ipcMain.handle('addon:getById', async (_event, id) => {
  try {
    return addonService.getAddonById(id);
  } catch (error) {
    console.error('Error in addon:getById handler:', error);
    throw error;
  }
});

ipcMain.handle('addon:create', async (_event, addonData) => {
  try {
    return addonService.createAddon(addonData);
  } catch (error) {
    console.error('Error in addon:create handler:', error);
    throw error;
  }
});

ipcMain.handle('addon:update', async (_event, id, addonData) => {
  try {
    return addonService.updateAddon(id, addonData);
  } catch (error) {
    console.error('Error in addon:update handler:', error);
    throw error;
  }
});

ipcMain.handle('addon:delete', async (_event, id) => {
  try {
    return addonService.deleteAddon(id);
  } catch (error) {
    console.error('Error in addon:delete handler:', error);
    throw error;
  }
});

// Table IPC Handlers
ipcMain.handle('table:getAll', async () => {
  try {
    return tableService.getAllTables();
  } catch (error) {
    console.error('Error in table:getAll handler:', error);
    throw error;
  }
});

ipcMain.handle('table:getById', async (_event, id) => {
  try {
    return tableService.getTableById(id);
  } catch (error) {
    console.error('Error in table:getById handler:', error);
    throw error;
  }
});

ipcMain.handle('table:getByStatus', async (_event, status) => {
  try {
    return tableService.getTablesByStatus(status);
  } catch (error) {
    console.error('Error in table:getByStatus handler:', error);
    throw error;
  }
});

ipcMain.handle('table:create', async (_event, tableData) => {
  try {
    return tableService.createTable(tableData);
  } catch (error) {
    console.error('Error in table:create handler:', error);
    throw error;
  }
});

ipcMain.handle('table:update', async (_event, id, tableData) => {
  try {
    return tableService.updateTable(id, tableData);
  } catch (error) {
    console.error('Error in table:update handler:', error);
    throw error;
  }
});

ipcMain.handle('table:delete', async (_event, id) => {
  try {
    return tableService.deleteTable(id);
  } catch (error) {
    console.error('Error in table:delete handler:', error);
    throw error;
  }
});

ipcMain.handle('table:updateStatus', async (_event, id, status) => {
  try {
    return tableService.updateTableStatus(id, status);
  } catch (error) {
    console.error('Error in table:updateStatus handler:', error);
    throw error;
  }
});

// Print handlers
ipcMain.handle('print:kitchenOrder', async (_event, orderData) => {
  try {
    return await printService.printKitchenOrder(orderData);
  } catch (error) {
    console.error('Error printing kitchen order:', error);
    throw error;
  }
});

ipcMain.handle('print:customerReceipt', async (_event, orderData) => {
  try {
    return await printService.printCustomerReceipt(orderData);
  } catch (error) {
    console.error('Error printing customer receipt:', error);
    throw error;
  }
});

// Order handlers
ipcMain.handle('order:delete', async (_event, id, userId) => {
  try {
    if (!db) throw new Error('Database not initialized');
    
    // Check user role if userId is provided
    if (userId !== undefined && userId !== null) {
      const user = db.prepare('SELECT role FROM users WHERE id = ? AND is_active = 1').get(userId);
      if (!user) {
        return { success: false, message: 'User not found or inactive' };
      }
      if (user.role === 'cashier') {
        return { success: false, message: 'Cashiers are not allowed to delete orders. Please contact an administrator.' };
      }
    }
    
    // Ensure foreign keys are enabled
    db.pragma('foreign_keys = ON');
    
    // Use a transaction to ensure all deletions happen atomically
    const transaction = db.transaction(() => {
      // First, get the order to check for table association
      const order = db.prepare('SELECT table_id FROM orders WHERE id = ?').get(id);
      
      if (!order) {
        return { success: false, message: 'Order not found' };
      }
      
      // Free up the table FIRST (before deleting the order)
      // This prevents foreign key constraint issues with tables.current_order_id
      if (order.table_id) {
        db.prepare('UPDATE tables SET status = ?, current_order_id = ? WHERE id = ?').run('available', null, order.table_id);
      }
      
      // Get all order item IDs for this order
      const orderItemIds = db.prepare('SELECT id FROM order_items WHERE order_id = ?').all(id);
      
      // Delete order item options and addons for each order item
      if (orderItemIds.length > 0) {
        for (const item of orderItemIds) {
          // Delete order item options
          db.prepare('DELETE FROM order_item_options WHERE order_item_id = ?').run(item.id);
          
          // Delete order item addons
          db.prepare('DELETE FROM order_item_addons WHERE order_item_id = ?').run(item.id);
        }
      }
      
      // Delete order items (child of orders)
      // This should cascade, but we're being explicit
      db.prepare('DELETE FROM order_items WHERE order_id = ?').run(id);
      
      // Finally, delete the order itself
      const result = db.prepare('DELETE FROM orders WHERE id = ?').run(id);
      return { success: result.changes > 0 };
    });
    
    return transaction();
  } catch (error) {
    console.error('Error in order:delete handler:', error);
    throw error;
  }
});

// User handlers
ipcMain.handle('user:getByUsername', async (_event, username) => {
  try {
    if (!db) throw new Error('Database not initialized');
    const result = db.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1').all(username);
    return result[0] || null;
  } catch (error) {
    console.error('Error in user:getByUsername handler:', error);
    throw error;
  }
});

ipcMain.handle('user:getAll', async () => {
  try {
    if (!db) throw new Error('Database not initialized');
    return db.prepare('SELECT id, username, role, full_name, email, is_active, last_login, created_at, updated_at FROM users ORDER BY created_at DESC').all();
  } catch (error) {
    console.error('Error in user:getAll handler:', error);
    throw error;
  }
});

ipcMain.handle('user:create', async (_event, userData) => {
  try {
    if (!db) throw new Error('Database not initialized');
    return db.prepare(
      'INSERT INTO users (username, password_hash, role, full_name, email, is_active) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(
      userData.username, userData.password_hash || '', userData.role, userData.full_name || null, userData.email || null, userData.is_active !== undefined ? userData.is_active : 1
    );
  } catch (error) {
    console.error('Error in user:create handler:', error);
    throw error;
  }
});

ipcMain.handle('user:update', async (_event, id, userData) => {
  try {
    if (!db) throw new Error('Database not initialized');
    const updates = [];
    const values = [];
    
    if (userData.password_hash !== undefined) {
      updates.push('password_hash = ?');
      values.push(userData.password_hash);
    }
    if (userData.role !== undefined) {
      updates.push('role = ?');
      values.push(userData.role);
    }
    if (userData.full_name !== undefined) {
      updates.push('full_name = ?');
      values.push(userData.full_name);
    }
    if (userData.email !== undefined) {
      updates.push('email = ?');
      values.push(userData.email);
    }
    if (userData.is_active !== undefined) {
      updates.push('is_active = ?');
      values.push(userData.is_active);
    }
    
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    
    return db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  } catch (error) {
    console.error('Error in user:update handler:', error);
    throw error;
  }
});

ipcMain.handle('user:updateLastLogin', async (_event, id) => {
  try {
    if (!db) throw new Error('Database not initialized');
    return db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(id);
  } catch (error) {
    console.error('Error in user:updateLastLogin handler:', error);
    throw error;
  }
});

ipcMain.handle('user:delete', async (_event, id) => {
  try {
    if (!db) throw new Error('Database not initialized');
    return db.prepare('DELETE FROM users WHERE id = ?').run(id);
  } catch (error) {
    console.error('Error in user:delete handler:', error);
    throw error;
  }
});

// Settings handlers
ipcMain.handle('settings:getAll', async () => {
  try {
    if (!db) throw new Error('Database not initialized');
    return db.prepare('SELECT * FROM settings ORDER BY category, key').all();
  } catch (error) {
    console.error('Error in settings:getAll handler:', error);
    throw error;
  }
});

ipcMain.handle('settings:get', async (_event, key) => {
  try {
    if (!db) throw new Error('Database not initialized');
    const result = db.prepare('SELECT * FROM settings WHERE key = ?').all(key);
    return result[0] || null;
  } catch (error) {
    console.error('Error in settings:get handler:', error);
    throw error;
  }
});

ipcMain.handle('settings:update', async (_event, key, value) => {
  try {
    if (!db) throw new Error('Database not initialized');
    const exists = db.prepare('SELECT id FROM settings WHERE key = ?').all(key);
    if (exists.length > 0) {
      db.prepare('UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?').run(value, key);
    } else {
      db.prepare('INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)').run(key, value);
    }
    if (key === 'sync_auto_interval') startAutoSync();
    return { success: true };
  } catch (error) {
    console.error('Error in settings:update handler:', error);
    throw error;
  }
});

ipcMain.handle('settings:updateMultiple', async (_event, settings) => {
  try {
    if (!db) throw new Error('Database not initialized');
    let syncIntervalChanged = false;
    for (const setting of settings) {
      const exists = db.prepare('SELECT id FROM settings WHERE key = ?').all(setting.key);
      if (exists.length > 0) {
        db.prepare('UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?').run(setting.value, setting.key);
      } else {
        db.prepare('INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)').run(setting.key, setting.value);
      }
      if (setting.key === 'sync_auto_interval') syncIntervalChanged = true;
    }
    if (syncIntervalChanged) startAutoSync();
    return { success: true };
  } catch (error) {
    console.error('Error in settings:updateMultiple handler:', error);
    throw error;
  }
});

// Sync handlers
ipcMain.handle('sync:push', async () => {
  try {
    if (!db) throw new Error('Database not initialized');
    return await syncService.pushToSupabase(db, null, { mediaPath });
  } catch (error) {
    console.error('Error in sync:push handler:', error);
    throw error;
  }
});

ipcMain.handle('sync:pull', async () => {
  try {
    if (!db) throw new Error('Database not initialized');
    return await syncService.pullFromSupabase(db, null, { mediaPath });
  } catch (error) {
    console.error('Error in sync:pull handler:', error);
    throw error;
  }
});

ipcMain.handle('sync:full', async () => {
  try {
    if (!db) throw new Error('Database not initialized');
    return await syncService.fullSync(db, null, { mediaPath });
  } catch (error) {
    console.error('Error in sync:full handler:', error);
    throw error;
  }
});

ipcMain.handle('sync:testConnection', async () => {
  try {
    if (!db) throw new Error('Database not initialized');
    return await syncService.testConnection(db);
  } catch (error) {
    console.error('Error in sync:testConnection handler:', error);
    throw error;
  }
});

ipcMain.handle('sync:getLastSync', async () => {
  try {
    if (!db) throw new Error('Database not initialized');
    return syncService.getLastSync(db);
  } catch (error) {
    console.error('Error in sync:getLastSync handler:', error);
    throw error;
  }
});

ipcMain.handle('sync:getImageDiagnostics', async () => {
  try {
    if (!db) throw new Error('Database not initialized');
    return syncService.getImageSyncDiagnostics(db, mediaPath);
  } catch (error) {
    console.error('Error in sync:getImageDiagnostics handler:', error);
    throw error;
  }
});

function createWindow() {
  // Determine correct paths based on environment
  const preloadPath = path.join(__dirname, 'preload.cjs');

  console.log('Environment:', { isDev, isProductionBuild, isPackaged: app.isPackaged });
  console.log('Preload path:', preloadPath);
  console.log('__dirname:', __dirname);

  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: preloadPath,
    },
    show: false, // Don't show until ready
    icon: path.join(__dirname, '../assets/icon.png'),
    titleBarStyle: 'default',
    backgroundColor: '#f5f5f5',
  });

  // Error handling
  win.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('Failed to load:', { errorCode, errorDescription, validatedURL });
    const errorHtml = '<div style="display: flex; align-items: center; justify-content: center; height: 100vh; font-family: Arial; flex-direction: column; gap: 20px;"><h1>Failed to load application</h1><p>Error: ' + errorDescription + ' (' + errorCode + ')</p><p>Path: ' + validatedURL + '</p><p>Please check the console for more details.</p></div>';
    win.webContents.executeJavaScript('document.body.innerHTML = ' + JSON.stringify(errorHtml) + ';');
    win.show();
  });

  // Wait for preload to be ready
  win.webContents.on('did-finish-load', () => {
    console.log('Window finished loading successfully');
    // Check if React root exists after a short delay
    setTimeout(() => {
      win.webContents.executeJavaScript(`
        (function() {
          const root = document.getElementById('root');
          if (root && root.children.length === 0) {
            console.warn('Root element exists but is empty - React may not have rendered');
            console.log('Root innerHTML:', root.innerHTML);
          } else if (!root) {
            console.error('Root element not found!');
          } else {
            console.log('Root element has content, React appears to have rendered');
          }
        })();
      `).catch(err => console.error('Error checking root:', err));
    }, 1000);
    win.show();
  });

  // Catch renderer process errors
  win.webContents.on('render-process-gone', (event, details) => {
    console.error('Renderer process crashed:', details);
  });

  // Log uncaught exceptions
  win.webContents.on('uncaught-exception', (event, error) => {
    console.error('Uncaught exception in renderer:', error);
  });

  // Inject error handler into page
  win.webContents.on('dom-ready', () => {
    win.webContents.executeJavaScript(`
      window.addEventListener('error', (event) => {
        console.error('Global error:', event.error);
      });
      window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled promise rejection:', event.reason);
      });
    `);
  });

  // Load app
  if (isDev) {
    // Development mode: connect to Vite dev server
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else if (isProductionBuild) {
    // Production build (not packaged): use local HTTP server for ES modules
    const distPath = path.join(__dirname, '../dist/index.html');
    if (fs.existsSync(distPath)) {
      console.log('Starting production server and loading build...');
      const port = startProductionServer();
      // Wait a moment for server to be ready, then load
      setTimeout(() => {
        win.loadURL(`http://localhost:${port}`);
        console.log(`Loading production build from http://localhost:${port}`);
      }, 100);
    } else {
      console.error('Production build not found. Please run: npm run build');
      const errorHtml = '<div style="display: flex; align-items: center; justify-content: center; height: 100vh; font-family: Arial; flex-direction: column; gap: 20px;"><h1>Production build not found</h1><p>Please run: <code>npm run build</code> first</p><p>Expected path: ' + distPath + '</p></div>';
      win.webContents.executeJavaScript('document.body.innerHTML = ' + JSON.stringify(errorHtml) + ';');
      win.show();
    }
  } else {
    // Packaged app: use HTTP server for ES modules to work correctly
    const possibleDistPaths = [
      path.join(process.resourcesPath, 'app.asar', 'dist'),
      path.join(process.resourcesPath, 'app', 'dist'),
      path.join(__dirname, '../dist'),
    ];
    
    let distPath = null;
    for (const tryPath of possibleDistPaths) {
      const indexPath = path.join(tryPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        distPath = tryPath;
        console.log('Found dist directory at:', distPath);
        break;
      }
    }
    
    if (distPath) {
      console.log('Starting production server for packaged app...');
      const port = startProductionServer();
      // Wait a moment for server to be ready, then load
      setTimeout(() => {
        win.loadURL(`http://localhost:${port}`);
        console.log(`Loading packaged app from http://localhost:${port}`);
      }, 100);
    } else {
      console.error('Could not find dist directory in packaged app');
      const errorHtml = '<div style="display: flex; align-items: center; justify-content: center; height: 100vh; font-family: Arial; flex-direction: column; gap: 20px;"><h1>Application not found</h1><p>Could not locate dist directory.</p><p>Please rebuild the application.</p></div>';
      win.webContents.executeJavaScript('document.body.innerHTML = ' + JSON.stringify(errorHtml) + ';');
      win.show();
    }
  }
}

app.whenReady().then(() => {
  // Register custom protocol for serving media files
  protocol.registerFileProtocol('media', (request, callback) => {
    const filePath = request.url.replace('media://', '');
    const fullPath = path.join(mediaPath, filePath);
    callback({ path: fullPath });
  });


  initDatabase();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (autoSyncIntervalId) {
    clearInterval(autoSyncIntervalId);
    autoSyncIntervalId = null;
  }
  stopProductionServer();
  if (db) {
    db.close();
  }
});

