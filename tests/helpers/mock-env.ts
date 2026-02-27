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
}

export function createMockEnv(overrides?: Partial<Env>): Env {
  return {
    KV: new InMemoryKV() as unknown as KVNamespace,
    PASSCODE_HASH: '',
    ADMIN_TOKEN: 'test-admin-token',
    OPENAI_ENABLED: 'false',
    OPENAI_BASE_URL: '',
    OPENAI_API_KEY: '',
    OPENAI_MODEL: 'gpt-3.5-turbo',
    ...overrides,
  };
}
