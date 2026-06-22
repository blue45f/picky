import type { Poll, CreatePollInput, VoteInput } from '@picky/shared';
import type { AuthState } from './authStoreFactory';

type StoreSet<T> = (
  partial: Partial<T> | T | ((state: T) => Partial<T> | T),
  replace?: false,
) => void;
type StoreGet<T> = () => T;
type StoreStateCreator<T> = (set: StoreSet<T>, get: StoreGet<T>) => T;

export interface PollState {
  polls: Poll[];
  currentPoll: Poll | null;
  isLoading: boolean;
  error: string | null;
  setCurrentPoll: (poll: Poll | null) => void;
  clearError: () => void;

  fetchPolls: () => Promise<void>;
  fetchPoll: (id: string) => Promise<Poll | null>;
  createPoll: (input: CreatePollInput) => Promise<Poll | null>;
  vote: (id: string, input: VoteInput) => Promise<boolean>;
  deletePoll: (id: string) => Promise<boolean>;
}

interface PollAuthStore {
  getState: () => Pick<AuthState, 'user' | 'token' | 'invalidateSession'>;
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
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(LOCAL_POLL_CACHE_KEY);
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
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const compacted = polls.slice(0, 300);
    window.localStorage.setItem(LOCAL_POLL_CACHE_KEY, JSON.stringify(compacted));
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

const mergePollsWithLocalCache = (remotePolls: Poll[]) => {
  const cached = loadCachedPolls();
  const cachedMap = new Map<string, Poll>(cached.map((poll) => [poll.id, poll]));
  const nextPolls = remotePolls.filter((poll) => {
    cachedMap.delete(poll.id);
    return true;
  });

  return [...nextPolls, ...cachedMap.values()];
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
    setCurrentPoll: (poll: Poll | null) => {
      if (!poll) {
        set({ currentPoll: null });
        return;
      }

      upsertPollToCache(poll, get().polls);
      set({ currentPoll: poll });
    },
    clearError: () => set({ error: null }),

    fetchPolls: async () => {
      set({ isLoading: true, error: null });
      try {
        const res = await requestApi('/polls');
        if (!res.ok) {
          const errData = await parseApiPayload(res);
          const fallback = mergePollsWithLocalCache([]);
          set({
            polls: fallback,
            isLoading: false,
            error: resolvePollErrorMessage(errData, '고민 목록을 가져오는데 실패했습니다.'),
          });
          return;
        }
        const data = await parseApiPayload(res);
        const parsed = Array.isArray(data)
          ? data.filter((item): item is Poll => isPollPayload(item))
          : [];

        const merged = mergePollsWithLocalCache(parsed);
        set({ polls: merged, isLoading: false });
      } catch (err: any) {
        const fallback = mergePollsWithLocalCache([]);
        set({ polls: fallback, error: err.message || '에러가 발생했습니다.', isLoading: false });
      }
    },

    fetchPoll: async (id) => {
      if (id.startsWith('local-')) {
        const cached = get().polls.find((poll) => poll.id === id) || findPollFromLocalCache(id);
        if (cached) {
          set({ currentPoll: cached, error: null, isLoading: false });
          return cached;
        }
      }

      set({ isLoading: true, error: null, currentPoll: null });
      try {
        const res = await requestApi(`/polls/${id}`);
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
        const nextPolls = [data, ...get().polls.filter((poll) => poll.id !== data.id)];
        upsertPollToCache(data, nextPolls);
        set({ polls: nextPolls, currentPoll: data, isLoading: false, error: null });
        return data;
      };

      try {
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
                polls: [nextPoll, ...state.polls.filter((poll) => poll.id !== nextPoll.id)],
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
          polls: state.polls.map((p) => (p.id === id ? data : p)),
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
        set((state) => ({
          polls: state.polls.filter((poll) => poll.id !== id),
          currentPoll: state.currentPoll?.id === id ? null : state.currentPoll,
          error: null,
        }));
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
  });
