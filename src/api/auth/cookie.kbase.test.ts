// @vitest-environment-options {"url": "https://gen2.kbase.us/portals"}
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BACKUP_COOKIE_NAME, COOKIE_NAME, clearBackupToken, clearToken, setToken } from './cookie';

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

  it('removes a .kbase.us kbase_session_backup', () => {
    shared(BACKUP_COOKIE_NAME, 'b');
    clearBackupToken();
    expect(count(BACKUP_COOKIE_NAME)).toBe(0);
  });
});
