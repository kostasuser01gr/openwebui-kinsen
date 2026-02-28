// Cryptographic utilities — WebCrypto (Workers + browser compatible)

/** SHA-256 hex digest */
export async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** HMAC-SHA-256 hex digest — constant-time safe via subtle */
export async function hmacSha256(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Hash a 4-digit PIN.
 * Formula: HMAC-SHA256(key=PIN_SALT_SECRET, message=userId+":"+pin)
 * Per-user salt derived from userId prevents cross-user rainbow tables.
 */
export async function hashPin(pin: string, salt: string, userId: string): Promise<string> {
  return hmacSha256(salt, `${userId}:${pin}`);
}

/**
 * Sign an opaque token for transport.
 * Returns "rawToken.hmac" — the rawToken is the KV key suffix.
 */
export async function signToken(rawToken: string, signingSecret: string): Promise<string> {
  const sig = await hmacSha256(signingSecret, rawToken);
  return `${rawToken}.${sig}`;
}

/**
 * Verify a signed token. Returns the raw token (KV key suffix) if valid, null otherwise.
 * Uses constant-time comparison to prevent timing attacks.
 */
export async function verifyToken(
  signedToken: string,
  signingSecret: string,
): Promise<string | null> {
  const dot = signedToken.lastIndexOf('.');
  if (dot === -1) return null;
  const rawToken = signedToken.slice(0, dot);
  const givenSig = signedToken.slice(dot + 1);
  const expectedSig = await hmacSha256(signingSecret, rawToken);
  if (givenSig.length !== expectedSig.length) return null;
  let diff = 0;
  for (let i = 0; i < givenSig.length; i++) {
    diff |= givenSig.charCodeAt(i) ^ expectedSig.charCodeAt(i);
  }
  return diff === 0 ? rawToken : null;
}

/** 32-char hex random token (128-bit entropy) */
export function generateSessionId(): string {
  return generateId(16);
}

/** n-byte random hex ID */
export function generateId(bytes = 8): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

export const generateUserId = (): string => generateId(8);

/** Parse a Cookie header string into a key→value map */
export function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};
  const out: Record<string, string> = {};
  for (const pair of cookieHeader.split(';')) {
    const [name, ...rest] = pair.trim().split('=');
    if (name) out[name.trim()] = rest.join('=').trim();
  }
  return out;
}
