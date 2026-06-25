import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  canManageComment,
  forgetMyComment,
  getMyCommentIds,
  isMyComment,
  rememberMyComment,
  rememberNewCommentsFromSnapshot,
} from './myComments';

/** 초소형 localStorage 목 — node 환경에 주입해 "내 댓글" 추적을 검증한다. */
const makeLocalStorageMock = () => {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
  };
};

describe('myComments tracking (web/toss 공통 단일 소스)', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', makeLocalStorageMock());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('remembers and recognizes my comment by poll', () => {
    rememberMyComment('p1', 10);
    expect(isMyComment('p1', 10)).toBe(true);
    expect(isMyComment('p1', 11)).toBe(false);
    // 다른 폴 버킷과 섞이지 않는다.
    expect(isMyComment('p2', 10)).toBe(false);
  });

  it('dedupes repeated remembers', () => {
    rememberMyComment('p1', 10);
    rememberMyComment('p1', 10);
    expect(getMyCommentIds('p1')).toEqual([10]);
  });

  it('forgets a deleted comment id', () => {
    rememberMyComment('p1', 10);
    rememberMyComment('p1', 11);
    forgetMyComment('p1', 10);
    expect(getMyCommentIds('p1')).toEqual([11]);
  });

  it('records only the NEW comments grown since a snapshot', () => {
    const previous = new Set<number>([1, 2]);
    rememberNewCommentsFromSnapshot('p1', previous, [{ id: 1 }, { id: 2 }, { id: 3 }]);
    // 1,2 는 이미 있던 댓글이라 내 것으로 안 잡고, 새로 생긴 3 만 기록한다.
    expect(getMyCommentIds('p1')).toEqual([3]);
  });

  it('records nothing when no new comment appeared (idempotent submit)', () => {
    const previous = new Set<number>([1, 2]);
    rememberNewCommentsFromSnapshot('p1', previous, [{ id: 1 }, { id: 2 }]);
    expect(getMyCommentIds('p1')).toEqual([]);
  });
});

describe('canManageComment policy (정책차이는 인자)', () => {
  it('shows manage UI for my own comment', () => {
    expect(canManageComment({ mine: true, isPollOwner: false, isAdmin: false })).toBe(true);
  });
  it('shows manage UI for the poll owner (moderation)', () => {
    expect(canManageComment({ mine: false, isPollOwner: true, isAdmin: false })).toBe(true);
  });
  it('shows manage UI for an admin', () => {
    expect(canManageComment({ mine: false, isPollOwner: false, isAdmin: true })).toBe(true);
  });
  it('hides manage UI for a stranger', () => {
    expect(canManageComment({ mine: false, isPollOwner: false, isAdmin: false })).toBe(false);
  });
});
