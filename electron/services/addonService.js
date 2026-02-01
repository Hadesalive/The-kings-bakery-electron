// Addon service for handling addon operations
import { dbQuery } from './databaseService.js';

/**
 * Get all addons
 * @returns {Array} Array of addons
 */
export function getAllAddons() {
  try {
    return dbQuery('SELECT * FROM addons ORDER BY category, name');
  } catch (error) {
    console.error('Error getting all addons:', error);
    throw new Error('Failed to retrieve addons');
  }
}

/**
 * Get addon by ID
 * @param {number} id - Addon ID
 * @returns {Object|null} Addon or null if not found
 */
export function getAddonById(id) {
  try {
    const results = dbQuery('SELECT * FROM addons WHERE id = ?', [id]);
    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('Error getting addon by ID:', error);
    throw new Error('Failed to retrieve addon');
  }
}

/**
 * Create a new addon
 * @param {Object} addonData - Addon data
 * @returns {Object} Created addon
 */
export function createAddon(addonData) {
  try {
    const { name, description, price, category, is_available } = addonData;
    
    if (!name || name.trim() === '') {
      throw new Error('Addon name is required');
    }
    
    if (price === undefined || price === null || price < 0) {
      throw new Error('Addon price is required and must be non-negative');
    }

    const result = dbQuery(
      'INSERT INTO addons (name, description, price, category, is_available) VALUES (?, ?, ?, ?, ?)',
      [
        name.trim(),
        description?.trim() || null,
        price,
        category?.trim() || null,
        is_available !== undefined ? (is_available ? 1 : 0) : 1
      ]
    );

    const newAddon = getAddonById(result.lastInsertRowid);
    return newAddon;
  } catch (error) {
    console.error('Error creating addon:', error);
    throw error;
  }
}

/**
 * Update an addon
 * @param {number} id - Addon ID
 * @param {Object} addonData - Updated addon data
 * @returns {Object} Updated addon
 */
export function updateAddon(id, addonData) {
  try {
    const { name, description, price, category, is_available } = addonData;
    
    if (!name || name.trim() === '') {
      throw new Error('Addon name is required');
    }
    
    if (price === undefined || price === null || price < 0) {
      throw new Error('Addon price is required and must be non-negative');
    }

    dbQuery(
      'UPDATE addons SET name = ?, description = ?, price = ?, category = ?, is_available = ? WHERE id = ?',
      [
        name.trim(),
        description?.trim() || null,
        price,
        category?.trim() || null,
        is_available !== undefined ? (is_available ? 1 : 0) : 1,
        id
      ]
    );

    return getAddonById(id);
  } catch (error) {
    console.error('Error updating addon:', error);
    throw error;
  }
}

/**
 * Delete an addon
 * @param {number} id - Addon ID
 * @returns {boolean} True if deleted successfully
 */
export function deleteAddon(id) {
  try {
    // Check if addon is used by any menu items
    const menuItemLinks = dbQuery(
      'SELECT COUNT(*) as count FROM menu_item_addons WHERE addon_id = ?',
      [id]
    );
    
    if (menuItemLinks[0]?.count > 0) {
      throw new Error('Cannot delete addon: it is being used by menu items');
    }

    dbQuery('DELETE FROM addons WHERE id = ?', [id]);
    return true;
  } catch (error) {
    console.error('Error deleting addon:', error);
    throw error;
  }
}

