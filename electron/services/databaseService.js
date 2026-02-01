// Database service - wrapper for database operations
// This provides a centralized way to access the database instance

let dbInstance = null;

/**
 * Set the database instance
 * @param {Database} db - Better-sqlite3 database instance
 */
export function setDatabase(db) {
  dbInstance = db;
}

/**
 * Get the database instance
 * @returns {Database} Database instance
 */
export function getDatabase() {
  if (!dbInstance) {
    throw new Error('Database not initialized');
  }
  return dbInstance;
}

/**
 * Execute a database query
 * @param {string} query - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<Array|Object>} Query results
 */
export function dbQuery(query, params = []) {
  try {
    const db = getDatabase();
    
    if (query.trim().toUpperCase().startsWith('SELECT')) {
      const stmt = db.prepare(query);
      return stmt.all(...params);
    } else {
      const stmt = db.prepare(query);
      return stmt.run(...params);
    }
  } catch (error) {
    console.error('Database query error:', error);
    console.error('Query:', query);
    console.error('Params:', params);
    throw error;
  }
}

