#!/usr/bin/env node
/**
 * Seed initial admin user and sample data into local wrangler KV (for dev).
 * Usage: npm run seed
 */
import { execSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { createHash, randomBytes } from 'crypto';

const PIN_SALT = 'kinsen-dev-salt-change-in-production';

function sha256(input) {
  return createHash('sha256').update(input).digest('hex');
}

function hashPin(pin) {
  return sha256(`${pin}${PIN_SALT}`);
}

function putKV(key, value) {
  const tmpFile = `/tmp/kinsen-seed-${Date.now()}-${Math.random().toString(36).slice(2)}.json`;
  writeFileSync(tmpFile, typeof value === 'string' ? value : JSON.stringify(value));
  try {
    execSync(`npx wrangler kv key put --local --binding KV "${key}" --path "${tmpFile}"`, {
      stdio: 'pipe',
    });
    console.log(`  + ${key}`);
  } catch (e) {
    console.error(`  FAIL ${key}: ${e.message}`);
  }
  try {
    unlinkSync(tmpFile);
  } catch {}
}

console.log('Seeding Kinsen Station AI local data...\n');

// Create users
const users = [
  { name: 'Admin', role: 'admin', pin: '1234' },
  { name: 'Coordinator', role: 'coordinator', pin: '5678' },
  { name: 'Alice', role: 'user', pin: '1111' },
  { name: 'Bob', role: 'user', pin: '2222' },
];

const userIndex = [];

for (const u of users) {
  const id = randomBytes(8).toString('hex');
  userIndex.push(id);

  const user = {
    id,
    name: u.name,
    role: u.role,
    active: true,
    createdAt: new Date().toISOString(),
  };

  putKV(`user:${id}`, user);
  putKV(`auth:${id}`, hashPin(u.pin));

  console.log(`  User: ${u.name} (${u.role}) PIN: ${u.pin} ID: ${id}`);
}

putKV('user:index', userIndex);

// Create global shortcuts
const shortcuts = [
  {
    id: randomBytes(8).toString('hex'),
    label: 'Summarize',
    prompt: 'Please summarize this conversation so far.',
    global: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: randomBytes(8).toString('hex'),
    label: 'Translate to Greek',
    prompt: 'Translate the following text to Greek:',
    global: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: randomBytes(8).toString('hex'),
    label: 'Explain Simply',
    prompt: 'Explain the following in simple terms:',
    global: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: randomBytes(8).toString('hex'),
    label: 'Code Review',
    prompt: 'Review the following code and suggest improvements:',
    global: true,
    createdAt: new Date().toISOString(),
  },
];

putKV('shortcuts:global', shortcuts);

console.log('\nSeed complete!');
console.log('Start dev: npm run dev (terminal 1) + npx wrangler pages dev dist (terminal 2)');
