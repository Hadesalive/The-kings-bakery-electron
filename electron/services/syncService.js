/**
 * Supabase Sync Service
 * Syncs local SQLite data to/from Supabase (PostgreSQL)
 * Includes efficient image sync via Supabase Storage (upload on push, download only if missing on pull)
 * Supports embedded credentials from build-time inject (sync-config.generated.cjs)
 */

import { createClient } from '@supabase/supabase-js';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';

const STORAGE_BUCKET = 'menu-images';

// Cache bucket verification so we don't hit the API on every sync
let _bucketVerified = false;

// Tables to sync in order (respecting foreign key dependencies)
const SYNC_TABLE_ORDER = [
  'categories',
  'menu_items',
  'customers',
  'inventory_items',
  'option_groups',
  'options',
  'addons',
  'users',
  'settings',
  'tables',
  'orders',
  'order_items',
  'menu_item_option_groups',
  'menu_item_addons',
  'order_item_options',
  'order_item_addons',
  'menu_item_sizes',
  'menu_item_custom_options',
  'inventory_transactions',
  'menu_item_ingredients',
  'analytics',
  'discounts',
];

// Columns that need int->bool conversion (SQLite 0/1 -> Postgres true/false)
const BOOLEAN_COLUMNS = {
  menu_items: ['is_available'],
  options: ['is_available'],
  addons: ['is_available'],
  option_groups: ['is_required'],
  users: ['is_active'],
  settings: [],
  discounts: ['is_active'],
  menu_item_sizes: ['is_default'],
  menu_item_custom_options: ['is_available'],
};

function toSupabaseRow(row, tableName) {
  const boolCols = BOOLEAN_COLUMNS[tableName] || [];
  const out = { ...row };

  for (const col of boolCols) {
    if (col in out && out[col] !== undefined && out[col] !== null) {
      out[col] = out[col] === 1 || out[col] === true;
    }
  }

  return out;
}

function toSqliteRow(row, tableName) {
  const boolCols = BOOLEAN_COLUMNS[tableName] || [];
  const out = { ...row };

  for (const col of boolCols) {
    if (col in out && out[col] !== undefined && out[col] !== null) {
      out[col] = out[col] ? 1 : 0;
    }
  }

  return out;
}

const require = createRequire(import.meta.url);

/** Embedded credentials from build-time inject (electron/sync-config.generated.cjs) */
function getEmbeddedSyncConfig() {
  try {
    const cfg = require('../sync-config.generated.cjs');
    const url = cfg?.SUPABASE_URL?.trim();
    const key = cfg?.SUPABASE_SERVICE_KEY?.trim();
    if (url && key) return { url, key };
  } catch (_) {
    /* no generated config */
  }
  return null;
}

/**
 * Get Supabase client from settings or embedded build config
 */
async function getSupabaseClient(db) {
  const urlRow = db.prepare("SELECT value FROM settings WHERE key = 'supabase_url'").get();
  const keyRow = db.prepare("SELECT value FROM settings WHERE key = 'supabase_service_key'").get();

  let url = urlRow?.value?.trim();
  let key = keyRow?.value?.trim();

  if (!url || !key) {
    const embedded = getEmbeddedSyncConfig();
    if (embedded) {
      url = embedded.url;
      key = embedded.key;
    }
  }

  if (!url || !key) {
    throw new Error('Supabase URL and Service Key must be configured in Settings > Cloud Sync or in .env before build');
  }

  return createClient(url, key);
}

/** Extract filename from image_path (handles full paths, media:// URLs, or plain filenames) */
function getImageFilename(imagePath) {
  if (!imagePath || typeof imagePath !== 'string') return null;
  const trimmed = String(imagePath).trim();
  if (!trimmed) return null;
  // Strip media:// protocol and take basename (handles media://file.jpg and /full/path/file.jpg)
  const withoutProtocol = trimmed.replace(/^media:\/\//, '').replace(/^file:\/\//, '');
  const filename = path.basename(withoutProtocol);
  return filename || null;
}

/** Ensure Storage bucket exists (create if needed). Caches result so we don't re-check on every sync. */
async function ensureBucket(supabase) {
  if (_bucketVerified) return;

  const { error: getErr } = await supabase.storage.getBucket(STORAGE_BUCKET);
  if (!getErr) {
    _bucketVerified = true;
    return;
  }

  const { error } = await supabase.storage.createBucket(STORAGE_BUCKET, { public: false });
  if (error) {
    const msg = error.message || String(error);
    if (/already exists|duplicate|already exist/i.test(msg)) {
      _bucketVerified = true;
      return;
    }
    if (/row-level security|RLS|permission|policy/i.test(msg)) {
      _bucketVerified = true;
      console.warn(`[Sync] Bucket "${STORAGE_BUCKET}" could not be created (${msg}). Ensure it exists in Supabase Dashboard → Storage.`);
      return;
    }
    throw new Error(
      `Storage bucket "${STORAGE_BUCKET}" could not be created: ${msg}. ` +
        'Create it manually: Supabase Dashboard → Storage → New bucket → Name: menu-images → Create.'
    );
  }
  _bucketVerified = true;
}

/**
 * Push images to Supabase Storage (only files that exist locally, dedupe by filename)
 */
async function pushImages(supabase, db, mediaPath) {
  if (!mediaPath) {
    console.warn('[Sync] No mediaPath provided, skipping image upload');
    return { uploaded: 0, skipped: 0, totalInDb: 0 };
  }

  if (!fs.existsSync(mediaPath)) {
    console.warn('[Sync] Media path does not exist:', mediaPath);
    return { uploaded: 0, skipped: 0, totalInDb: 0 };
  }

  // Handle both possible column casings (SQLite can return as-is)
  const rows = db.prepare('SELECT DISTINCT image_path FROM menu_items WHERE image_path IS NOT NULL AND length(trim(image_path)) > 0').all();
  const filenames = [...new Set(rows.map((r) => getImageFilename(r.image_path || r['image_path'])).filter(Boolean))];

  if (filenames.length === 0) {
    console.log('[Sync] No menu items with image_path in database');
    return { uploaded: 0, skipped: 0, totalInDb: 0 };
  }

  let uploaded = 0;
  let skipped = 0;
  for (const filename of filenames) {
    const localPath = path.join(mediaPath, filename);
    if (!fs.existsSync(localPath)) {
      console.warn('[Sync] File not found locally, skipping:', filename);
      skipped++;
      continue;
    }

    try {
      const buffer = fs.readFileSync(localPath);
      const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(filename, buffer, {
        upsert: true,
        contentType: getContentType(filename),
      });
      if (error) throw error;
      uploaded++;
    } catch (err) {
      console.error(`[Sync] Failed to upload ${filename}:`, err.message);
      throw new Error(`Image upload failed: ${filename} - ${err.message}`);
    }
  }

  return { uploaded, skipped, totalInDb: filenames.length };
}

/**
 * Delete orphaned images from Storage (files no longer referenced by menu_items)
 */
async function deleteOrphanedImages(supabase, db) {
  try {
    const rows = db.prepare('SELECT DISTINCT image_path FROM menu_items WHERE image_path IS NOT NULL AND length(trim(image_path)) > 0').all();
    const keepFilenames = new Set(rows.map((r) => getImageFilename(r.image_path || r['image_path'])).filter(Boolean));

    const { data: files, error: listErr } = await supabase.storage.from(STORAGE_BUCKET).list('', { limit: 1000 });
    if (listErr || !files) return { deleted: 0 };

    const toDelete = files.filter((f) => f.name && !keepFilenames.has(f.name));
    if (toDelete.length === 0) return { deleted: 0 };

    const { error: delErr } = await supabase.storage.from(STORAGE_BUCKET).remove(toDelete.map((f) => f.name));
    if (delErr) {
      console.warn('[Sync] Could not delete orphaned images:', delErr.message);
      return { deleted: 0 };
    }
    return { deleted: toDelete.length };
  } catch (err) {
    console.warn('[Sync] Error deleting orphaned images:', err.message);
    return { deleted: 0 };
  }
}

/**
 * Pull images from Supabase Storage (only if not present locally - saves egress)
 */
async function pullImages(supabase, mediaPath, imagePaths) {
  if (!mediaPath || !fs.existsSync(mediaPath)) return { downloaded: 0 };

  const filenames = [...new Set(imagePaths.map(getImageFilename).filter(Boolean))];
  let downloaded = 0;

  for (const filename of filenames) {
    const localPath = path.join(mediaPath, filename);
    if (fs.existsSync(localPath)) continue; // Skip - already have it (saves egress)

    try {
      const { data, error } = await supabase.storage.from(STORAGE_BUCKET).download(filename);
      if (error || !data) continue; // Image might not exist in Storage (e.g. never pushed)

      const buffer = Buffer.from(await data.arrayBuffer());
      fs.writeFileSync(localPath, buffer);
      downloaded++;
    } catch (err) {
      console.warn(`Could not download ${filename}:`, err.message);
    }
  }
  return { downloaded };
}

function getContentType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const types = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp' };
  return types[ext] || 'application/octet-stream';
}

/**
 * Push local SQLite data to Supabase (backup/upload)
 * @param {object} options - { mediaPath } for image sync
 */
export async function pushToSupabase(db, onProgress, options = {}) {
  const supabase = await getSupabaseClient(db);
  const results = { pushed: 0, errors: [] };

  // Ensure Storage bucket exists FIRST (fail fast before pushing any data)
  const mediaPath = options.mediaPath;
  if (mediaPath) {
    await ensureBucket(supabase);
  }

  for (let i = 0; i < SYNC_TABLE_ORDER.length; i++) {
    const table = SYNC_TABLE_ORDER[i];
    if (onProgress) onProgress({ table, index: i + 1, total: SYNC_TABLE_ORDER.length });

    try {
      const rows = db.prepare(`SELECT * FROM ${table}`).all();
      if (rows.length > 0) {
        const transformed = rows.map((r) => toSupabaseRow(r, table));
        const conflictKey = table === 'settings' ? 'key' : 'id';
        const { error } = await supabase.from(table).upsert(transformed, {
          onConflict: conflictKey,
          ignoreDuplicates: false,
        });
        if (error) throw error;
        results.pushed += rows.length;
      }
    } catch (err) {
      results.errors.push({ table, message: err.message });
      throw new Error(`Push failed at table "${table}": ${err.message}`);
    }
  }

  // Delete orphaned rows in Supabase (syncs deletes: remove rows we don't have locally)
  // Process in REVERSE order so children are deleted before parents (FK safety)
  // Settings table uses unique key 'key', not id
  const reverseOrder = [...SYNC_TABLE_ORDER].reverse();
  for (let i = 0; i < reverseOrder.length; i++) {
    const table = reverseOrder[i];
    if (onProgress) onProgress({ table, index: SYNC_TABLE_ORDER.length + i + 1, total: SYNC_TABLE_ORDER.length * 2 });

    try {
      if (table === 'settings') {
        const rows = db.prepare('SELECT key FROM settings').all();
        const localKeys = rows.map((r) => r.key);
        if (localKeys.length > 0) {
          const { data: remoteRows } = await supabase.from('settings').select('key');
          const remoteKeys = (remoteRows || []).map((r) => r.key);
          const toDelete = remoteKeys.filter((k) => !localKeys.includes(k));
          if (toDelete.length > 0) {
            const { error: delErr } = await supabase.from('settings').delete().in('key', toDelete);
            if (delErr) throw delErr;
          }
        } else {
          const { data: remoteRows } = await supabase.from('settings').select('key');
          const remoteKeys = (remoteRows || []).map((r) => r.key);
          if (remoteKeys.length > 0) {
            const { error: delErr } = await supabase.from('settings').delete().in('key', remoteKeys);
            if (delErr) throw delErr;
          }
        }
      } else {
        const rows = db.prepare(`SELECT id FROM ${table}`).all();
        const localIds = rows.map((r) => r.id);

        if (localIds.length > 0) {
          const { error: delErr } = await supabase
            .from(table)
            .delete()
            .not('id', 'in', `(${localIds.join(',')})`);
          if (delErr) throw delErr;
        } else {
          const { data: remoteRows } = await supabase.from(table).select('id');
          const remoteIds = (remoteRows || []).map((r) => r.id);
          if (remoteIds.length > 0) {
            const { error: delErr } = await supabase.from(table).delete().in('id', remoteIds);
            if (delErr) throw delErr;
          }
        }
      }
    } catch (delErr) {
      if (!delErr.message?.includes('row-level') && !delErr.message?.includes('permission')) {
        results.errors.push({ table, message: `Delete orphans: ${delErr.message}` });
        throw new Error(`Delete orphans failed at "${table}": ${delErr.message}`);
      }
      console.warn(`[Sync] Could not delete orphans in ${table}:`, delErr.message);
    }
  }

  // Push images to Storage (efficient: only existing files, dedupe by filename)
  if (mediaPath) {
    const imgResult = await pushImages(supabase, db, mediaPath);
    results.imagesUploaded = imgResult.uploaded;
    results.imagesSkipped = imgResult.skipped ?? 0;
    results.imagesTotalInDb = imgResult.totalInDb ?? 0;
    const orphanResult = await deleteOrphanedImages(supabase, db);
    results.imagesDeletedFromStorage = orphanResult.deleted ?? 0;
  }

  // Update last sync timestamp
  const lastSync = new Date().toISOString();
  const exists = db.prepare("SELECT id FROM settings WHERE key = 'supabase_last_sync'").get();
  if (exists) {
    db.prepare("UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = 'supabase_last_sync'").run(lastSync);
  } else {
    db.prepare("INSERT INTO settings (key, value, category) VALUES ('supabase_last_sync', ?, 'sync')").run(lastSync);
  }

  return results;
}

/**
 * Pull data from Supabase into local SQLite (restore/download)
 * Images: only download if not present locally (saves egress)
 * @param {object} options - { mediaPath } for image sync
 */
export async function pullFromSupabase(db, onProgress, options = {}) {
  const supabase = await getSupabaseClient(db);
  const results = { pulled: 0, errors: [] };

  db.pragma('foreign_keys = OFF');

  try {
    for (let i = 0; i < SYNC_TABLE_ORDER.length; i++) {
      const table = SYNC_TABLE_ORDER[i];
      if (onProgress) onProgress({ table, index: i + 1, total: SYNC_TABLE_ORDER.length });

      try {
        const { data: rows, error } = await supabase.from(table).select('*');

        if (error) throw error;
        if (!rows || rows.length === 0) continue;

        // Don't overwrite local Supabase config when pulling settings
        const PROTECTED_KEYS = ['supabase_url', 'supabase_service_key'];
        const filteredRows =
          table === 'settings'
            ? rows.filter((r) => !PROTECTED_KEYS.includes(r.key))
            : rows;

        if (filteredRows.length === 0) continue;

        if (table !== 'settings') {
          db.prepare(`DELETE FROM ${table}`).run();
        }

        const transformed = filteredRows.map((r) => toSqliteRow(r, table));

        for (const row of transformed) {
          const cols = Object.keys(row);
          const placeholders = cols.map(() => '?').join(', ');
          const values = cols.map((c) => row[c]);
          const colList = cols.join(', ');

          db.prepare(`INSERT OR REPLACE INTO ${table} (${colList}) VALUES (${placeholders})`).run(...values);
          results.pulled++;
        }
      } catch (err) {
        results.errors.push({ table, message: err.message });
        throw new Error(`Pull failed at table "${table}": ${err.message}`);
      }
    }

    // Pull images (only missing ones - saves egress)
    const mediaPath = options.mediaPath;
    if (mediaPath) {
      const menuItems = db.prepare('SELECT image_path FROM menu_items WHERE image_path IS NOT NULL AND length(trim(image_path)) > 0').all();
      const imagePaths = menuItems.map((r) => r.image_path);
      const imgResult = await pullImages(supabase, mediaPath, imagePaths);
      results.imagesDownloaded = imgResult.downloaded;
    }

    // Update last sync
    const lastSync = new Date().toISOString();
    const exists = db.prepare("SELECT id FROM settings WHERE key = 'supabase_last_sync'").get();
    if (exists) {
      db.prepare("UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = 'supabase_last_sync'").run(lastSync);
    } else {
      db.prepare("INSERT INTO settings (key, value, category) VALUES ('supabase_last_sync', ?, 'sync')").run(lastSync);
    }
  } finally {
    db.pragma('foreign_keys = ON');
  }

  return results;
}

/**
 * Full sync: push local to cloud, then pull cloud to local.
 * If local has no data (new machine), skip push and only pull so we don't overwrite cloud with empty.
 */
export async function fullSync(db, onProgress, options = {}) {
  const menuCount = db.prepare('SELECT COUNT(*) as c FROM menu_items').get()?.c ?? 0;
  const orderCount = db.prepare('SELECT COUNT(*) as c FROM orders').get()?.c ?? 0;
  const isEmpty = menuCount === 0 && orderCount === 0;

  if (!isEmpty) {
    await pushToSupabase(db, (p) => onProgress?.({ ...p, phase: 'push' }), options);
  }
  return await pullFromSupabase(db, (p) => onProgress?.({ ...p, phase: 'pull' }), options);
}

/**
 * Test Supabase connection (database + Storage bucket)
 */
export async function testConnection(db) {
  const supabase = await getSupabaseClient(db);
  const { error } = await supabase.from('categories').select('id').limit(1);
  if (error) throw new Error(`Database: ${error.message}`);
  await ensureBucket(supabase);
  return { success: true };
}

/**
 * Get last sync timestamp
 */
export function getLastSync(db) {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'supabase_last_sync'").get();
  return row?.value || null;
}

/**
 * Get image sync diagnostics (for debugging)
 */
export function getImageSyncDiagnostics(db, mediaPath) {
  const result = {
    mediaPath: mediaPath || null,
    mediaPathExists: false,
    filesInMediaFolder: [],
    menuItemsWithImages: 0,
    imagePathsFromDb: [],
    matchingFiles: [],
  };

  if (!mediaPath) return result;
  result.mediaPathExists = fs.existsSync(mediaPath);

  const rows = db.prepare('SELECT id, image_path FROM menu_items WHERE image_path IS NOT NULL AND length(trim(image_path)) > 0').all();
  result.menuItemsWithImages = rows.length;
  result.imagePathsFromDb = rows.map((r) => r.image_path || r['image_path']);

  if (result.mediaPathExists) {
    result.filesInMediaFolder = fs.readdirSync(mediaPath);
    const filenames = [...new Set(rows.map((r) => getImageFilename(r.image_path || r['image_path'])).filter(Boolean))];
    result.matchingFiles = filenames.filter((f) => fs.existsSync(path.join(mediaPath, f)));
  }

  return result;
}
