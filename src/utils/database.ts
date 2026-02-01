// Database utility functions with TypeScript types

export interface MenuItem {
  id?: number;
  name: string;
  description?: string;
  price: number;
  category?: string;
  image_path?: string;
  is_available?: number;
  created_at?: string;
  updated_at?: string;
}

export interface CreateMenuItemData extends Omit<MenuItem, 'id' | 'created_at' | 'updated_at'> {
  option_groups?: number[];
  addons?: number[];
}

export interface Order {
  id?: number;
  order_number: string;
  customer_id?: number;
  table_id?: number;
  user_id?: number; // User/cashier who created the order
  total_amount: number;
  subtotal: number;
  tax_amount?: number;
  discount_amount?: number;
  status?: string;
  payment_method?: string;
  payment_status?: string;
  notes?: string;
  created_at?: string;
  completed_at?: string;
}

export interface OrderItem {
  id?: number;
  order_id: number;
  menu_item_id: number;
  quantity: number;
  price: number;
  subtotal: number;
  notes?: string;
  name?: string;
  description?: string;
}

export interface Analytics {
  id?: number;
  date: string;
  total_revenue: number;
  total_orders: number;
  average_order_value: number;
  total_items_sold?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Customer {
  id?: number;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  loyalty_points?: number;
  total_orders?: number;
  total_spent?: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface InventoryItem {
  id?: number;
  name: string;
  description?: string;
  unit?: string;
  current_stock?: number;
  min_stock?: number;
  max_stock?: number;
  cost_per_unit?: number;
  supplier?: string;
  category?: string;
  location?: string;
  barcode?: string;
  created_at?: string;
  updated_at?: string;
}

export interface InventoryTransaction {
  id?: number;
  inventory_item_id: number;
  transaction_type: string; // 'in', 'out', 'adjustment', 'waste', 'transfer'
  quantity: number;
  unit_cost?: number;
  reference_type?: string; // 'order', 'purchase', 'adjustment', etc.
  reference_id?: number;
  notes?: string;
  created_at?: string;
  created_by?: string;
}

export interface User {
  id?: number;
  username: string;
  password_hash?: string;
  role: 'admin' | 'cashier';
  full_name?: string;
  email?: string;
  is_active?: number;
  last_login?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Setting {
  id?: number;
  key: string;
  value?: string;
  description?: string;
  category?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Category {
  id?: number;
  name: string;
  description?: string;
  display_order?: number;
  created_at?: string;
}

export interface Table {
  id?: number;
  number: string;
  name?: string;
  capacity?: number;
  status?: 'available' | 'occupied' | 'reserved' | 'cleaning';
  current_order_id?: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Discount {
  id?: number;
  name: string;
  description?: string;
  discount_type: string; // 'percentage', 'fixed'
  discount_value: number;
  min_purchase_amount?: number;
  applicable_items?: string;
  start_date?: string;
  end_date?: string;
  is_active?: number;
  usage_limit?: number;
  usage_count?: number;
  created_at?: string;
}

export interface OptionGroup {
  id?: number;
  name: string;
  description?: string;
  is_required?: number;
  min_selections?: number;
  max_selections?: number;
  display_order?: number;
  created_at?: string;
}

export interface Option {
  id?: number;
  option_group_id: number;
  name: string;
  description?: string;
  price_modifier?: number;
  display_order?: number;
  is_available?: number;
  created_at?: string;
}

export interface MenuItemOptionGroup {
  id?: number;
  menu_item_id: number;
  option_group_id: number;
  display_order?: number;
}

export interface Addon {
  id?: number;
  name: string;
  description?: string;
  price: number;
  category?: string;
  is_available?: number;
  created_at?: string;
}

export interface MenuItemAddon {
  id?: number;
  menu_item_id: number;
  addon_id: number;
  display_order?: number;
}

export interface OrderItemOption {
  id?: number;
  order_item_id: number;
  option_id: number;
  option_group_id: number;
  price_modifier?: number;
}

export interface OrderItemAddon {
  id?: number;
  order_item_id: number;
  addon_id: number;
  quantity?: number;
  price: number;
  subtotal: number;
}

export interface OrderData {
  order_number: string;
  total_amount: number;
  subtotal: number;
  tax_amount?: number;
  discount_amount?: number;
  payment_method: string;
  payment_status?: string;
  table_id?: number;
  customer_id?: number;
  user_id?: number; // User/cashier who created the order
  items: Omit<OrderItem, 'id' | 'order_id'>[];
}

const dbQuery = async (query: string, params: any[] = []): Promise<any> => {
  if (window.electronAPI) {
    return await window.electronAPI.dbQuery(query, params);
  }
  console.error('Electron API not available. window.electronAPI:', window.electronAPI);
  console.error('Available window properties:', Object.keys(window));
  throw new Error('Electron API not available. Please ensure you are running the application in Electron.');
};

// Menu Items
export const getMenuItems = async (): Promise<MenuItem[]> => {
  if (window.electronAPI?.menu?.getAvailable) {
    return await window.electronAPI.menu.getAvailable();
  }
  // Fallback to legacy method
  return await dbQuery(
    'SELECT * FROM menu_items WHERE is_available = 1 ORDER BY category, name'
  );
};

export const getAllMenuItems = async (): Promise<MenuItem[]> => {
  if (window.electronAPI?.menu?.getAll) {
    return await window.electronAPI.menu.getAll();
  }
  // Fallback to legacy method
  return await dbQuery('SELECT * FROM menu_items ORDER BY category, name');
};

export const addMenuItem = async (item: CreateMenuItemData): Promise<any> => {
  if (window.electronAPI?.menu?.create) {
    return await window.electronAPI.menu.create(item);
  }
  // Fallback to legacy method
  const { name, description, price, category, image_path, is_available } = item;
  return await dbQuery(
    'INSERT INTO menu_items (name, description, price, category, image_path, is_available) VALUES (?, ?, ?, ?, ?, ?)',
    [name, description || null, price, category || null, image_path || null, is_available !== undefined ? is_available : 1]
  );
};

export const updateMenuItem = async (
  id: number,
  item: Partial<MenuItem>
): Promise<any> => {
  if (window.electronAPI?.menu?.update) {
    return await window.electronAPI.menu.update(id, item);
  }
  // Fallback to legacy method
  const { name, description, price, category, image_path, is_available } = item;
  return await dbQuery(
    'UPDATE menu_items SET name = ?, description = ?, price = ?, category = ?, image_path = ?, is_available = ? WHERE id = ?',
    [
      name,
      description || null,
      price,
      category || null,
      image_path || null,
      is_available !== undefined ? is_available : 1,
      id,
    ]
  );
};

export const deleteMenuItem = async (id: number): Promise<any> => {
  if (window.electronAPI?.menu?.delete) {
    return await window.electronAPI.menu.delete(id);
  }
  // Fallback to legacy method
  return await dbQuery('DELETE FROM menu_items WHERE id = ?', [id]);
};

// Orders
export const createOrder = async (orderData: OrderData): Promise<number> => {
  const { order_number, total_amount, subtotal, discount_amount = 0, payment_method, payment_status, table_id, customer_id, user_id, items } = orderData;

  // If payment_method is provided, default payment_status to 'paid', otherwise use provided value or 'pending'
  const finalPaymentStatus = payment_status || (payment_method ? 'paid' : 'pending');

  // Start transaction
  const orderResult = await dbQuery(
    'INSERT INTO orders (order_number, total_amount, subtotal, discount_amount, payment_method, table_id, customer_id, user_id, status, payment_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [order_number, total_amount, subtotal, discount_amount, payment_method, table_id || null, customer_id || null, user_id || null, 'pending', finalPaymentStatus]
  );

  const orderId = orderResult.lastInsertRowid;

  // Insert order items
  for (const item of items) {
    await dbQuery(
      'INSERT INTO order_items (order_id, menu_item_id, quantity, price, subtotal) VALUES (?, ?, ?, ?, ?)',
      [orderId, item.menu_item_id, item.quantity, item.price, item.subtotal]
    );
  }

  // Update table status if table_id is provided
  if (table_id) {
    await updateTable(table_id, { status: 'occupied', current_order_id: orderId });
  }

  // Update analytics
  await updateDailyAnalytics(new Date());

  return orderId;
};

export const getOrders = async (limit: number = 100): Promise<Order[]> => {
  return await dbQuery('SELECT * FROM orders ORDER BY created_at DESC LIMIT ?', [limit]);
};

export const updateOrder = async (id: number, orderData: Partial<Order>): Promise<any> => {
  const { status, payment_status, notes } = orderData;
  const updates: string[] = [];
  const values: any[] = [];
  
  if (status !== undefined) { updates.push('status = ?'); values.push(status); }
  if (payment_status !== undefined) { updates.push('payment_status = ?'); values.push(payment_status); }
  if (notes !== undefined) { updates.push('notes = ?'); values.push(notes || null); }
  
  if (updates.length === 0) {
    return { success: true };
  }
  
  values.push(id);
  return await dbQuery(
    `UPDATE orders SET ${updates.join(', ')} WHERE id = ?`,
    values
  );
};

export const deleteOrder = async (id: number, userId?: number): Promise<any> => {
  if (window.electronAPI?.order?.delete) {
    return await window.electronAPI.order.delete(id, userId);
  }
  // First, free up the table if the order is associated with one
  const order = await dbQuery('SELECT table_id FROM orders WHERE id = ?', [id]);
  if (order[0]?.table_id) {
    await updateTable(order[0].table_id, { status: 'available', current_order_id: undefined });
  }
  // Delete the order (order_items will be deleted automatically due to CASCADE)
  return await dbQuery('DELETE FROM orders WHERE id = ?', [id]);
};

export const getOrderItems = async (orderId: number): Promise<OrderItem[]> => {
  return await dbQuery(
    `SELECT oi.*, mi.name, mi.description 
     FROM order_items oi 
     JOIN menu_items mi ON oi.menu_item_id = mi.id 
     WHERE oi.order_id = ?`,
    [orderId]
  );
};

// Analytics
export const getDailyAnalytics = async (
  startDate: string,
  endDate: string
): Promise<Analytics[]> => {
  return await dbQuery(
    'SELECT * FROM analytics WHERE date BETWEEN ? AND ? ORDER BY date DESC',
    [startDate, endDate]
  );
};

export const getRevenueData = async (days: number = 30): Promise<Analytics[]> => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  return await dbQuery(
    `SELECT date, total_revenue, total_orders, average_order_value 
     FROM analytics 
     WHERE date >= ? 
     ORDER BY date ASC`,
    [startDate.toISOString().split('T')[0]]
  );
};

export const getTopSellingItems = async (limit: number = 10, startDate?: string, endDate?: string): Promise<any[]> => {
  let query = `SELECT mi.id, mi.name, SUM(oi.quantity) as total_quantity, SUM(oi.subtotal) as total_revenue
     FROM order_items oi
     JOIN menu_items mi ON oi.menu_item_id = mi.id
     JOIN orders o ON oi.order_id = o.id
     WHERE (o.status = 'completed' OR o.payment_status = 'paid')`;
  
  const params: any[] = [];
  
  if (startDate && endDate) {
    query += ` AND DATE(o.created_at) BETWEEN ? AND ?`;
    params.push(startDate, endDate);
  }
  
  query += ` GROUP BY mi.id, mi.name
     ORDER BY total_quantity DESC
     LIMIT ?`;
  params.push(limit);
  
  return await dbQuery(query, params);
};

export const getTotalItemsSold = async (startDate?: string, endDate?: string): Promise<number> => {
  let query = `SELECT SUM(oi.quantity) as total
     FROM order_items oi
     JOIN orders o ON oi.order_id = o.id
     WHERE (o.status = 'completed' OR o.payment_status = 'paid')`;
  
  const params: any[] = [];
  
  if (startDate && endDate) {
    query += ` AND DATE(o.created_at) BETWEEN ? AND ?`;
    params.push(startDate, endDate);
  }
  
  const result = await dbQuery(query, params);
  return result[0]?.total || 0;
};

const updateDailyAnalytics = async (date: Date): Promise<void> => {
  const dateStr = date.toISOString().split('T')[0];

  // Get today's orders
  const orders: Order[] = await dbQuery(
    `SELECT * FROM orders 
     WHERE DATE(created_at) = ? AND status = 'completed'`,
    [dateStr]
  );

  const totalRevenue = orders.reduce((sum, order) => sum + order.total_amount, 0);
  const totalOrders = orders.length;
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Check if analytics entry exists
  const existing = await dbQuery('SELECT * FROM analytics WHERE date = ?', [dateStr]);

  if (existing.length > 0) {
    await dbQuery(
      'UPDATE analytics SET total_revenue = ?, total_orders = ?, average_order_value = ? WHERE date = ?',
      [totalRevenue, totalOrders, averageOrderValue, dateStr]
    );
  } else {
    await dbQuery(
      'INSERT INTO analytics (date, total_revenue, total_orders, average_order_value) VALUES (?, ?, ?, ?)',
      [dateStr, totalRevenue, totalOrders, averageOrderValue]
    );
  }
};

// Media
export const saveMedia = async (filename: string, buffer: ArrayBuffer): Promise<string> => {
  if (window.electronAPI) {
    return await window.electronAPI.saveMedia(filename, buffer);
  }
  throw new Error('Electron API not available');
};

export const getMedia = async (filename: string): Promise<Buffer | null> => {
  if (window.electronAPI) {
    return await window.electronAPI.getMedia(filename);
  }
  return null;
};

// Customers
export const getCustomers = async (): Promise<Customer[]> => {
  return await dbQuery('SELECT * FROM customers ORDER BY name');
};

export const getCustomer = async (id: number): Promise<Customer | null> => {
  const results = await dbQuery('SELECT * FROM customers WHERE id = ?', [id]);
  return results.length > 0 ? results[0] : null;
};

export const addCustomer = async (customer: Omit<Customer, 'id' | 'created_at' | 'updated_at'>): Promise<any> => {
  const { name, email, phone, address, loyalty_points, notes } = customer;
  return await dbQuery(
    'INSERT INTO customers (name, email, phone, address, loyalty_points, notes) VALUES (?, ?, ?, ?, ?, ?)',
    [name, email || null, phone || null, address || null, loyalty_points || 0, notes || null]
  );
};

export const updateCustomer = async (id: number, customer: Partial<Customer>): Promise<any> => {
  const { name, email, phone, address, loyalty_points, total_orders, total_spent, notes } = customer;
  return await dbQuery(
    'UPDATE customers SET name = ?, email = ?, phone = ?, address = ?, loyalty_points = ?, total_orders = ?, total_spent = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [name, email || null, phone || null, address || null, loyalty_points, total_orders, total_spent, notes || null, id]
  );
};

export const deleteCustomer = async (id: number): Promise<any> => {
  return await dbQuery('DELETE FROM customers WHERE id = ?', [id]);
};

// Inventory
export const getInventoryItems = async (): Promise<InventoryItem[]> => {
  return await dbQuery('SELECT * FROM inventory_items ORDER BY name');
};

export const getInventoryItem = async (id: number): Promise<InventoryItem | null> => {
  const results = await dbQuery('SELECT * FROM inventory_items WHERE id = ?', [id]);
  return results.length > 0 ? results[0] : null;
};

export const getLowStockItems = async (): Promise<InventoryItem[]> => {
  return await dbQuery(
    'SELECT * FROM inventory_items WHERE current_stock <= min_stock ORDER BY current_stock ASC'
  );
};

export const addInventoryItem = async (item: Omit<InventoryItem, 'id' | 'created_at' | 'updated_at'>): Promise<any> => {
  const { name, description, unit, current_stock, min_stock, max_stock, cost_per_unit, supplier, category, location, barcode } = item;
  return await dbQuery(
    'INSERT INTO inventory_items (name, description, unit, current_stock, min_stock, max_stock, cost_per_unit, supplier, category, location, barcode) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [name, description || null, unit || 'unit', current_stock || 0, min_stock || 0, max_stock || 0, cost_per_unit || 0, supplier || null, category || null, location || null, barcode || null]
  );
};

export const updateInventoryItem = async (id: number, item: Partial<InventoryItem>): Promise<any> => {
  const { name, description, unit, current_stock, min_stock, max_stock, cost_per_unit, supplier, category, location, barcode } = item;
  return await dbQuery(
    'UPDATE inventory_items SET name = ?, description = ?, unit = ?, current_stock = ?, min_stock = ?, max_stock = ?, cost_per_unit = ?, supplier = ?, category = ?, location = ?, barcode = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [name, description || null, unit, current_stock, min_stock, max_stock, cost_per_unit, supplier || null, category || null, location || null, barcode || null, id]
  );
};

export const deleteInventoryItem = async (id: number): Promise<any> => {
  return await dbQuery('DELETE FROM inventory_items WHERE id = ?', [id]);
};

// Inventory Transactions
export const addInventoryTransaction = async (transaction: Omit<InventoryTransaction, 'id' | 'created_at'>): Promise<any> => {
  const { inventory_item_id, transaction_type, quantity, unit_cost, reference_type, reference_id, notes, created_by } = transaction;
  
  // Add transaction
  const result = await dbQuery(
    'INSERT INTO inventory_transactions (inventory_item_id, transaction_type, quantity, unit_cost, reference_type, reference_id, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [inventory_item_id, transaction_type, quantity, unit_cost || null, reference_type || null, reference_id || null, notes || null, created_by || null]
  );

  // Update inventory stock based on transaction type
  if (transaction_type === 'in' || transaction_type === 'adjustment') {
    await dbQuery(
      'UPDATE inventory_items SET current_stock = current_stock + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [quantity, inventory_item_id]
    );
  } else if (transaction_type === 'out' || transaction_type === 'waste') {
    await dbQuery(
      'UPDATE inventory_items SET current_stock = current_stock - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [quantity, inventory_item_id]
    );
  }

  return result;
};

export const getInventoryTransactions = async (inventoryItemId?: number): Promise<InventoryTransaction[]> => {
  if (inventoryItemId) {
    return await dbQuery(
      'SELECT * FROM inventory_transactions WHERE inventory_item_id = ? ORDER BY created_at DESC',
      [inventoryItemId]
    );
  }
  return await dbQuery('SELECT * FROM inventory_transactions ORDER BY created_at DESC');
};

// Categories
export const getCategories = async (): Promise<Category[]> => {
  if (window.electronAPI?.category?.getAll) {
    return await window.electronAPI.category.getAll();
  }
  // Fallback to legacy method
  return await dbQuery('SELECT * FROM categories ORDER BY display_order, name');
};

export const addCategory = async (category: Omit<Category, 'id' | 'created_at'>): Promise<any> => {
  if (window.electronAPI?.category?.create) {
    return await window.electronAPI.category.create(category);
  }
  // Fallback to legacy method
  if (!window.electronAPI) {
    throw new Error('Electron API not available. Please ensure you are running the application in Electron.');
  }
  const { name, description, display_order } = category;
  return await dbQuery(
    'INSERT INTO categories (name, description, display_order) VALUES (?, ?, ?)',
    [name, description || null, display_order || 0]
  );
};

export const updateCategory = async (id: number, category: Partial<Category>): Promise<any> => {
  if (window.electronAPI?.category?.update) {
    return await window.electronAPI.category.update(id, category);
  }
  // Fallback to legacy method
  const { name, description, display_order } = category;
  return await dbQuery(
    'UPDATE categories SET name = ?, description = ?, display_order = ? WHERE id = ?',
    [name, description || null, display_order, id]
  );
};

export const deleteCategory = async (id: number): Promise<any> => {
  if (window.electronAPI?.category?.delete) {
    return await window.electronAPI.category.delete(id);
  }
  // Fallback to legacy method
  return await dbQuery('DELETE FROM categories WHERE id = ?', [id]);
};

// Tables
export const getTables = async (): Promise<Table[]> => {
  if (window.electronAPI?.table?.getAll) {
    return await window.electronAPI.table.getAll();
  }
  // Fallback to legacy method
  return await dbQuery('SELECT * FROM tables ORDER BY CAST(number AS INTEGER), number');
};

export const getTable = async (id: number): Promise<Table | null> => {
  if (window.electronAPI?.table?.getById) {
    return await window.electronAPI.table.getById(id);
  }
  // Fallback to legacy method
  const results = await dbQuery('SELECT * FROM tables WHERE id = ?', [id]);
  return results.length > 0 ? results[0] : null;
};

export const getTablesByStatus = async (status: 'available' | 'occupied' | 'reserved' | 'cleaning'): Promise<Table[]> => {
  if (window.electronAPI?.table?.getByStatus) {
    return await window.electronAPI.table.getByStatus(status);
  }
  // Fallback to legacy method
  return await dbQuery('SELECT * FROM tables WHERE status = ? ORDER BY CAST(number AS INTEGER), number', [status]);
};

export const addTable = async (table: Omit<Table, 'id' | 'created_at' | 'updated_at'>): Promise<any> => {
  if (window.electronAPI?.table?.create) {
    return await window.electronAPI.table.create(table);
  }
  // Fallback to legacy method
  const { number, name, capacity, status, notes } = table;
  return await dbQuery(
    'INSERT INTO tables (number, name, capacity, status, notes) VALUES (?, ?, ?, ?, ?)',
    [number, name || null, capacity || 4, status || 'available', notes || null]
  );
};

export const updateTable = async (id: number, table: Partial<Table>): Promise<any> => {
  if (window.electronAPI?.table?.update) {
    return await window.electronAPI.table.update(id, table);
  }
  // Fallback to legacy method
  const { number, name, capacity, status, current_order_id, notes } = table;
  const updates: string[] = [];
  const values: any[] = [];
  
  if (number !== undefined) { updates.push('number = ?'); values.push(number); }
  if (name !== undefined) { updates.push('name = ?'); values.push(name || null); }
  if (capacity !== undefined) { updates.push('capacity = ?'); values.push(capacity); }
  if (status !== undefined) { updates.push('status = ?'); values.push(status); }
  if (current_order_id !== undefined) { updates.push('current_order_id = ?'); values.push(current_order_id || null); }
  if (notes !== undefined) { updates.push('notes = ?'); values.push(notes || null); }
  
  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);
  
  return await dbQuery(
    `UPDATE tables SET ${updates.join(', ')} WHERE id = ?`,
    values
  );
};

export const deleteTable = async (id: number): Promise<any> => {
  if (window.electronAPI?.table?.delete) {
    return await window.electronAPI.table.delete(id);
  }
  // Fallback to legacy method
  return await dbQuery('DELETE FROM tables WHERE id = ?', [id]);
};

export const updateTableStatus = async (id: number, status: 'available' | 'occupied' | 'reserved' | 'cleaning'): Promise<any> => {
  if (window.electronAPI?.table?.updateStatus) {
    return await window.electronAPI.table.updateStatus(id, status);
  }
  // Fallback to legacy method
  return await updateTable(id, { status });
};

// Option Groups
export const getOptionGroups = async (): Promise<OptionGroup[]> => {
  if (window.electronAPI?.optionGroup?.getAll) {
    return await window.electronAPI.optionGroup.getAll();
  }
  // Fallback to legacy method
  return await dbQuery('SELECT * FROM option_groups ORDER BY display_order, name');
};

export const getOptionGroup = async (id: number): Promise<OptionGroup | null> => {
  if (window.electronAPI?.optionGroup?.getById) {
    return await window.electronAPI.optionGroup.getById(id);
  }
  // Fallback to legacy method
  const results = await dbQuery('SELECT * FROM option_groups WHERE id = ?', [id]);
  return results.length > 0 ? results[0] : null;
};

export const addOptionGroup = async (group: Omit<OptionGroup, 'id' | 'created_at'>): Promise<any> => {
  if (window.electronAPI?.optionGroup?.create) {
    return await window.electronAPI.optionGroup.create(group);
  }
  // Fallback to legacy method
  const { name, description, is_required, min_selections, max_selections, display_order } = group;
  return await dbQuery(
    'INSERT INTO option_groups (name, description, is_required, min_selections, max_selections, display_order) VALUES (?, ?, ?, ?, ?, ?)',
    [name, description || null, is_required || 0, min_selections || 1, max_selections || 1, display_order || 0]
  );
};

export const updateOptionGroup = async (id: number, group: Partial<OptionGroup>): Promise<any> => {
  if (window.electronAPI?.optionGroup?.update) {
    return await window.electronAPI.optionGroup.update(id, group);
  }
  // Fallback to legacy method
  const { name, description, is_required, min_selections, max_selections, display_order } = group;
  return await dbQuery(
    'UPDATE option_groups SET name = ?, description = ?, is_required = ?, min_selections = ?, max_selections = ?, display_order = ? WHERE id = ?',
    [name, description || null, is_required, min_selections, max_selections, display_order, id]
  );
};

export const deleteOptionGroup = async (id: number): Promise<any> => {
  if (window.electronAPI?.optionGroup?.delete) {
    return await window.electronAPI.optionGroup.delete(id);
  }
  // Fallback to legacy method
  return await dbQuery('DELETE FROM option_groups WHERE id = ?', [id]);
};

// Options
export const getOptions = async (optionGroupId?: number): Promise<Option[]> => {
  if (window.electronAPI?.option?.getAll) {
    return await window.electronAPI.option.getAll(optionGroupId);
  }
  // Fallback to legacy method
  if (optionGroupId) {
    return await dbQuery('SELECT * FROM options WHERE option_group_id = ? ORDER BY display_order, name', [optionGroupId]);
  }
  return await dbQuery('SELECT * FROM options ORDER BY option_group_id, display_order, name');
};

export const addOption = async (option: Omit<Option, 'id' | 'created_at'>): Promise<any> => {
  if (window.electronAPI?.option?.create) {
    return await window.electronAPI.option.create(option);
  }
  // Fallback to legacy method
  const { option_group_id, name, description, price_modifier, display_order, is_available } = option;
  return await dbQuery(
    'INSERT INTO options (option_group_id, name, description, price_modifier, display_order, is_available) VALUES (?, ?, ?, ?, ?, ?)',
    [option_group_id, name, description || null, price_modifier || 0, display_order || 0, is_available !== undefined ? is_available : 1]
  );
};

export const updateOption = async (id: number, option: Partial<Option>): Promise<any> => {
  if (window.electronAPI?.option?.update) {
    return await window.electronAPI.option.update(id, option);
  }
  // Fallback to legacy method
  const { name, description, price_modifier, display_order, is_available } = option;
  return await dbQuery(
    'UPDATE options SET name = ?, description = ?, price_modifier = ?, display_order = ?, is_available = ? WHERE id = ?',
    [name, description || null, price_modifier, display_order, is_available, id]
  );
};

export const deleteOption = async (id: number): Promise<any> => {
  if (window.electronAPI?.option?.delete) {
    return await window.electronAPI.option.delete(id);
  }
  // Fallback to legacy method
  return await dbQuery('DELETE FROM options WHERE id = ?', [id]);
};

// Menu Item Option Groups
export const getMenuItemOptionGroups = async (menuItemId: number): Promise<MenuItemOptionGroup[]> => {
  return await dbQuery(
    'SELECT * FROM menu_item_option_groups WHERE menu_item_id = ? ORDER BY display_order',
    [menuItemId]
  );
};

export const addMenuItemOptionGroup = async (link: Omit<MenuItemOptionGroup, 'id'>): Promise<any> => {
  const { menu_item_id, option_group_id, display_order } = link;
  return await dbQuery(
    'INSERT INTO menu_item_option_groups (menu_item_id, option_group_id, display_order) VALUES (?, ?, ?)',
    [menu_item_id, option_group_id, display_order || 0]
  );
};

export const removeMenuItemOptionGroup = async (menuItemId: number, optionGroupId: number): Promise<any> => {
  return await dbQuery(
    'DELETE FROM menu_item_option_groups WHERE menu_item_id = ? AND option_group_id = ?',
    [menuItemId, optionGroupId]
  );
};

// Addons
export const getAddons = async (): Promise<Addon[]> => {
  if (window.electronAPI?.addon?.getAll) {
    const allAddons = await window.electronAPI.addon.getAll();
    return allAddons.filter((a: Addon) => a.is_available !== 0);
  }
  // Fallback to legacy method
  return await dbQuery('SELECT * FROM addons WHERE is_available = 1 ORDER BY category, name');
};

export const getAllAddons = async (): Promise<Addon[]> => {
  if (window.electronAPI?.addon?.getAll) {
    return await window.electronAPI.addon.getAll();
  }
  // Fallback to legacy method
  return await dbQuery('SELECT * FROM addons ORDER BY category, name');
};

export const getAddon = async (id: number): Promise<Addon | null> => {
  if (window.electronAPI?.addon?.getById) {
    return await window.electronAPI.addon.getById(id);
  }
  // Fallback to legacy method
  const results = await dbQuery('SELECT * FROM addons WHERE id = ?', [id]);
  return results.length > 0 ? results[0] : null;
};

export const addAddon = async (addon: Omit<Addon, 'id' | 'created_at'>): Promise<any> => {
  if (window.electronAPI?.addon?.create) {
    return await window.electronAPI.addon.create(addon);
  }
  // Fallback to legacy method
  const { name, description, price, category, is_available } = addon;
  return await dbQuery(
    'INSERT INTO addons (name, description, price, category, is_available) VALUES (?, ?, ?, ?, ?)',
    [name, description || null, price, category || null, is_available !== undefined ? is_available : 1]
  );
};

export const updateAddon = async (id: number, addon: Partial<Addon>): Promise<any> => {
  if (window.electronAPI?.addon?.update) {
    return await window.electronAPI.addon.update(id, addon);
  }
  // Fallback to legacy method
  const { name, description, price, category, is_available } = addon;
  return await dbQuery(
    'UPDATE addons SET name = ?, description = ?, price = ?, category = ?, is_available = ? WHERE id = ?',
    [name, description || null, price, category || null, is_available, id]
  );
};

export const deleteAddon = async (id: number): Promise<any> => {
  if (window.electronAPI?.addon?.delete) {
    return await window.electronAPI.addon.delete(id);
  }
  // Fallback to legacy method
  return await dbQuery('DELETE FROM addons WHERE id = ?', [id]);
};

// Menu Item Addons
export const getMenuItemAddons = async (menuItemId: number): Promise<Addon[]> => {
  return await dbQuery(
    `SELECT a.* FROM addons a
     INNER JOIN menu_item_addons mia ON a.id = mia.addon_id
     WHERE mia.menu_item_id = ? AND a.is_available = 1
     ORDER BY mia.display_order, a.name`,
    [menuItemId]
  );
};

export const addMenuItemAddon = async (link: Omit<MenuItemAddon, 'id'>): Promise<any> => {
  const { menu_item_id, addon_id, display_order } = link;
  return await dbQuery(
    'INSERT INTO menu_item_addons (menu_item_id, addon_id, display_order) VALUES (?, ?, ?)',
    [menu_item_id, addon_id, display_order || 0]
  );
};

export const removeMenuItemAddon = async (menuItemId: number, addonId: number): Promise<any> => {
  return await dbQuery(
    'DELETE FROM menu_item_addons WHERE menu_item_id = ? AND addon_id = ?',
    [menuItemId, addonId]
  );
};

// Menu Item Sizes (per-menu-item)
export interface MenuItemSize {
  id?: number;
  menu_item_id: number;
  name: string;
  price: number;
  display_order?: number;
  is_default?: number;
  created_at?: string;
}

export const getMenuItemSizes = async (menuItemId: number): Promise<MenuItemSize[]> => {
  if (window.electronAPI?.menu?.getSizes) {
    return await window.electronAPI.menu.getSizes(menuItemId);
  }
  return await dbQuery('SELECT * FROM menu_item_sizes WHERE menu_item_id = ? ORDER BY display_order, name', [menuItemId]);
};

export const saveMenuItemSizes = async (menuItemId: number, sizes: Omit<MenuItemSize, 'id' | 'menu_item_id' | 'created_at'>[]): Promise<any> => {
  if (window.electronAPI?.menu?.saveSizes) {
    return await window.electronAPI.menu.saveSizes(menuItemId, sizes);
  }
  // Delete existing sizes
  await dbQuery('DELETE FROM menu_item_sizes WHERE menu_item_id = ?', [menuItemId]);
  // Insert new sizes
  for (const size of sizes) {
    await dbQuery(
      'INSERT INTO menu_item_sizes (menu_item_id, name, price, display_order, is_default) VALUES (?, ?, ?, ?, ?)',
      [menuItemId, size.name, size.price, size.display_order || 0, size.is_default ? 1 : 0]
    );
  }
};

// Menu Item Custom Options (per-menu-item)
export interface MenuItemCustomOption {
  id?: number;
  menu_item_id: number;
  name: string;
  price: number;
  display_order?: number;
  is_available?: number;
  created_at?: string;
}

export const getMenuItemCustomOptions = async (menuItemId: number): Promise<MenuItemCustomOption[]> => {
  if (window.electronAPI?.menu?.getCustomOptions) {
    return await window.electronAPI.menu.getCustomOptions(menuItemId);
  }
  return await dbQuery('SELECT * FROM menu_item_custom_options WHERE menu_item_id = ? ORDER BY display_order, name', [menuItemId]);
};

export const saveMenuItemCustomOptions = async (menuItemId: number, options: Omit<MenuItemCustomOption, 'id' | 'menu_item_id' | 'created_at'>[]): Promise<any> => {
  if (window.electronAPI?.menu?.saveCustomOptions) {
    return await window.electronAPI.menu.saveCustomOptions(menuItemId, options);
  }
  // Delete existing options
  await dbQuery('DELETE FROM menu_item_custom_options WHERE menu_item_id = ?', [menuItemId]);
  // Insert new options
  for (const option of options) {
    await dbQuery(
      'INSERT INTO menu_item_custom_options (menu_item_id, name, price, display_order, is_available) VALUES (?, ?, ?, ?, ?)',
      [menuItemId, option.name, option.price, option.display_order || 0, option.is_available !== undefined ? (option.is_available ? 1 : 0) : 1]
    );
  }
};

// Order Item Options & Addons
export const addOrderItemOption = async (orderItemOption: Omit<OrderItemOption, 'id'>): Promise<any> => {
  const { order_item_id, option_id, option_group_id, price_modifier } = orderItemOption;
  return await dbQuery(
    'INSERT INTO order_item_options (order_item_id, option_id, option_group_id, price_modifier) VALUES (?, ?, ?, ?)',
    [order_item_id, option_id, option_group_id, price_modifier || 0]
  );
};

export const getOrderItemOptions = async (orderItemId: number): Promise<OrderItemOption[]> => {
  return await dbQuery(
    `SELECT oio.*, o.name as option_name, og.name as option_group_name
     FROM order_item_options oio
     JOIN options o ON oio.option_id = o.id
     JOIN option_groups og ON oio.option_group_id = og.id
     WHERE oio.order_item_id = ?`,
    [orderItemId]
  );
};

export const addOrderItemAddon = async (orderItemAddon: Omit<OrderItemAddon, 'id'>): Promise<any> => {
  const { order_item_id, addon_id, quantity, price, subtotal } = orderItemAddon;
  return await dbQuery(
    'INSERT INTO order_item_addons (order_item_id, addon_id, quantity, price, subtotal) VALUES (?, ?, ?, ?, ?)',
    [order_item_id, addon_id, quantity || 1, price, subtotal]
  );
};

export const getOrderItemAddons = async (orderItemId: number): Promise<OrderItemAddon[]> => {
  return await dbQuery(
    `SELECT oia.*, a.name as addon_name
     FROM order_item_addons oia
     JOIN addons a ON oia.addon_id = a.id
     WHERE oia.order_item_id = ?`,
    [orderItemId]
  );
};

// Users & Authentication
export const getUserByUsername = async (username: string): Promise<User | null> => {
  if (window.electronAPI?.user?.getByUsername) {
    return await window.electronAPI.user.getByUsername(username);
  }
  const users = await dbQuery('SELECT * FROM users WHERE username = ? AND is_active = 1', [username]);
  return users[0] || null;
};

export const getAllUsers = async (): Promise<User[]> => {
  if (window.electronAPI?.user?.getAll) {
    return await window.electronAPI.user.getAll();
  }
  return await dbQuery('SELECT id, username, role, full_name, email, is_active, last_login, created_at, updated_at FROM users ORDER BY created_at DESC');
};

export const createUser = async (userData: Omit<User, 'id' | 'created_at' | 'updated_at' | 'last_login'>): Promise<any> => {
  if (window.electronAPI?.user?.create) {
    return await window.electronAPI.user.create(userData);
  }
  return await dbQuery(
    'INSERT INTO users (username, password_hash, role, full_name, email, is_active) VALUES (?, ?, ?, ?, ?, ?)',
    [userData.username, userData.password_hash || '', userData.role, userData.full_name || null, userData.email || null, userData.is_active !== undefined ? userData.is_active : 1]
  );
};

export const updateUser = async (id: number, userData: Partial<User>): Promise<any> => {
  if (window.electronAPI?.user?.update) {
    return await window.electronAPI.user.update(id, userData);
  }
  const updates: string[] = [];
  const values: any[] = [];
  
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
  
  return await dbQuery(
    `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
    values
  );
};

export const updateUserLastLogin = async (id: number): Promise<any> => {
  if (window.electronAPI?.user?.updateLastLogin) {
    return await window.electronAPI.user.updateLastLogin(id);
  }
  return await dbQuery('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [id]);
};

export const deleteUser = async (id: number): Promise<any> => {
  if (window.electronAPI?.user?.delete) {
    return await window.electronAPI.user.delete(id);
  }
  return await dbQuery('DELETE FROM users WHERE id = ?', [id]);
};

// Settings
export const getAllSettings = async (): Promise<Setting[]> => {
  if (window.electronAPI?.settings?.getAll) {
    return await window.electronAPI.settings.getAll();
  }
  return await dbQuery('SELECT * FROM settings ORDER BY category, key');
};

export const getSetting = async (key: string): Promise<Setting | null> => {
  if (window.electronAPI?.settings?.get) {
    return await window.electronAPI.settings.get(key);
  }
  const settings = await dbQuery('SELECT * FROM settings WHERE key = ?', [key]);
  return settings[0] || null;
};

export const updateSetting = async (key: string, value: string): Promise<any> => {
  if (window.electronAPI?.settings?.update) {
    return await window.electronAPI.settings.update(key, value);
  }
  const exists = await getSetting(key);
  if (exists) {
    return await dbQuery('UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?', [value, key]);
  } else {
    return await dbQuery('INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)', [key, value]);
  }
};

export const updateSettings = async (settings: { key: string; value: string }[]): Promise<any> => {
  if (window.electronAPI?.settings?.updateMultiple) {
    return await window.electronAPI.settings.updateMultiple(settings);
  }
  for (const setting of settings) {
    await updateSetting(setting.key, setting.value);
  }
};

