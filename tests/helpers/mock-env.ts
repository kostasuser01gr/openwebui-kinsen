import type { Env } from '../../src/lib/types';

type StoredValue = {
  value: string;
  expiresAt?: number;
};

class InMemoryKV {
  private readonly map = new Map<string, StoredValue>();

  async get(key: string, type?: 'text' | 'json' | 'arrayBuffer' | 'stream'): Promise<any> {
    const current = this.map.get(key);
    if (!current) return null;
    if (current.expiresAt && current.expiresAt <= Date.now()) {
      this.map.delete(key);
      return null;
    }

    if (type === 'json') {
      try {
        return JSON.parse(current.value);
      } catch {
        return null;
      }
    }

    return current.value;
  }

  async put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void> {
    const expiresAt = opts?.expirationTtl ? Date.now() + opts.expirationTtl * 1000 : undefined;
    this.map.set(key, { value: String(value), expiresAt });
  }

  async delete(key: string): Promise<void> {
    this.map.delete(key);
  }

  async list(opts?: {
    prefix?: string;
    limit?: number;
  }): Promise<{ keys: { name: string; expiration?: number }[] }> {
    const prefix = opts?.prefix || '';
    const limit = opts?.limit || 100;
    const keys: { name: string }[] = [];
    for (const key of this.map.keys()) {
      if (key.startsWith(prefix)) {
        keys.push({ name: key });
        if (keys.length >= limit) break;
      }
    }
    return { keys };
  }
}

class MockAI {
  async run(_model: string, _input: any): Promise<any> {
    return { response: 'Mock AI response for testing' };
  }
}

export function createMockEnv(overrides?: Partial<Env>): Env {
  return {
    KV: new InMemoryKV() as unknown as KVNamespace,
    AI: new MockAI() as unknown as Ai,
    PIN_SALT_SECRET: 'test-salt-secret',
    SESSION_SIGNING_SECRET: 'test-signing-secret',
    ADMIN_TOKEN: 'test-admin-token',
    ...overrides,
  };
}
