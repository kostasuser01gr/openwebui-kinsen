#!/usr/bin/env node
/**
 * Seed initial users and sample data into local wrangler KV (for dev).
 * Usage: npm run seed
 *
 * PIN hashing matches production: HMAC-SHA256(key=PIN_SALT_SECRET, data=userId+":"+pin)
 */
import { execSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { createHmac, randomBytes } from 'crypto';

const PIN_SALT = process.env.PIN_SALT_SECRET ?? 'kinsen-dev-salt-change-in-production';

function hmacSha256(secret, message) {
  return createHmac('sha256', secret).update(message).digest('hex');
}

function hashPin(pin, userId) {
  return hmacSha256(PIN_SALT, `${userId}:${pin}`);
}

function putKV(key, value) {
  const tmpFile = `/tmp/kinsen-seed-${Date.now()}-${Math.random().toString(36).slice(2)}.json`;
  const str = typeof value === 'string' ? value : JSON.stringify(value);
  writeFileSync(tmpFile, str);
  try {
    execSync(`npx wrangler kv key put --local --binding KV "${key}" --path "${tmpFile}"`, {
      stdio: 'pipe',
    });
    console.log(`  + ${key}`);
  } catch (e) {
    console.error(`  FAIL ${key}: ${e.message}`);
  }
  try { unlinkSync(tmpFile); } catch {}
}

console.log('Seeding Kinsen Station AI local data…\n');

const users = [
  { name: 'Admin',       role: 'admin',       pin: '1234' },
  { name: 'Coordinator', role: 'coordinator',  pin: '5678' },
  { name: 'Alice',       role: 'user',         pin: '1111' },
  { name: 'Bob',         role: 'user',         pin: '2222' },
];

const userIndex = [];

for (const u of users) {
  const id = randomBytes(8).toString('hex');
  userIndex.push(id);

  putKV(`user:${id}`, {
    id,
    name: u.name,
    role: u.role,
    active: true,
    createdAt: new Date().toISOString(),
  });
  putKV(`auth:${id}`, hashPin(u.pin, id));

  console.log(`  ${u.name} (${u.role})  PIN: ${u.pin}  ID: ${id}`);
}

putKV('user:index', userIndex);

// Global quick-action macros
const macroIndex = [];
const globalMacros = [
  { title: 'Summarize',        promptTemplate: 'Please summarize the conversation so far.' },
  { title: 'Translate → Greek', promptTemplate: 'Translate the following to Greek:\n\n' },
  { title: 'Explain Simply',   promptTemplate: 'Explain the following in simple, plain language:\n\n' },
  { title: 'Code Review',      promptTemplate: 'Review the following code and suggest improvements:\n\n```\n' },
];

for (const m of globalMacros) {
  const id = randomBytes(8).toString('hex');
  macroIndex.push(id);
  putKV(`macro:${id}`, {
    id,
    userId: 'global',
    title: m.title,
    promptTemplate: m.promptTemplate,
    global: true,
    createdAt: new Date().toISOString(),
  });
}
putKV('macro:index:global', macroIndex);

// Default global room
putKV('room:global', {
  id: 'global',
  name: 'Global',
  locked: false,
  createdAt: new Date().toISOString(),
});

console.log('\n✓ Seed complete!');
console.log('Login credentials:');
users.forEach((u) => console.log(`  ${u.name} / PIN: ${u.pin}`));
