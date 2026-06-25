import type {
  Poll,
  CreatePollInput,
  UpdatePollInput,
  VoteInput,
  CreateCommentInput,
} from '@picky/shared';
import type { AuthState } from './authStoreFactory';

type StoreSet<T> = (
  partial: Partial<T> | T | ((state: T) => Partial<T> | T),
  replace?: false,
) => void;
type StoreGet<T> = () => T;
type StoreStateCreator<T> = (set: StoreSet<T>, get: StoreGet<T>) => T;

/** 목록 페이지네이션 기본값 — 서버 기본(limit 20)과 맞춘다. */
export const POLLS_PAGE_SIZE = 20;

/** 서버측 검색/정렬/필터(#W2). 정렬키는 서버 PollListSort, 상태는 open/closed/all. */
export type PollListSortMode = 'latest' | 'popular' | 'commented' | 'closing';
export type PollListStatusMode = 'all' | 'open' | 'closed';

export interface PollListFilters {
  q: string;
  sort: PollListSortMode;
  status: PollListStatusMode;
  category: string | null;
}

const DEFAULT_POLL_FILTERS: PollListFilters = {
  q: '',
  sort: 'latest',
  status: 'all',
  category: null,
};

export interface PollState {
  polls: Poll[];
  currentPoll: Poll | null;
  isLoading: boolean;
  error: string | null;
  // 서버측 페이지네이션(#10) 상태. polls는 "현재 페이지" 항목이다.
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
  // 서버측 검색/정렬/필터(#W2) — 마지막으로 적용한 필터(페이지 이동 시 재사용).
  filters: PollListFilters;
  setCurrentPoll: (poll: Poll | null) => void;
  clearError: () => void;

  fetchPolls: (page?: number, filters?: Partial<PollListFilters>) => Promise<void>;
  /**
   * 운영자 전용 — 페이지네이션 없이 전체 공개 고민을 한 번에 가져온다(#W3).
   * 공유 `polls`(페이지네이션 대상) 상태를 건드리지 않고 결과 배열만 반환한다.
   */
  fetchAllPolls: () => Promise<Poll[]>;
  goToPage: (page: number) => Promise<void>;
  nextPage: () => Promise<void>;
  prevPage: () => Promise<void>;
  fetchPoll: (id: string, code?: string) => Promise<Poll | null>;
  createPoll: (input: CreatePollInput) => Promise<Poll | null>;
  updatePoll: (id: string, patch: UpdatePollInput) => Promise<Poll | null>;
  vote: (id: string, input: VoteInput) => Promise<boolean>;
  deletePoll: (id: string) => Promise<boolean>;
  deleteComment: (id: string, commentId: number) => Promise<boolean>;
  addComment: (id: string, input: CreateCommentInput) => Promise<Poll | null>;
}

interface PollAuthStore {
  getState: () => Pick<AuthState, 'user' | 'token' | 'invalidateSession' | 'ensureIdentity'>;
}

interface LocalVoteFallbackInput {
  id: string;
  status: number;
}

interface PollStoreFactoryOptions {
  parseApiPayload: (res: Response) => Promise<any>;
  requestApi: (path: string, init?: RequestInit) => Promise<Response>;
  useAuthStore: PollAuthStore;
  canCreateLocalPollFromStatus: (status: number) => boolean;
  canCreateLocalPollFromError: () => boolean;
  canApplyLocalVoteFallback: (input: LocalVoteFallbackInput) => boolean;
}

const LOCAL_POLL_CACHE_KEY = 'picky_local_polls';

const loadCachedPolls = (): Poll[] => {
  if (!('window' in globalThis)) {
    return [];
  }

  try {
    const raw = globalThis.localStorage.getItem(LOCAL_POLL_CACHE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item: any): item is Poll =>
        Boolean(item && typeof item === 'object' && typeof item.id === 'string' && item.id.trim()),
      )
      .map((item: any) => ({
        id: item.id,
        question: typeof item.question === 'string' ? item.question : '',
        description: typeof item.description === 'string' ? item.description : null,
        options: Array.isArray(item.options)
          ? item.options
              .filter(
                (option: any) =>
                  option && typeof option.id === 'number' && typeof option.text === 'string',
              )
              .map((option: any) => ({
                id: option.id,
                text: option.text,
                voteCount: typeof option.voteCount === 'number' ? option.voteCount : 0,
                imageUrl: option.imageUrl,
              }))
          : [],
        comments: Array.isArray(item.comments)
          ? item.comments
              .filter(
                (comment: any) =>
                  comment &&
                  typeof comment.id === 'number' &&
                  typeof comment.voterName === 'string' &&
                  typeof comment.comment === 'string',
              )
              .map((comment: any) => ({
                id: comment.id,
                voterName: comment.voterName,
                comment: comment.comment,
                createdAt:
                  typeof comment.createdAt === 'string'
                    ? comment.createdAt
                    : new Date().toISOString(),
                selectedOptionId:
                  typeof comment.selectedOptionId === 'number'
                    ? comment.selectedOptionId
                    : undefined,
                selectedOptionText:
                  typeof comment.selectedOptionText === 'string'
                    ? comment.selectedOptionText
                    : undefined,
              }))
          : [],
        attachments: Array.isArray(item.attachments)
          ? item.attachments
              .filter(
                (attachment: any) =>
                  attachment &&
                  typeof attachment.name === 'string' &&
                  typeof attachment.type === 'string' &&
                  typeof attachment.size === 'number' &&
                  typeof attachment.dataUrl === 'string',
              )
              .map((attachment: any) => ({
                name: attachment.name,
                type: attachment.type,
                size: attachment.size,
                dataUrl: attachment.dataUrl,
              }))
          : [],
        createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
        endsAt: typeof item.endsAt === 'string' ? item.endsAt : null,
        totalVotes: typeof item.totalVotes === 'number' ? item.totalVotes : 0,
        resultsVisibility:
          item.resultsVisibility === 'always' || item.resultsVisibility === 'afterVote'
            ? item.resultsVisibility
            : 'afterVote',
        creatorId: item.creatorId,
        creatorIsGuest: Boolean(item.creatorIsGuest),
      }));
  } catch {
    return [];
  }
};

const persistCachedPolls = (polls: Poll[]) => {
  if (!('window' in globalThis)) {
    return;
  }

  try {
    const compacted = polls.slice(0, 300);
    globalThis.localStorage.setItem(LOCAL_POLL_CACHE_KEY, JSON.stringify(compacted));
  } catch {
    // intentionally ignore
  }
};

const upsertPollToCache = (poll: Poll, source?: Poll[]) => {
  const sourcePolls = source ?? loadCachedPolls();
  const next = [poll, ...sourcePolls.filter((item) => item.id !== poll.id)].filter(
    (item) => item.id,
  );
  persistCachedPolls(next);
  return next;
};

const removePollFromCache = (pollId: string) => {
  const next = loadCachedPolls().filter((poll) => poll.id !== pollId);
  persistCachedPolls(next);
};

const isPollClosedByDate = (poll: Poll) => {
  if (!poll.endsAt) {
    return false;
  }
  const endsAtTime = new Date(poll.endsAt).getTime();
  return Number.isFinite(endsAtTime) && Date.now() >= endsAtTime;
};

/** 오프라인 작성분(local-*)을 활성 서버 필터와 같은 의미로 클라에서 거른다(#W2 일관성). */
const localPollMatchesFilters = (poll: Poll, filters?: PollListFilters) => {
  if (!filters) {
    return true;
  }
  const needle = filters.q.trim().toLowerCase();
  if (needle) {
    const inQuestion = poll.question.toLowerCase().includes(needle);
    const inDescription = (poll.description || '').toLowerCase().includes(needle);
    if (!inQuestion && !inDescription) return false;
  }
  if (filters.category && (poll.categoryId ?? null) !== filters.category) {
    return false;
  }
  if (filters.status !== 'all') {
    const closed = isPollClosedByDate(poll);
    if (filters.status === 'open' && closed) return false;
    if (filters.status === 'closed' && !closed) return false;
  }
  return true;
};

const mergePollsWithLocalCache = (remotePolls: Poll[], filters?: PollListFilters) => {
  // 서버측 페이지네이션(#10) 이후로는 오프라인 작성분(`local-*`)만 합친다.
  // (서버가 아는 폴은 페이지 경계를 넘어 1페이지로 새지 않도록 합치지 않는다.)
  // 검색/필터(#W2)가 켜져 있으면 로컬분도 같은 기준으로 걸러 결과 일관성을 지킨다.
  const remoteIds = new Set(remotePolls.map((poll) => poll.id));
  const localOnly = loadCachedPolls().filter(
    (poll) =>
      poll.id.startsWith('local-') &&
      !remoteIds.has(poll.id) &&
      localPollMatchesFilters(poll, filters),
  );

  return [...remotePolls, ...localOnly];
};

const findPollFromLocalCache = (pollId: string): Poll | undefined => {
  if (!pollId) {
    return undefined;
  }

  const cached = loadCachedPolls();
  return cached.find((poll) => poll.id === pollId);
};

const isPollClosed = (poll: Poll | null | undefined) => {
  if (!poll?.endsAt) {
    return false;
  }

  const endsAtTime = new Date(poll.endsAt).getTime();
  return Number.isFinite(endsAtTime) && Date.now() >= endsAtTime;
};

const createLocalPoll = (input: CreatePollInput, user: AuthState['user']): Poll => {
  const localIdBase = Date.now().toString(36);

  return {
    id: `local-${localIdBase}`,
    question: input.question,
    description: input.description || null,
    options: input.options.map((option: (typeof input.options)[number], index) => ({
      id: index + 1,
      text: option.text,
      voteCount: 0,
      imageUrl: option.imageUrl || null,
    })),
    comments: [],
    attachments: input.attachments || [],
    createdAt: new Date().toISOString(),
    endsAt: input.endsAt || null,
    totalVotes: 0,
    resultsVisibility: input.resultsVisibility || 'afterVote',
    creatorId: user?.id || `guest-${localIdBase}`,
    creatorIsGuest: user?.isGuest ?? true,
  };
};

const applyLocalVote = (
  poll: Poll,
  optionId: number,
  voterName?: string | null,
  comment?: string | null,
): Poll | null => {
  if (isPollClosed(poll)) {
    return null;
  }

  const target = poll.options.find((option) => option.id === optionId);
  if (!target) {
    return null;
  }

  const normalizedComment = (comment || '').trim();

  const nextOptions = poll.options.map((option) =>
    option.id === optionId ? { ...option, voteCount: option.voteCount + 1 } : option,
  );

  const nextPoll: Poll = {
    ...poll,
    options: nextOptions,
    totalVotes: poll.totalVotes + 1,
    comments: [...poll.comments],
  };

  if (normalizedComment) {
    nextPoll.comments = [
      {
        id: nextPoll.comments.length + 1,
        voterName: (voterName || '익명').trim() || '익명',
        comment: normalizedComment,
        createdAt: new Date().toISOString(),
        selectedOptionId: optionId,
        selectedOptionText: target.text,
      },
      ...nextPoll.comments,
    ];
  }

  return nextPoll;
};

const isPollPayload = (payload: any): payload is Poll => {
  return (
    Boolean(payload) &&
    typeof payload.id === 'string' &&
    payload.id.trim() !== '' &&
    typeof payload.question === 'string' &&
    Array.isArray(payload.options) &&
    payload.options.every(
      (option: any) => option && typeof option.id === 'number' && typeof option.text === 'string',
    ) &&
    Array.isArray(payload.comments) &&
    typeof payload.totalVotes === 'number' &&
    typeof payload.createdAt === 'string'
  );
};

const ensurePollPayload = (payload: any): Poll => {
  if (!isPollPayload(payload)) {
    throw new Error('응답 데이터가 유효한 고민 형식이 아닙니다.');
  }

  return payload;
};

const resolvePollErrorMessage = (payload: any, fallback: string): string => {
  if (typeof payload?.message === 'string') {
    return payload.message;
  }

  if (Array.isArray(payload?.message)) {
    const message = payload.message
      .map((item: any) => {
        if (typeof item === 'string') {
          return item;
        }

        if (item && typeof item.message === 'string') {
          return item.message;
        }

        return null;
      })
      .filter((item: any) => typeof item === 'string')
      .join(', ');

    if (message) {
      return message;
    }
  }

  if (Array.isArray(payload?.errors) && payload.errors.length > 0) {
    return payload.errors[0]?.message || fallback;
  }

  return fallback;
};

const setAuthSessionExpired = async (
  res: Response,
  fallback: string,
  parseApiPayload: (res: Response) => Promise<any>,
  useAuthStore: PollAuthStore,
) => {
  const payload = await parseApiPayload(res);
  const message = resolvePollErrorMessage(payload, fallback);
  if (res.status === 401) {
    useAuthStore.getState().invalidateSession(message);
  }
  return message;
};

const getAuthToken = (useAuthStore: PollAuthStore) =>
  useAuthStore.getState().token || localStorage.getItem('picky_token');

interface ParsedPollsPage {
  items: Poll[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * GET /polls 응답을 페이지네이션 봉투로 정규화한다.
 * 신규 형태 { items, total, page, limit, hasMore } 우선, 구버전 배열 응답도 하위호환으로 받아준다.
 */
const parsePollsPage = (
  data: any,
  requestedPage: number,
  fallbackLimit: number,
): ParsedPollsPage => {
  if (Array.isArray(data)) {
    const items = data.filter((item): item is Poll => isPollPayload(item));
    return {
      items,
      total: items.length,
      page: 1,
      limit: items.length || fallbackLimit,
      hasMore: false,
    };
  }

  const rawItems = Array.isArray(data?.items) ? data.items : [];
  const items = rawItems.filter((item: any): item is Poll => isPollPayload(item));
  const total = typeof data?.total === 'number' ? data.total : items.length;
  const limit = typeof data?.limit === 'number' && data.limit > 0 ? data.limit : fallbackLimit;
  const page = typeof data?.page === 'number' && data.page >= 1 ? data.page : requestedPage;
  const hasMore =
    typeof data?.hasMore === 'boolean' ? data.hasMore : (page - 1) * limit + items.length < total;
  return { items, total, page, limit, hasMore };
};

const excludePollById = (polls: Poll[], pollId: string): Poll[] =>
  polls.filter((poll) => poll.id !== pollId);

const replacePollById = (polls: Poll[], pollId: string, replacement: Poll): Poll[] =>
  polls.map((poll) => (poll.id === pollId ? replacement : poll));

const buildPollRemovalUpdate =
  (pollId: string) =>
  (state: PollState): Partial<PollState> => ({
    polls: excludePollById(state.polls, pollId),
    currentPoll: state.currentPoll?.id === pollId ? null : state.currentPoll,
    error: null,
  });

export const createPollStoreState =
  ({
    parseApiPayload,
    requestApi,
    useAuthStore,
    canCreateLocalPollFromStatus,
    canCreateLocalPollFromError,
    canApplyLocalVoteFallback,
  }: PollStoreFactoryOptions): StoreStateCreator<PollState> =>
  (set, get) => ({
    polls: [],
    currentPoll: null,
    isLoading: false,
    error: null,
    page: 1,
    limit: POLLS_PAGE_SIZE,
    total: 0,
    hasMore: false,
    filters: { ...DEFAULT_POLL_FILTERS },
    setCurrentPoll: (poll: Poll | null) => {
      if (!poll) {
        set({ currentPoll: null });
        return;
      }

      upsertPollToCache(poll, get().polls);
      set({ currentPoll: poll });
    },
    clearError: () => set({ error: null }),

    fetchPolls: async (requestedPage?: number, filterPatch?: Partial<PollListFilters>) => {
      const limit = get().limit || POLLS_PAGE_SIZE;
      const targetPage = Math.max(1, Math.floor(requestedPage ?? 1) || 1);
      // 마지막 필터에 patch를 병합해 서버 질의에 반영하고, 다음 페이지 이동에서도 재사용한다.
      const nextFilters: PollListFilters = { ...get().filters, ...filterPatch };
      const params = new URLSearchParams({
        page: String(targetPage),
        limit: String(limit),
      });
      if (nextFilters.q.trim()) params.set('q', nextFilters.q.trim());
      if (nextFilters.sort !== 'latest') params.set('sort', nextFilters.sort);
      if (nextFilters.status !== 'all') params.set('status', nextFilters.status);
      if (nextFilters.category) params.set('category', nextFilters.category);
      set({ isLoading: true, error: null, filters: nextFilters });
      try {
        const res = await requestApi(`/polls?${params.toString()}`);
        if (!res.ok) {
          const errData = await parseApiPayload(res);
          // 실패 시 1페이지에서만 로컬 캐시로 폴백(오프라인 작성 고민 보존).
          const fallback =
            targetPage === 1 ? mergePollsWithLocalCache([], nextFilters) : get().polls;
          set({
            polls: fallback,
            isLoading: false,
            page: targetPage,
            error: resolvePollErrorMessage(errData, '고민 목록을 가져오는데 실패했습니다.'),
          });
          return;
        }
        const data = await parseApiPayload(res);
        const parsed = parsePollsPage(data, targetPage, limit);

        // 1페이지에만 로컬 캐시(오프라인 작성 등)를 합쳐 노출한다. 다른 페이지는 서버 결과 그대로.
        const polls =
          parsed.page === 1 ? mergePollsWithLocalCache(parsed.items, nextFilters) : parsed.items;
        set({
          polls,
          isLoading: false,
          page: parsed.page,
          limit: parsed.limit,
          total: parsed.total,
          hasMore: parsed.hasMore,
        });
      } catch (err: any) {
        const fallback = targetPage === 1 ? mergePollsWithLocalCache([], nextFilters) : get().polls;
        set({
          polls: fallback,
          page: targetPage,
          error: err.message || '에러가 발생했습니다.',
          isLoading: false,
        });
      }
    },

    fetchAllPolls: async () => {
      // 운영자 전체 집계(#W3) — 서버 최대 limit(50)로 페이지를 순회해 전부 모은다.
      const ADMIN_PAGE_LIMIT = 50;
      const aggregate: Poll[] = [];
      const seen = new Set<string>();
      let page = 1;
      // 안전 상한: 무한 루프 방지(50 × 200 = 1만 건까지).
      for (let guard = 0; guard < 200; guard += 1) {
        const res = await requestApi(`/polls?page=${page}&limit=${ADMIN_PAGE_LIMIT}`);
        if (!res.ok) {
          break;
        }
        const parsed = parsePollsPage(await parseApiPayload(res), page, ADMIN_PAGE_LIMIT);
        for (const poll of parsed.items) {
          if (!seen.has(poll.id)) {
            seen.add(poll.id);
            aggregate.push(poll);
          }
        }
        if (!parsed.hasMore || parsed.items.length === 0) {
          break;
        }
        page += 1;
      }
      return aggregate;
    },

    goToPage: async (page: number) => {
      await get().fetchPolls(Math.max(1, Math.floor(page) || 1));
    },

    nextPage: async () => {
      if (!get().hasMore) {
        return;
      }
      await get().fetchPolls(get().page + 1);
    },

    prevPage: async () => {
      if (get().page <= 1) {
        return;
      }
      await get().fetchPolls(get().page - 1);
    },

    fetchPoll: async (id, code) => {
      if (id.startsWith('local-')) {
        const cached = get().polls.find((poll) => poll.id === id) || findPollFromLocalCache(id);
        if (cached) {
          set({ currentPoll: cached, error: null, isLoading: false });
          return cached;
        }
      }

      set({ isLoading: true, error: null, currentPoll: null });
      try {
        const res = await requestApi(
          `/polls/${id}${code ? `?code=${encodeURIComponent(code)}` : ''}`,
        );
        if (!res.ok) {
          const cached = get().polls.find((poll) => poll.id === id) || findPollFromLocalCache(id);

          if (
            cached &&
            (res.status === 404 ||
              res.status === 405 ||
              res.status >= 500 ||
              id.startsWith('local-'))
          ) {
            set({ currentPoll: cached, error: null, isLoading: false });
            return cached;
          }

          const errData = await parseApiPayload(res);
          throw new Error(resolvePollErrorMessage(errData, '해당 고민을 찾을 수 없습니다.'));
        }
        const data = ensurePollPayload(await parseApiPayload(res));
        upsertPollToCache(data, get().polls);
        set({ currentPoll: data, isLoading: false });
        return data;
      } catch (err: any) {
        const cached = get().polls.find((poll) => poll.id === id) || findPollFromLocalCache(id);
        if (cached) {
          set({ currentPoll: cached, error: null, isLoading: false });
          return cached;
        }

        set({ error: err.message || '에러가 발생했습니다.', isLoading: false });
        return null;
      }
    },

    createPoll: async (input) => {
      set({ isLoading: true, error: null });
      const commitCreatedPoll = (data: Poll) => {
        const nextPolls = [data, ...excludePollById(get().polls, data.id)];
        upsertPollToCache(data, nextPolls);
        set({ polls: nextPolls, currentPoll: data, isLoading: false, error: null });
        return data;
      };

      try {
        // 비회원이라도 식별 세션을 먼저 확보해 creatorId 없는 '고아 고민'을 막는다.
        await useAuthStore.getState().ensureIdentity?.();
        const token = getAuthToken(useAuthStore);
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        const res = await requestApi('/polls', {
          method: 'POST',
          headers,
          body: JSON.stringify(input),
        });
        if (!res.ok) {
          if (canCreateLocalPollFromStatus(res.status)) {
            return commitCreatedPoll(createLocalPoll(input, useAuthStore.getState().user));
          }

          const message = await setAuthSessionExpired(
            res,
            '고민을 생성하는데 실패했습니다.',
            parseApiPayload,
            useAuthStore,
          );
          set({ error: message, isLoading: false });
          return null;
        }

        const data = ensurePollPayload(await parseApiPayload(res));
        return commitCreatedPoll(data);
      } catch (err: any) {
        if (canCreateLocalPollFromError()) {
          console.info('[picky] falling back to local poll creation', err);
          return commitCreatedPoll(createLocalPoll(input, useAuthStore.getState().user));
        }

        set({
          error:
            err.message ||
            '고민을 서버에 저장하지 못했습니다. 잠시 후 다시 시도하거나 관리자에게 문의해 주세요.',
          isLoading: false,
        });
        return null;
      }
    },

    vote: async (id, input) => {
      set({ isLoading: true, error: null });
      const knownPoll =
        get().currentPoll ||
        get().polls.find((poll) => poll.id === id) ||
        findPollFromLocalCache(id);

      if (isPollClosed(knownPoll)) {
        set({ error: '마감된 투표에는 더 이상 참여할 수 없습니다.', isLoading: false });
        return false;
      }

      try {
        const token = getAuthToken(useAuthStore);
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        const res = await requestApi(`/polls/${id}/vote`, {
          method: 'POST',
          headers,
          body: JSON.stringify(input),
        });
        if (!res.ok) {
          const fallbackPoll =
            get().polls.find((poll) => poll.id === id) ||
            findPollFromLocalCache(id) ||
            get().currentPoll;

          if (fallbackPoll && canApplyLocalVoteFallback({ id, status: res.status })) {
            const nextPoll = applyLocalVote(
              fallbackPoll,
              input.optionId,
              input.voterName,
              input.comment,
            );
            if (nextPoll) {
              upsertPollToCache(nextPoll, get().polls);
              set((state) => ({
                currentPoll: nextPoll,
                polls: [nextPoll, ...excludePollById(state.polls, nextPoll.id)],
                isLoading: false,
              }));
              return true;
            }
          }

          const message = await setAuthSessionExpired(
            res,
            '투표 제출에 실패했습니다.',
            parseApiPayload,
            useAuthStore,
          );
          throw new Error(message);
        }
        const data = ensurePollPayload(await parseApiPayload(res));
        set((state) => ({
          currentPoll: data,
          polls: replacePollById(state.polls, id, data),
          isLoading: false,
        }));
        return true;
      } catch (err: any) {
        set({ error: err.message || '에러가 발생했습니다.', isLoading: false });
        return false;
      }
    },

    deletePoll: async (id) => {
      const dropFromState = () => {
        removePollFromCache(id);
        set(buildPollRemovalUpdate(id));
      };

      if (id.startsWith('local-')) {
        dropFromState();
        return true;
      }

      set({ error: null });
      try {
        const token = getAuthToken(useAuthStore);
        const headers: Record<string, string> = {};
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        const res = await requestApi(`/polls/${id}`, { method: 'DELETE', headers });
        if (!res.ok) {
          const message = await setAuthSessionExpired(
            res,
            '고민을 삭제하지 못했습니다.',
            parseApiPayload,
            useAuthStore,
          );
          set({ error: message });
          return false;
        }

        dropFromState();
        return true;
      } catch (err: any) {
        set({ error: err.message || '에러가 발생했습니다.' });
        return false;
      }
    },

    updatePoll: async (id, patch) => {
      set({ error: null });
      try {
        const token = getAuthToken(useAuthStore);
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        const res = await requestApi(`/polls/${id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(patch),
        });
        if (!res.ok) {
          const message = await setAuthSessionExpired(
            res,
            '고민을 수정하지 못했습니다.',
            parseApiPayload,
            useAuthStore,
          );
          set({ error: message });
          return null;
        }

        const data = ensurePollPayload(await parseApiPayload(res));
        upsertPollToCache(data, get().polls);
        set((state) => ({
          polls: replacePollById(state.polls, id, data),
          currentPoll: state.currentPoll?.id === id ? data : state.currentPoll,
          error: null,
        }));
        return data;
      } catch (err: any) {
        set({ error: err.message || '에러가 발생했습니다.' });
        return null;
      }
    },

    deleteComment: async (id, commentId) => {
      set({ error: null });
      const removeComment = (poll: Poll): Poll => ({
        ...poll,
        comments: poll.comments.filter((comment) => comment.id !== commentId),
      });

      try {
        const token = getAuthToken(useAuthStore);
        const headers: Record<string, string> = {};
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        const res = await requestApi(`/polls/${id}/comments/${commentId}`, {
          method: 'DELETE',
          headers,
        });
        if (!res.ok) {
          const message = await setAuthSessionExpired(
            res,
            '댓글을 삭제하지 못했습니다.',
            parseApiPayload,
            useAuthStore,
          );
          set({ error: message });
          return false;
        }

        const current = get().currentPoll;
        if (current?.id === id) {
          upsertPollToCache(removeComment(current), get().polls);
        }
        set((state) => ({
          polls: state.polls.map((poll) => (poll.id === id ? removeComment(poll) : poll)),
          currentPoll:
            state.currentPoll?.id === id ? removeComment(state.currentPoll) : state.currentPoll,
          error: null,
        }));
        return true;
      } catch (err: any) {
        set({ error: err.message || '에러가 발생했습니다.' });
        return false;
      }
    },

    addComment: async (id, input) => {
      set({ error: null });
      try {
        const token = getAuthToken(useAuthStore);
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        const res = await requestApi(`/polls/${id}/comments`, {
          method: 'POST',
          headers,
          body: JSON.stringify(input),
        });
        if (!res.ok) {
          const errData = await parseApiPayload(res);
          set({ error: resolvePollErrorMessage(errData, '한마디 등록에 실패했습니다.') });
          return null;
        }

        const data = ensurePollPayload(await parseApiPayload(res));
        upsertPollToCache(data, get().polls);
        set((state) => ({
          currentPoll: state.currentPoll?.id === id ? data : state.currentPoll,
          polls: state.polls.map((poll) => (poll.id === id ? data : poll)),
          error: null,
        }));
        return data;
      } catch (err: any) {
        set({ error: err.message || '에러가 발생했습니다.' });
        return null;
      }
    },
  });
