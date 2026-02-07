// Menu service for handling menu item operations
import { dbQuery } from './databaseService.js';

/**
 * Get all menu items
 * @returns {Promise<Array>} Array of menu items
 */
export async function getAllMenuItems() {
  try {
    return dbQuery(
      'SELECT * FROM menu_items ORDER BY category, name'
    );
  } catch (error) {
    console.error('Error getting all menu items:', error);
    throw new Error('Failed to retrieve menu items');
  }
}

/**
 * Get available menu items only
 * @returns {Promise<Array>} Array of available menu items
 */
export async function getAvailableMenuItems() {
  try {
    return dbQuery(
      'SELECT * FROM menu_items WHERE is_available = 1 ORDER BY category, name'
    );
  } catch (error) {
    console.error('Error getting available menu items:', error);
    throw new Error('Failed to retrieve available menu items');
  }
}

/**
 * Get a single menu item by ID
 * @param {number} id - Menu item ID
 * @returns {Promise<Object|null>} Menu item or null if not found
 */
export async function getMenuItemById(id) {
  try {
    const results = dbQuery(
      'SELECT * FROM menu_items WHERE id = ?',
      [id]
    );
    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('Error getting menu item by ID:', error);
    throw new Error('Failed to retrieve menu item');
  }
}

/**
 * Create a new menu item
 * @param {Object} itemData - Menu item data
 * @param {string} itemData.name - Item name (required)
 * @param {string} [itemData.description] - Item description
 * @param {number} itemData.price - Item price (required)
 * @param {string} [itemData.category] - Item category
 * @param {string} [itemData.image_path] - Image path
 * @param {number} [itemData.is_available] - Availability (1 or 0, default 1)
 * @returns {Promise<Object>} Created menu item with ID
 */
export async function createMenuItem(itemData) {
  try {
    const { name, description, price, category, image_path, is_available = 1, option_groups = [], addons = [] } = itemData;

    // Validation
    if (!name || !name.trim()) {
      throw new Error('Menu item name is required');
    }
    if (price === undefined || price === null || isNaN(price) || price < 0) {
      throw new Error('Valid price is required');
    }

    const insertQuery = `INSERT INTO menu_items (name, description, price, category, image_path, is_available, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`;
    const insertParams = [
      name.trim(),
      description?.trim() || null,
      price,
      category?.trim() || null,
      image_path || null,
      is_available ? 1 : 0,
    ];
    const result = dbQuery(insertQuery, insertParams);
    return await getMenuItemById(result.lastInsertRowid);
  } catch (error) {
    console.error('Error creating menu item:', error);
    if (error.message.includes('required') || error.message.includes('Valid')) {
      throw error;
    }
    throw new Error('Failed to create menu item');
  }
}

/**
 * Update an existing menu item
 * @param {number} id - Menu item ID
 * @param {Object} itemData - Updated menu item data
 * @returns {Promise<Object>} Updated menu item
 */
export async function updateMenuItem(id, itemData) {
  try {
    // Check if item exists
    const existingItem = await getMenuItemById(id);
    if (!existingItem) {
      throw new Error('Menu item not found');
    }

    const { name, description, price, category, image_path, is_available, option_groups, addons } = itemData;

    // Build update query dynamically based on provided fields
    const updates = [];
    const values = [];

    if (name !== undefined) {
      if (!name || !name.trim()) {
        throw new Error('Menu item name cannot be empty');
      }
      updates.push('name = ?');
      values.push(name.trim());
    }

    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description?.trim() || null);
    }

    if (price !== undefined) {
      if (isNaN(price) || price < 0) {
        throw new Error('Price must be a valid positive number');
      }
      updates.push('price = ?');
      values.push(price);
    }

    if (category !== undefined) {
      updates.push('category = ?');
      values.push(category?.trim() || null);
    }

    if (image_path !== undefined) {
      updates.push('image_path = ?');
      values.push(image_path || null);
    }

    if (is_available !== undefined) {
      updates.push('is_available = ?');
      values.push(is_available ? 1 : 0);
    }

    if (updates.length === 0) {
      return existingItem; // No updates provided
    }

    // Always update the updated_at timestamp
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const query = `UPDATE menu_items SET ${updates.join(', ')} WHERE id = ?`;
    dbQuery(query, values);

    // Return the updated item
    const updatedItem = await getMenuItemById(id);
    return updatedItem;
  } catch (error) {
    console.error('Error updating menu item:', error);
    if (error.message.includes('not found') || error.message.includes('cannot be empty') || error.message.includes('must be')) {
      throw error;
    }
    throw new Error('Failed to update menu item');
  }
}

/**
 * Delete a menu item
 * @param {number} id - Menu item ID
 * @returns {Promise<boolean>} True if deleted successfully
 */
export async function deleteMenuItem(id) {
  try {
    // Check if item exists
    const existingItem = await getMenuItemById(id);
    if (!existingItem) {
      throw new Error('Menu item not found');
    }

    // Check if item is used in any orders
    const orderItems = dbQuery(
      'SELECT COUNT(*) as count FROM order_items WHERE menu_item_id = ?',
      [id]
    );

    if (orderItems[0]?.count > 0) {
      throw new Error('Cannot delete menu item that has been used in orders. Consider marking it as unavailable instead.');
    }

    // Delete the item
    dbQuery('DELETE FROM menu_items WHERE id = ?', [id]);
    return true;
  } catch (error) {
    console.error('Error deleting menu item:', error);
    if (error.message.includes('not found') || error.message.includes('Cannot delete')) {
      throw error;
    }
    throw new Error('Failed to delete menu item');
  }
}

/**
 * Toggle menu item availability
 * @param {number} id - Menu item ID
 * @returns {Promise<Object>} Updated menu item
 */
export async function toggleMenuItemAvailability(id) {
  try {
    const item = await getMenuItemById(id);
    if (!item) {
      throw new Error('Menu item not found');
    }

    const newAvailability = item.is_available === 1 ? 0 : 1;
    return await updateMenuItem(id, { is_available: newAvailability });
  } catch (error) {
    console.error('Error toggling menu item availability:', error);
    if (error.message.includes('not found')) {
      throw error;
    }
    throw new Error('Failed to toggle menu item availability');
  }
}

/**
 * Get sizes for a menu item
 * @param {number} menuItemId - Menu item ID
 * @returns {Array} Array of sizes
 */
export function getMenuItemSizes(menuItemId) {
  try {
    return dbQuery('SELECT * FROM menu_item_sizes WHERE menu_item_id = ? ORDER BY display_order, name', [menuItemId]);
  } catch (error) {
    console.error('Error getting menu item sizes:', error);
    throw new Error('Failed to retrieve menu item sizes');
  }
}

/**
 * Save sizes for a menu item
 * @param {number} menuItemId - Menu item ID
 * @param {Array} sizes - Array of size objects
 * @returns {boolean} True if successful
 */
export function saveMenuItemSizes(menuItemId, sizes) {
  try {
    // Delete existing sizes
    dbQuery('DELETE FROM menu_item_sizes WHERE menu_item_id = ?', [menuItemId]);
    
    // Insert new sizes
    if (sizes && sizes.length > 0) {
      sizes.forEach((size, index) => {
        dbQuery(
          'INSERT INTO menu_item_sizes (menu_item_id, name, price, display_order, is_default) VALUES (?, ?, ?, ?, ?)',
          [
            menuItemId,
            size.name,
            size.price,
            size.display_order || index,
            size.is_default ? 1 : 0
          ]
        );
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error saving menu item sizes:', error);
    throw error;
  }
}

/**
 * Get custom options for a menu item
 * @param {number} menuItemId - Menu item ID
 * @returns {Array} Array of custom options
 */
export function getMenuItemCustomOptions(menuItemId) {
  try {
    return dbQuery('SELECT * FROM menu_item_custom_options WHERE menu_item_id = ? ORDER BY display_order, name', [menuItemId]);
  } catch (error) {
    console.error('Error getting menu item custom options:', error);
    throw new Error('Failed to retrieve menu item custom options');
  }
}

/**
 * Save custom options for a menu item
 * @param {number} menuItemId - Menu item ID
 * @param {Array} options - Array of option objects
 * @returns {boolean} True if successful
 */
export function saveMenuItemCustomOptions(menuItemId, options) {
  try {
    // Delete existing options
    dbQuery('DELETE FROM menu_item_custom_options WHERE menu_item_id = ?', [menuItemId]);
    
    // Insert new options
    if (options && options.length > 0) {
      options.forEach((option, index) => {
        dbQuery(
          'INSERT INTO menu_item_custom_options (menu_item_id, name, price, display_order, is_available) VALUES (?, ?, ?, ?, ?)',
          [
            menuItemId,
            option.name,
            option.price,
            option.display_order || index,
            option.is_available !== undefined ? (option.is_available ? 1 : 0) : 1
          ]
        );
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error saving menu item custom options:', error);
    throw error;
  }
}

