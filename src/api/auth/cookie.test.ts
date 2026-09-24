import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  BACKUP_COOKIE_NAME,
  COOKIE_NAME,
  clearBackupToken,
  clearToken,
  getToken,
  setToken,
} from './cookie';

function setBackup(value: string) {
  document.cookie = `${BACKUP_COOKIE_NAME}=${value}; path=/`;
}

beforeEach(() => {
  clearToken();
  clearBackupToken();
});
afterEach(() => {
  clearToken();
  clearBackupToken();
});

describe('getToken', () => {
  it('returns null when the cookie is absent', () => {
    expect(getToken()).toBeNull();
  });

  it('round-trips a normal value', () => {
    setToken('abc123', new Date(Date.now() + 60_000));
    expect(getToken()).toBe('abc123');
  });

  it('round-trips a value with characters that get percent-encoded', () => {
    setToken('a b/c?', new Date(Date.now() + 60_000));
    expect(getToken()).toBe('a b/c?');
  });

  it('returns null and evicts on a malformed percent escape', () => {
    document.cookie = `${COOKIE_NAME}=%E0; path=/`;
    expect(getToken()).toBeNull();
    expect(document.cookie).not.toContain(`${COOKIE_NAME}=%E0`);
  });

  it('returns null for an explicitly empty cookie value', () => {
    document.cookie = `${COOKIE_NAME}=; path=/`;
    expect(getToken()).toBeNull();
  });
});

describe('clearToken', () => {
  it('removes a previously set cookie', () => {
    setToken('xyz', new Date(Date.now() + 60_000));
    expect(getToken()).toBe('xyz');
    clearToken();
    expect(getToken()).toBeNull();
  });
});

describe('kbase_session_backup', () => {
  it('is read when kbase_session is absent', () => {
    setBackup('backup-tok');
    expect(getToken()).toBe('backup-tok');
  });

  it('loses to kbase_session when both are present', () => {
    setBackup('backup-tok');
    setToken('primary-tok', new Date(Date.now() + 60_000));
    expect(getToken()).toBe('primary-tok');
  });

  it('survives clearToken', () => {
    setBackup('backup-tok');
    setToken('primary-tok', new Date(Date.now() + 60_000));
    clearToken();
    expect(getToken()).toBe('backup-tok');
  });

  it('is removed by clearBackupToken', () => {
    setBackup('backup-tok');
    clearBackupToken();
    expect(getToken()).toBeNull();
  });

  it('evicts only itself on a malformed percent escape', () => {
    setBackup('%E0');
    expect(getToken()).toBeNull();
    expect(document.cookie).not.toContain(`${BACKUP_COOKIE_NAME}=%E0`);
  });
});
