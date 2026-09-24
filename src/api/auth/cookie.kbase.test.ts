// @vitest-environment-options {"url": "https://gen2.kbase.us/portals"}
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  BACKUP_COOKIE_NAME,
  COOKIE_NAME,
  EXPIRY_KEY,
  clearBackupToken,
  clearToken,
  getToken,
  migrateSharedCookie,
  setToken,
} from './cookie';

const later = () => new Date(Date.now() + 60_000);
const shared = (name: string, value: string) =>
  (document.cookie = `${name}=${value}; Path=/; Domain=.kbase.us; Secure`);
const count = (name: string) =>
  document.cookie.split(';').filter((c) => c.trim().startsWith(`${name}=`)).length;

function cookieWrites() {
  const desc = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie')!;
  const writes: string[] = [];
  vi.spyOn(document, 'cookie', 'set').mockImplementation((v: string) => {
    writes.push(v);
    desc.set!.call(document, v);
  });
  return writes;
}

beforeEach(() => {
  clearToken();
  clearBackupToken();
  localStorage.clear();
});
afterEach(() => {
  vi.restoreAllMocks();
  clearToken();
  clearBackupToken();
});

describe('on a kbase.us host', () => {
  it('writes kbase_session host-only', () => {
    const writes = cookieWrites();
    setToken('tok', later());
    const write = writes.find((w) => w.startsWith(`${COOKIE_NAME}=tok`));
    expect(write).toBeDefined();
    expect(write).not.toMatch(/Domain=/i);
  });

  it('expires the old .kbase.us copy when it writes its own', () => {
    shared(COOKIE_NAME, 'old');
    setToken('new', later());
    expect(count(COOKIE_NAME)).toBe(1);
    expect(getToken()).toBe('new');
  });

  it('expires the old .kbase.us copy on clearToken', () => {
    shared(COOKIE_NAME, 'old');
    clearToken();
    expect(count(COOKIE_NAME)).toBe(0);
  });

  it('moves a session held only in the .kbase.us copy onto this host', () => {
    shared(COOKIE_NAME, 'old');
    localStorage.setItem(EXPIRY_KEY, String(Date.now() + 60_000));
    const writes = cookieWrites();
    migrateSharedCookie();
    expect(getToken()).toBe('old');
    expect(count(COOKIE_NAME)).toBe(1);
    const rewrite = writes.find((w) => w.startsWith(`${COOKIE_NAME}=old`));
    expect(rewrite).not.toMatch(/Domain=/i);
  });

  it('leaves the user signed out when no expiry was mirrored', () => {
    shared(COOKIE_NAME, 'old');
    migrateSharedCookie();
    expect(count(COOKIE_NAME)).toBe(0);
  });

  it('removes a .kbase.us kbase_session_backup', () => {
    shared(BACKUP_COOKIE_NAME, 'b');
    clearBackupToken();
    expect(count(BACKUP_COOKIE_NAME)).toBe(0);
  });
});
