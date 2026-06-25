import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Poll } from '../../../shared/src/index';
import type { CreatePollInput, VoteInput } from '../../../shared/src/index';
import { createPollStoreState, type PollState } from './pollStoreFactory';

/**
 * 진짜 zustand 없이 StateCreator를 직접 구동하는 초소형 스토어 하네스.
 * set/get만 흉내내 팩토리가 반환한 상태 객체의 액션을 그대로 호출한다.
 */
const makeStore = (creator: (set: (partial: any) => void, get: () => PollState) => PollState) => {
  let state: PollState;
  const set = (partial: any) => {
    state = { ...state, ...(typeof partial === 'function' ? partial(state) : partial) };
  };
  const get = () => state;
  state = creator(set, get);
  return { get };
};

/** 항상 ok:false 인 Response 유사 객체 — 실패 응답을 흉내낸다. */
const failingResponse = (status: number): any => ({
  ok: false,
  status,
  url: '',
  headers: { get: () => 'application/json' },
  json: async () => ({ message: 'boom' }),
});

const parseApiPayload = async (res: any) => (typeof res.json === 'function' ? res.json() : {});

/** vote/createPoll 가 ensureIdentity/invalidateSession 을 호출해도 throw 하지 않도록 채워둔 인증 스토어. */
const makeAuthStore = () => ({
  getState: () => ({
    user: null,
    // getAuthToken 이 localStorage(node 미존재)로 새지 않도록 토큰을 제공한다.
    token: 'test-token',
    invalidateSession: vi.fn(),
    ensureIdentity: vi.fn(async () => {}),
  }),
});

const createInput: CreatePollInput = {
  question: '점심 뭐 먹지?',
  options: [{ text: '김치찌개' }, { text: '파스타' }],
} as CreatePollInput;

const voteInput: VoteInput = { optionId: 1 } as VoteInput;

/** 마감 없는(열려 있는) 실제 서버 폴 시드. */
const makeOpenPoll = (over: Partial<Poll> = {}): Poll => ({
  id: 'p1',
  question: 'q',
  options: [
    { id: 1, text: 'a', voteCount: 0 },
    { id: 2, text: 'b', voteCount: 0 },
  ],
  comments: [],
  createdAt: new Date().toISOString(),
  totalVotes: 0,
  endsAt: null,
  ...over,
});

/**
 * 옵션 묶음 — requestApi 는 항상 주어진 status 의 실패 응답을 돌려준다.
 * isLocalFallbackAllowed 로 PRODUCTION(false)/DEV(true) 를 흉내낸다.
 */
const buildState = (opts: { status: number; allowFallback: boolean }) => {
  const requestApi = vi.fn(async () => failingResponse(opts.status));
  const auth = makeAuthStore();
  const creator = createPollStoreState({
    parseApiPayload,
    requestApi: requestApi as any,
    useAuthStore: auth as any,
    isLocalFallbackAllowed: () => opts.allowFallback,
  });
  const store = makeStore(creator as any);
  return { store, requestApi, auth };
};

beforeEach(() => {
  // jsdom 환경이면 localStorage 가 존재하므로 캐시 잔여를 비운다(node면 no-op).
  if ('window' in globalThis) {
    try {
      globalThis.localStorage.clear();
    } catch {
      // ignore
    }
  }
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('createPollStoreState — local fallback policy (production safety)', () => {
  it('CASE 1: createPoll in PRODUCTION on 500 does NOT create a ghost local poll', async () => {
    const { store } = buildState({ status: 500, allowFallback: false });

    const result = await store.get().createPoll(createInput);

    expect(result).toBeNull();
    expect(store.get().error).toBeTruthy();
    // 유령 폴 금지: local- 접두 폴이 polls 에 끼어들면 안 된다.
    const ghost = store.get().polls.find((poll) => poll.id.startsWith('local-'));
    expect(ghost).toBeUndefined();
    expect(store.get().polls).toHaveLength(0);
  });

  it('CASE 2: createPoll in DEV on 500 falls back to a local- poll and adds it', async () => {
    const { store } = buildState({ status: 500, allowFallback: true });

    const result = await store.get().createPoll(createInput);

    expect(result).not.toBeNull();
    expect(result?.id.startsWith('local-')).toBe(true);
    expect(store.get().polls.some((poll) => poll.id === result?.id)).toBe(true);
  });

  it('CASE 3: vote in PRODUCTION on a real open poll (500) returns false and does NOT fake a vote', async () => {
    const { store, auth } = buildState({ status: 500, allowFallback: false });
    const poll = makeOpenPoll({ id: 'p1', endsAt: null });
    store.get().setCurrentPoll(poll);

    const ok = await store.get().vote('p1', voteInput);

    expect(ok).toBe(false);
    // 가짜 +1 금지: 집계가 늘어나면 안 된다.
    expect(store.get().currentPoll?.totalVotes).toBe(0);
    expect(store.get().currentPoll?.options.find((o) => o.id === 1)?.voteCount).toBe(0);
    // 500 은 401 이 아니므로 세션 무효화는 호출되지 않는다.
    expect(auth.getState().invalidateSession).not.toHaveBeenCalled();
  });

  it('CASE 4: vote in DEV on a real open poll (500) returns true and applies a local +1', async () => {
    const { store } = buildState({ status: 500, allowFallback: true });
    const poll = makeOpenPoll({ id: 'p1', endsAt: null });
    store.get().setCurrentPoll(poll);

    const ok = await store.get().vote('p1', voteInput);

    expect(ok).toBe(true);
    expect(store.get().currentPoll?.totalVotes).toBe(1);
    expect(store.get().currentPoll?.options.find((o) => o.id === 1)?.voteCount).toBe(1);
  });

  it('CASE 5: vote on an existing local- poll in PRODUCTION still applies locally (+1)', async () => {
    const { store } = buildState({ status: 500, allowFallback: false });
    const poll = makeOpenPoll({ id: 'local-x', endsAt: null });
    store.get().setCurrentPoll(poll);

    const ok = await store.get().vote('local-x', voteInput);

    expect(ok).toBe(true);
    expect(store.get().currentPoll?.totalVotes).toBe(1);
    expect(store.get().currentPoll?.options.find((o) => o.id === 1)?.voteCount).toBe(1);
  });
});
