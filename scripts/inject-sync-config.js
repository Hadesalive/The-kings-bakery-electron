/**
 * Injects Supabase credentials from .env into electron/sync-config.generated.cjs
 * Run before electron:build to bake credentials into the packaged app.
 * Supports .env format: SUPABASE_URL=... SUPABASE_SERVICE_KEY=...
 * Or simple format: first line = URL, second line = key
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const envPath = path.join(rootDir, '.env');
const outPath = path.join(rootDir, 'electron', 'sync-config.generated.cjs');

function parseEnv(content) {
  const env = {};
  const lines = (content || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) {
      env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  }
  return env;
}

let url = process.env.SUPABASE_URL?.trim() || '';
let key = process.env.SUPABASE_SERVICE_KEY?.trim() || '';

if (!url || !key) {
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    const env = parseEnv(content);
    url = url || env.SUPABASE_URL || '';
    key = key || env.SUPABASE_SERVICE_KEY || '';
    if (!url || !key) {
      const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      if (lines.length >= 1 && lines[0].startsWith('http')) url = lines[0];
      if (lines.length >= 2) key = lines[1];
    }
  }
}

const escaped = (s) => (s || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
const cjs = `// Auto-generated - do not edit. Source: .env
'use strict';
module.exports = {
  SUPABASE_URL: '${escaped(url)}',
  SUPABASE_SERVICE_KEY: '${escaped(key)}'
};
`;

fs.writeFileSync(outPath, cjs, 'utf8');
console.log('[inject-sync-config] Written electron/sync-config.generated.cjs');
if (!url || !key) {
  console.warn('[inject-sync-config] Warning: SUPABASE_URL or SUPABASE_SERVICE_KEY missing. Sync will require manual config.');
}
