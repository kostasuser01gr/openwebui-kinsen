import { describe, it, expect, beforeEach } from 'vitest';
import { t, setLocale, getAvailableLocales } from '../src/lib/i18n';

describe('i18n', () => {
  beforeEach(() => {
    setLocale('en');
  });

  it('returns English strings by default', () => {
    expect(t('app.title')).toBe('Kinsen Chat');
    expect(t('login.button')).toBe('Log In');
    expect(t('chat.welcome')).toBe('Welcome to Kinsen Chat');
  });

  it('returns Greek strings when locale is el', () => {
    setLocale('el');
    expect(t('login.button')).toBe('Σύνδεση');
    expect(t('chat.placeholder')).toContain('Ρωτήστε');
  });

  it('falls back to key when translation missing', () => {
    expect(t('nonexistent.key')).toBe('nonexistent.key');
  });

  it('has English and Greek available', () => {
    const locales = getAvailableLocales();
    expect(locales).toHaveLength(2);
    expect(locales.find((l) => l.code === 'en')).toBeDefined();
    expect(locales.find((l) => l.code === 'el')).toBeDefined();
  });
});
