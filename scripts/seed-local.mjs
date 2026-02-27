#!/usr/bin/env node
/**
 * Seed knowledge notes into local wrangler KV (for dev).
 * Usage: npm run seed
 * Note: Requires wrangler pages dev running or local KV setup.
 */
import { execSync } from 'child_process';
import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dir = dirname(__filename);

const seedDataPath = join(__dir, '..', 'src', 'lib', 'seed-data.ts');
const seedContent = readFileSync(seedDataPath, 'utf-8');

// Extract the SEED_NOTES array
const match = seedContent.match(/export const SEED_NOTES[^=]*=\s*(\[[\s\S]*\]);/);
if (!match) {
  console.error('Could not parse seed data');
  process.exit(1);
}

const notes = new Function(`return ${match[1]}`)();

console.log(`📚 Seeding ${notes.length} knowledge notes into local KV...`);

const index = notes.map((n) => n.id);

for (const note of notes) {
  const key = `knowledge:${note.id}`;
  const tmpFile = `/tmp/kinsen-seed-${note.id}.json`;
  writeFileSync(tmpFile, JSON.stringify(note));
  try {
    execSync(`npx wrangler kv key put --local --binding KV "${key}" --path "${tmpFile}"`, {
      stdio: 'pipe',
    });
    console.log(`  ✅ ${note.id}: ${note.title}`);
  } catch (e) {
    console.error(`  ❌ ${note.id}: ${e.message}`);
  }
  try {
    unlinkSync(tmpFile);
  } catch {}
}

// Write index
const indexTmp = '/tmp/kinsen-seed-index.json';
writeFileSync(indexTmp, JSON.stringify(index));
try {
  execSync(`npx wrangler kv key put --local --binding KV "knowledge:index" --path "${indexTmp}"`, {
    stdio: 'pipe',
  });
} catch {}
try {
  unlinkSync(indexTmp);
} catch {}

console.log(`\n✅ Index written with ${index.length} entries`);
console.log(
  'Start dev server: npm run dev (in one terminal) + npx wrangler pages dev dist (in another)',
);
