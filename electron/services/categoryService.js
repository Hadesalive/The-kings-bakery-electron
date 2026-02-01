// Category service for handling category operations
import { dbQuery } from './databaseService.js';

/**
 * Get all categories
 * @returns {Promise<Array>} Array of categories
 */
export async function getAllCategories() {
  try {
    return dbQuery(
      'SELECT * FROM categories ORDER BY display_order, name'
    );
  } catch (error) {
    console.error('Error getting categories:', error);
    throw new Error('Failed to retrieve categories');
  }
}

/**
 * Get a single category by ID
 * @param {number} id - Category ID
 * @returns {Promise<Object|null>} Category or null if not found
 */
export async function getCategoryById(id) {
  try {
    const results = dbQuery(
      'SELECT * FROM categories WHERE id = ?',
      [id]
    );
    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('Error getting category by ID:', error);
    throw new Error('Failed to retrieve category');
  }
}

/**
 * Create a new category
 * @param {Object} categoryData - Category data
 * @param {string} categoryData.name - Category name (required)
 * @param {string} [categoryData.description] - Category description
 * @param {number} [categoryData.display_order] - Display order (default 0)
 * @returns {Promise<Object>} Created category with ID
 */
export async function createCategory(categoryData) {
  try {
    const { name, description, display_order = 0 } = categoryData;

    // Validation
    if (!name || !name.trim()) {
      throw new Error('Category name is required');
    }

    // Check if category name already exists
    const existing = dbQuery(
      'SELECT id FROM categories WHERE name = ?',
      [name.trim()]
    );

    if (existing.length > 0) {
      throw new Error('Category with this name already exists');
    }

    const result = dbQuery(
      `INSERT INTO categories (name, description, display_order, created_at)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        name.trim(),
        description?.trim() || null,
        display_order || 0,
      ]
    );

    // Return the created category
    const createdCategory = await getCategoryById(result.lastInsertRowid);
    return createdCategory;
  } catch (error) {
    console.error('Error creating category:', error);
    if (error.message.includes('required') || error.message.includes('already exists')) {
      throw error;
    }
    throw new Error('Failed to create category');
  }
}

/**
 * Update an existing category
 * @param {number} id - Category ID
 * @param {Object} categoryData - Updated category data
 * @returns {Promise<Object>} Updated category
 */
export async function updateCategory(id, categoryData) {
  try {
    // Check if category exists
    const existingCategory = await getCategoryById(id);
    if (!existingCategory) {
      throw new Error('Category not found');
    }

    const { name, description, display_order } = categoryData;

    // Build update query dynamically based on provided fields
    const updates = [];
    const values = [];

    if (name !== undefined) {
      if (!name || !name.trim()) {
        throw new Error('Category name cannot be empty');
      }

      // Check if new name conflicts with existing category
      const conflicting = dbQuery(
        'SELECT id FROM categories WHERE name = ? AND id != ?',
        [name.trim(), id]
      );

      if (conflicting.length > 0) {
        throw new Error('Category with this name already exists');
      }

      updates.push('name = ?');
      values.push(name.trim());
    }

    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description?.trim() || null);
    }

    if (display_order !== undefined) {
      updates.push('display_order = ?');
      values.push(display_order || 0);
    }

    if (updates.length === 0) {
      return existingCategory; // No updates provided
    }

    values.push(id);

    const query = `UPDATE categories SET ${updates.join(', ')} WHERE id = ?`;
    dbQuery(query, values);

    // Return the updated category
    const updatedCategory = await getCategoryById(id);
    return updatedCategory;
  } catch (error) {
    console.error('Error updating category:', error);
    if (error.message.includes('not found') || error.message.includes('cannot be empty') || error.message.includes('already exists')) {
      throw error;
    }
    throw new Error('Failed to update category');
  }
}

/**
 * Delete a category
 * @param {number} id - Category ID
 * @returns {Promise<boolean>} True if deleted successfully
 */
export async function deleteCategory(id) {
  try {
    // Check if category exists
    const existingCategory = await getCategoryById(id);
    if (!existingCategory) {
      throw new Error('Category not found');
    }

    // Note: We don't delete menu items when deleting a category
    // The category field in menu_items will just be set to null or remain as string
    // This is by design - menu items should remain even if category is deleted

    // Delete the category
    dbQuery('DELETE FROM categories WHERE id = ?', [id]);
    return true;
  } catch (error) {
    console.error('Error deleting category:', error);
    if (error.message.includes('not found')) {
      throw error;
    }
    throw new Error('Failed to delete category');
  }
}

