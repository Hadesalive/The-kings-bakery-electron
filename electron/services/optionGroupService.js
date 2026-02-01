// Option Group service for handling option group operations
import { dbQuery } from './databaseService.js';

/**
 * Get all option groups
 * @returns {Array} Array of option groups
 */
export function getAllOptionGroups() {
  try {
    return dbQuery('SELECT * FROM option_groups ORDER BY display_order, name');
  } catch (error) {
    console.error('Error getting all option groups:', error);
    throw new Error('Failed to retrieve option groups');
  }
}

/**
 * Get option group by ID
 * @param {number} id - Option group ID
 * @returns {Object|null} Option group or null if not found
 */
export function getOptionGroupById(id) {
  try {
    const results = dbQuery('SELECT * FROM option_groups WHERE id = ?', [id]);
    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('Error getting option group by ID:', error);
    throw new Error('Failed to retrieve option group');
  }
}

/**
 * Create a new option group
 * @param {Object} groupData - Option group data
 * @returns {Object} Created option group
 */
export function createOptionGroup(groupData) {
  try {
    const { name, description, is_required, min_selections, max_selections, display_order } = groupData;
    
    if (!name || name.trim() === '') {
      throw new Error('Option group name is required');
    }

    const result = dbQuery(
      'INSERT INTO option_groups (name, description, is_required, min_selections, max_selections, display_order) VALUES (?, ?, ?, ?, ?, ?)',
      [
        name.trim(),
        description?.trim() || null,
        is_required !== undefined ? (is_required ? 1 : 0) : 0,
        min_selections || 1,
        max_selections || 1,
        display_order || 0
      ]
    );

    const newGroup = getOptionGroupById(result.lastInsertRowid);
    return newGroup;
  } catch (error) {
    console.error('Error creating option group:', error);
    throw error;
  }
}

/**
 * Update an option group
 * @param {number} id - Option group ID
 * @param {Object} groupData - Updated option group data
 * @returns {Object} Updated option group
 */
export function updateOptionGroup(id, groupData) {
  try {
    const { name, description, is_required, min_selections, max_selections, display_order } = groupData;
    
    if (!name || name.trim() === '') {
      throw new Error('Option group name is required');
    }

    dbQuery(
      'UPDATE option_groups SET name = ?, description = ?, is_required = ?, min_selections = ?, max_selections = ?, display_order = ? WHERE id = ?',
      [
        name.trim(),
        description?.trim() || null,
        is_required !== undefined ? (is_required ? 1 : 0) : 0,
        min_selections || 1,
        max_selections || 1,
        display_order || 0,
        id
      ]
    );

    return getOptionGroupById(id);
  } catch (error) {
    console.error('Error updating option group:', error);
    throw error;
  }
}

/**
 * Delete an option group
 * @param {number} id - Option group ID
 * @returns {boolean} True if deleted successfully
 */
export function deleteOptionGroup(id) {
  try {
    // Check if option group is used by any menu items
    const menuItemLinks = dbQuery(
      'SELECT COUNT(*) as count FROM menu_item_option_groups WHERE option_group_id = ?',
      [id]
    );
    
    if (menuItemLinks[0]?.count > 0) {
      throw new Error('Cannot delete option group: it is being used by menu items');
    }

    // Delete all options in this group first
    dbQuery('DELETE FROM options WHERE option_group_id = ?', [id]);
    
    // Delete the option group
    dbQuery('DELETE FROM option_groups WHERE id = ?', [id]);
    
    return true;
  } catch (error) {
    console.error('Error deleting option group:', error);
    throw error;
  }
}

