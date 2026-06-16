import { create } from 'zustand';
import { Poll, CreatePollInput, VoteInput } from '@picky/shared';
import { useAuthStore } from './useAuthStore';
import { parseApiPayload, requestApi } from '../lib/api';

interface PollState {
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
              .filter((option: any) => option && typeof option.id === 'number' && typeof option.text === 'string')
              .map((option: any) => ({
                id: option.id,
                text: option.text,
                voteCount: typeof option.voteCount === 'number' ? option.voteCount : 0,
                imageUrl: option.imageUrl,
              }))
          : [],
        comments: Array.isArray(item.comments)
          ? item.comments
              .filter((comment: any) => comment && typeof comment.id === 'number' && typeof comment.voterName === 'string' && typeof comment.comment === 'string')
              .map((comment: any) => ({
                id: comment.id,
                voterName: comment.voterName,
                comment: comment.comment,
                createdAt: typeof comment.createdAt === 'string' ? comment.createdAt : new Date().toISOString(),
                selectedOptionId: typeof comment.selectedOptionId === 'number' ? comment.selectedOptionId : undefined,
                selectedOptionText:
                  typeof comment.selectedOptionText === 'string' ? comment.selectedOptionText : undefined,
              }))
          : [],
        createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
        totalVotes: typeof item.totalVotes === 'number' ? item.totalVotes : 0,
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
  const next = [
    poll,
    ...sourcePolls.filter((item) => item.id !== poll.id),
  ].filter((item) => item.id);
  persistCachedPolls(next);
  return next;
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

const applyLocalVote = (
  poll: Poll,
  optionId: number,
  voterName?: string | null,
  comment?: string | null,
): Poll | null => {
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

const setAuthSessionExpired = async (res: Response, fallback: string) => {
  const payload = await parseApiPayload(res);
  const message = resolvePollErrorMessage(payload, fallback);
  if (res.status === 401) {
    useAuthStore.getState().invalidateSession(message);
  }
  return message;
};

const getAuthToken = () => useAuthStore.getState().token || localStorage.getItem('picky_token');

export const usePollStore = create<PollState>((set, get) => ({
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
        set({ polls: fallback, isLoading: false, error: resolvePollErrorMessage(errData, '고민 목록을 가져오는데 실패했습니다.') });
        return;
      }
      const data = (await parseApiPayload(res)) as Poll[];
      const merged = mergePollsWithLocalCache(data);
      set({ polls: merged, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || '에러가 발생했습니다.', isLoading: false });
    }
  },

  fetchPoll: async (id) => {
    set({ isLoading: true, error: null, currentPoll: null });
    try {
      const res = await requestApi(`/polls/${id}`);
      if (!res.ok) {
        const cached =
          get().polls.find((poll) => poll.id === id) ||
          findPollFromLocalCache(id);

        if (cached && res.status === 404) {
          set({ currentPoll: cached, error: null, isLoading: false });
          return cached;
        }

        const errData = await parseApiPayload(res);
        throw new Error(resolvePollErrorMessage(errData, '해당 고민을 찾을 수 없습니다.'));
      }
      const data = (await parseApiPayload(res)) as Poll;
      upsertPollToCache(data, get().polls);
      set({ currentPoll: data, isLoading: false });
      return data;
    } catch (err: any) {
      set({ error: err.message || '에러가 발생했습니다.', isLoading: false });
      return null;
    }
  },

  createPoll: async (input) => {
    set({ isLoading: true, error: null });
    try {
      const token = getAuthToken();
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
        const message = await setAuthSessionExpired(res, '고민을 생성하는데 실패했습니다.');
        throw new Error(message);
      }

      const data = (await parseApiPayload(res)) as Poll;
      const nextPolls = [data, ...get().polls.filter((poll) => poll.id !== data.id)];
      upsertPollToCache(data, nextPolls);
      set({ polls: nextPolls, currentPoll: data, isLoading: false });
      return data;
    } catch (err: any) {
      set({ error: err.message || '에러가 발생했습니다.', isLoading: false });
      return null;
    }
  },

  vote: async (id, input) => {
    set({ isLoading: true, error: null });
    try {
      const token = getAuthToken();
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

        if (fallbackPoll && res.status === 404) {
          const nextPoll = applyLocalVote(fallbackPoll, input.optionId, input.voterName, input.comment);
          if (nextPoll) {
            upsertPollToCache(nextPoll, get().polls);
            set((state) => ({
              currentPoll: nextPoll,
              polls: [
                nextPoll,
                ...state.polls.filter((poll) => poll.id !== nextPoll.id),
              ],
              isLoading: false,
            }));
            return true;
          }
        }

        const message = await setAuthSessionExpired(res, '투표 제출에 실패했습니다.');
        throw new Error(message);
      }
      const data = (await parseApiPayload(res)) as Poll;
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
}));
