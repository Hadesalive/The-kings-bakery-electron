// Table service for handling table operations
import { dbQuery } from './databaseService.js';

/**
 * Get all tables
 * @returns {Promise<Array>} Array of tables
 */
export function getAllTables() {
  try {
    return dbQuery(
      'SELECT * FROM tables ORDER BY CAST(number AS INTEGER), number'
    );
  } catch (error) {
    console.error('Error getting tables:', error);
    throw new Error('Failed to retrieve tables');
  }
}

/**
 * Get a single table by ID
 * @param {number} id - Table ID
 * @returns {Promise<Object|null>} Table or null if not found
 */
export function getTableById(id) {
  try {
    const results = dbQuery(
      'SELECT * FROM tables WHERE id = ?',
      [id]
    );
    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('Error getting table by ID:', error);
    throw new Error('Failed to retrieve table');
  }
}

/**
 * Get tables by status
 * @param {string} status - Table status ('available', 'occupied', 'reserved', 'cleaning')
 * @returns {Promise<Array>} Array of tables with the specified status
 */
export function getTablesByStatus(status) {
  try {
    return dbQuery(
      'SELECT * FROM tables WHERE status = ? ORDER BY CAST(number AS INTEGER), number',
      [status]
    );
  } catch (error) {
    console.error('Error getting tables by status:', error);
    throw new Error('Failed to retrieve tables by status');
  }
}

/**
 * Create a new table
 * @param {Object} tableData - Table data
 * @param {string} tableData.number - Table number (required)
 * @param {string} [tableData.name] - Table name
 * @param {number} [tableData.capacity] - Table capacity (default 4)
 * @param {string} [tableData.status] - Table status (default 'available')
 * @param {string} [tableData.notes] - Table notes
 * @returns {Promise<Object>} Created table with ID
 */
export function createTable(tableData) {
  try {
    const { number, name, capacity = 4, status = 'available', notes } = tableData;

    // Validation
    if (!number || !number.trim()) {
      throw new Error('Table number is required');
    }

    // Check if table number already exists
    const existing = dbQuery(
      'SELECT id FROM tables WHERE number = ?',
      [number.trim()]
    );
    if (existing.length > 0) {
      throw new Error('Table number already exists');
    }

    // Validate status
    const validStatuses = ['available', 'occupied', 'reserved', 'cleaning'];
    if (status && !validStatuses.includes(status)) {
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    // Validate capacity
    if (capacity && (isNaN(capacity) || capacity < 1)) {
      throw new Error('Capacity must be a positive number');
    }

    const result = dbQuery(
      `INSERT INTO tables (number, name, capacity, status, notes, updated_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [number.trim(), name?.trim() || null, capacity, status, notes?.trim() || null]
    );

    const newTable = getTableById(result.lastInsertRowid);
    return newTable;
  } catch (error) {
    console.error('Error creating table:', error);
    throw error;
  }
}

/**
 * Update a table
 * @param {number} id - Table ID
 * @param {Object} tableData - Updated table data
 * @returns {Promise<Object>} Updated table
 */
export function updateTable(id, tableData) {
  try {
    const { number, name, capacity, status, current_order_id, notes } = tableData;

    // Check if table exists
    const existing = getTableById(id);
    if (!existing) {
      throw new Error('Table not found');
    }

    // If number is being updated, check for duplicates
    if (number && number.trim() !== existing.number) {
      const duplicate = dbQuery(
        'SELECT id FROM tables WHERE number = ? AND id != ?',
        [number.trim(), id]
      );
      if (duplicate.length > 0) {
        throw new Error('Table number already exists');
      }
    }

    // Validate status if provided
    if (status) {
      const validStatuses = ['available', 'occupied', 'reserved', 'cleaning'];
      if (!validStatuses.includes(status)) {
        throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
      }
    }

    // Validate capacity if provided
    if (capacity !== undefined && (isNaN(capacity) || capacity < 1)) {
      throw new Error('Capacity must be a positive number');
    }

    // Build update query dynamically
    const updates = [];
    const values = [];

    if (number !== undefined) updates.push('number = ?'), values.push(number.trim());
    if (name !== undefined) updates.push('name = ?'), values.push(name?.trim() || null);
    if (capacity !== undefined) updates.push('capacity = ?'), values.push(capacity);
    if (status !== undefined) updates.push('status = ?'), values.push(status);
    if (current_order_id !== undefined) updates.push('current_order_id = ?'), values.push(current_order_id || null);
    if (notes !== undefined) updates.push('notes = ?'), values.push(notes?.trim() || null);

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    dbQuery(
      `UPDATE tables SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    return getTableById(id);
  } catch (error) {
    console.error('Error updating table:', error);
    throw error;
  }
}

/**
 * Delete a table
 * @param {number} id - Table ID
 * @returns {Promise<boolean>} True if deleted
 */
export function deleteTable(id) {
  try {
    // Check if table exists
    const existing = getTableById(id);
    if (!existing) {
      throw new Error('Table not found');
    }

    // Check if table has active orders
    const activeOrders = dbQuery(
      "SELECT id FROM orders WHERE table_id = ? AND status IN ('pending', 'preparing', 'ready')",
      [id]
    );
    if (activeOrders.length > 0) {
      throw new Error('Cannot delete table with active orders');
    }

    dbQuery('DELETE FROM tables WHERE id = ?', [id]);
    return true;
  } catch (error) {
    console.error('Error deleting table:', error);
    throw error;
  }
}

/**
 * Update table status
 * @param {number} id - Table ID
 * @param {string} status - New status
 * @returns {Promise<Object>} Updated table
 */
export function updateTableStatus(id, status) {
  try {
    const validStatuses = ['available', 'occupied', 'reserved', 'cleaning'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    return updateTable(id, { status });
  } catch (error) {
    console.error('Error updating table status:', error);
    throw error;
  }
}

