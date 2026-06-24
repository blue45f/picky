import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getVotedOptionId, hasVotedLocally, rememberVote } from './votes';

describe('votes (localStorage-backed)', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
      setItem: (key: string, value: string) => {
        store.set(key, String(value));
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => store.clear(),
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('returns null when the poll has no recorded vote', () => {
    expect(getVotedOptionId('x')).toBeNull();
    expect(hasVotedLocally('x')).toBe(false);
  });

  it('persists and reads back the chosen option', () => {
    rememberVote('x', 3);
    expect(getVotedOptionId('x')).toBe(3);
    expect(hasVotedLocally('x')).toBe(true);
  });

  it('keeps records isolated per poll id', () => {
    rememberVote('a', 1);
    expect(getVotedOptionId('b')).toBeNull();
  });

  it('treats corrupt stored values as no vote', () => {
    localStorage.setItem('picky_voted_z', 'not-a-number');
    expect(getVotedOptionId('z')).toBeNull();
  });
});
