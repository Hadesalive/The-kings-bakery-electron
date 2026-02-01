// Option service for handling option operations
import { dbQuery } from './databaseService.js';

/**
 * Get all options
 * @param {number|null} optionGroupId - Optional option group ID to filter by
 * @returns {Array} Array of options
 */
export function getAllOptions(optionGroupId = null) {
  try {
    if (optionGroupId) {
      return dbQuery('SELECT * FROM options WHERE option_group_id = ? ORDER BY display_order, name', [optionGroupId]);
    }
    return dbQuery('SELECT * FROM options ORDER BY option_group_id, display_order, name');
  } catch (error) {
    console.error('Error getting all options:', error);
    throw new Error('Failed to retrieve options');
  }
}

/**
 * Get option by ID
 * @param {number} id - Option ID
 * @returns {Object|null} Option or null if not found
 */
export function getOptionById(id) {
  try {
    const results = dbQuery('SELECT * FROM options WHERE id = ?', [id]);
    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('Error getting option by ID:', error);
    throw new Error('Failed to retrieve option');
  }
}

/**
 * Create a new option
 * @param {Object} optionData - Option data
 * @returns {Object} Created option
 */
export function createOption(optionData) {
  try {
    const { option_group_id, name, description, price_modifier, display_order, is_available } = optionData;
    
    if (!option_group_id) {
      throw new Error('Option group ID is required');
    }
    
    if (!name || name.trim() === '') {
      throw new Error('Option name is required');
    }

    const result = dbQuery(
      'INSERT INTO options (option_group_id, name, description, price_modifier, display_order, is_available) VALUES (?, ?, ?, ?, ?, ?)',
      [
        option_group_id,
        name.trim(),
        description?.trim() || null,
        price_modifier || 0,
        display_order || 0,
        is_available !== undefined ? (is_available ? 1 : 0) : 1
      ]
    );

    const newOption = getOptionById(result.lastInsertRowid);
    return newOption;
  } catch (error) {
    console.error('Error creating option:', error);
    throw error;
  }
}

/**
 * Update an option
 * @param {number} id - Option ID
 * @param {Object} optionData - Updated option data
 * @returns {Object} Updated option
 */
export function updateOption(id, optionData) {
  try {
    const { name, description, price_modifier, display_order, is_available } = optionData;
    
    if (!name || name.trim() === '') {
      throw new Error('Option name is required');
    }

    dbQuery(
      'UPDATE options SET name = ?, description = ?, price_modifier = ?, display_order = ?, is_available = ? WHERE id = ?',
      [
        name.trim(),
        description?.trim() || null,
        price_modifier || 0,
        display_order || 0,
        is_available !== undefined ? (is_available ? 1 : 0) : 1,
        id
      ]
    );

    return getOptionById(id);
  } catch (error) {
    console.error('Error updating option:', error);
    throw error;
  }
}

/**
 * Delete an option
 * @param {number} id - Option ID
 * @returns {boolean} True if deleted successfully
 */
export function deleteOption(id) {
  try {
    dbQuery('DELETE FROM options WHERE id = ?', [id]);
    return true;
  } catch (error) {
    console.error('Error deleting option:', error);
    throw error;
  }
}

