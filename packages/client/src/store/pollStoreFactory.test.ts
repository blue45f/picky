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

/**
 * 폴 작성 로그인 게이트 도입 후 인증 스토어는 token/user/invalidateSession 만 제공한다.
 * createPoll 은 더 이상 자동 비회원 토큰을 발급(ensureIdentity)하지 않으므로,
 * 진입 게이트가 보장한 기존 token 을 그대로 싣는다.
 */
const ensureIdentitySpy = vi.fn(async () => {});
const makeAuthStore = () => ({
  getState: () => ({
    user: null,
    // getAuthToken 이 localStorage(node 미존재)로 새지 않도록 토큰을 제공한다.
    token: 'test-token',
    invalidateSession: vi.fn(),
    // 더 이상 호출되지 않아야 하는 자동 게스트 발급 — 호출 여부를 회귀 검증한다.
    ensureIdentity: ensureIdentitySpy,
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
  ensureIdentitySpy.mockClear();
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

/**
 * ok:true 응답을 돌려주는 가짜 Response. 주어진 poll JSON 을 본문으로 싣는다.
 * 응답 해석 시점을 제어하려고 resolve 를 외부에서 당기는 deferred 패턴을 쓴다.
 */
const okPollResponse = (poll: Poll): any => ({
  ok: true,
  status: 200,
  url: '',
  headers: { get: () => 'application/json' },
  json: async () => poll,
});

/**
 * in-flight 동시 호출을 흉내내려고 requestApi 가 수동으로 풀리는 약속을 돌려주게 만든다.
 * release() 를 호출해야 비로소 응답이 해석된다 → 두 번째 호출이 첫 호출 진행 중에 끼어든다.
 */
const buildDeferredState = (poll: Poll) => {
  let release: (() => void) | null = null;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const requestApi = vi.fn(async () => {
    await gate;
    return okPollResponse(poll);
  });
  const auth = makeAuthStore();
  const creator = createPollStoreState({
    parseApiPayload,
    requestApi: requestApi as any,
    useAuthStore: auth as any,
    isLocalFallbackAllowed: () => false,
  });
  const store = makeStore(creator as any);
  return { store, requestApi, release: () => release?.() };
};

describe('createPollStoreState — duplicate-submit in-flight guard (#dup)', () => {
  it('addComment: 같은 폴·같은 내용 동시 2회면 POST 는 한 번만 나간다', async () => {
    const poll = makeOpenPoll({ id: 'p1', comments: [] });
    const { store, requestApi, release } = buildDeferredState(poll);

    // 첫 호출이 응답 대기(in-flight)인 동안 같은 내용으로 두 번째 호출을 겹친다.
    const first = store.get().addComment('p1', { comment: '같은 한마디' } as any);
    const second = store.get().addComment('p1', { comment: '같은 한마디' } as any);

    release();
    const [r1, r2] = await Promise.all([first, second]);

    // 한 번만 서버로 나가고(중복 차단), 두 번째는 즉시 무시되어 null.
    expect(requestApi).toHaveBeenCalledTimes(1);
    expect(r1).not.toBeNull();
    expect(r2).toBeNull();
  });

  it('addComment: 가드 해제 후 같은 내용을 다시 보내면 정상 동작한다(차단은 in-flight 한정)', async () => {
    const poll = makeOpenPoll({ id: 'p1', comments: [] });
    const { store, requestApi, release } = buildDeferredState(poll);

    const first = store.get().addComment('p1', { comment: '한마디' } as any);
    release();
    await first;

    const again = await store.get().addComment('p1', { comment: '한마디' } as any);
    expect(again).not.toBeNull();
    // 첫 호출 + 두 번째(직렬) 호출 = 2회. 정상 단일 제출은 막지 않는다.
    expect(requestApi).toHaveBeenCalledTimes(2);
  });

  it('addComment: 서로 다른 내용은 동시여도 둘 다 나간다(정상 제출 불변)', async () => {
    const poll = makeOpenPoll({ id: 'p1', comments: [] });
    const { store, requestApi, release } = buildDeferredState(poll);

    const a = store.get().addComment('p1', { comment: '하나' } as any);
    const b = store.get().addComment('p1', { comment: '둘' } as any);
    release();
    await Promise.all([a, b]);

    expect(requestApi).toHaveBeenCalledTimes(2);
  });

  it('vote: 같은 폴 동시 2회면 투표 POST 는 한 번만 나간다', async () => {
    const poll = makeOpenPoll({ id: 'p1' });
    const { store, requestApi, release } = buildDeferredState(poll);
    store.get().setCurrentPoll(poll);

    const first = store.get().vote('p1', voteInput);
    const second = store.get().vote('p1', voteInput);
    release();
    const [r1, r2] = await Promise.all([first, second]);

    expect(requestApi).toHaveBeenCalledTimes(1);
    expect(r1).toBe(true);
    expect(r2).toBe(false);
  });

  it('createPoll: 같은 질문 동시 2회면 생성 POST 는 한 번만 나간다', async () => {
    const created = makeOpenPoll({ id: 'p-created' });
    const { store, requestApi, release } = buildDeferredState(created);

    const first = store.get().createPoll(createInput);
    const second = store.get().createPoll(createInput);
    release();
    const [r1, r2] = await Promise.all([first, second]);

    expect(requestApi).toHaveBeenCalledTimes(1);
    expect(r1).not.toBeNull();
    expect(r2).toBeNull();
  });
});

/** ok:true 로 항상 같은 poll 을 돌려주는 요청 모킹 + 자동 게스트 발급 검증용 인증 스토어. */
const buildOkState = (poll: Poll) => {
  const requestApi = vi.fn(async () => okPollResponse(poll));
  const auth = makeAuthStore();
  const creator = createPollStoreState({
    parseApiPayload,
    requestApi: requestApi as any,
    useAuthStore: auth as any,
    isLocalFallbackAllowed: () => false,
  });
  const store = makeStore(creator as any);
  return { store, requestApi };
};

describe('createPollStoreState — 하이브리드 정체성 정책(폴 작성 로그인 게이트)', () => {
  it('createPoll 은 자동 비회원 토큰을 발급하지 않는다(ensureIdentity 미호출)', async () => {
    const created = makeOpenPoll({ id: 'p-created' });
    const { store } = buildOkState(created);

    const result = await store.get().createPoll(createInput);

    expect(result).not.toBeNull();
    // 핵심 회귀: 작성 경로에서 자동 게스트 발급(ensureIdentity)이 절대 호출되지 않아야 한다.
    expect(ensureIdentitySpy).not.toHaveBeenCalled();
  });

  it('createPoll 은 진입 게이트가 보장한 기존 토큰을 그대로 Authorization 으로 싣는다', async () => {
    const created = makeOpenPoll({ id: 'p-created' });
    const { store, requestApi } = buildOkState(created);

    await store.get().createPoll(createInput);

    const [, init] = requestApi.mock.calls[0]!;
    expect((init as RequestInit).method).toBe('POST');
    expect((init as RequestInit).headers).toMatchObject({
      Authorization: 'Bearer test-token',
    });
  });

  it('vote 는 토큰 없이도(게스트 voterKey) 그대로 동작한다 — 저마찰 보존', async () => {
    const poll = makeOpenPoll({ id: 'p1' });
    const { store, requestApi } = buildOkState(poll);
    store.get().setCurrentPoll(poll);

    const ok = await store.get().vote('p1', { optionId: 1, voterKey: 'guest-key' } as VoteInput);

    expect(ok).toBe(true);
    // 투표 경로 역시 자동 게스트 발급을 트리거하지 않는다(voterKey 로 식별).
    expect(ensureIdentitySpy).not.toHaveBeenCalled();
    expect(requestApi).toHaveBeenCalledTimes(1);
  });

  it('addComment 는 토큰 없이도(게스트 voterKey) 그대로 동작한다 — 저마찰 보존', async () => {
    const poll = makeOpenPoll({ id: 'p1' });
    const { store, requestApi } = buildOkState(poll);

    const result = await store
      .get()
      .addComment('p1', { comment: '한마디', voterKey: 'guest-key' } as any);

    expect(result).not.toBeNull();
    expect(ensureIdentitySpy).not.toHaveBeenCalled();
    expect(requestApi).toHaveBeenCalledTimes(1);
  });
});
