import { create } from 'zustand';
import { Poll, CreatePollInput, VoteInput } from '@picky/shared';
import { useAuthStore } from './useAuthStore';
import { getApiBaseUrl, parseApiPayload } from '../lib/api';

interface PollState {
  polls: Poll[];
  currentPoll: Poll | null;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;

  fetchPolls: () => Promise<void>;
  fetchPoll: (id: string) => Promise<Poll | null>;
  createPoll: (input: CreatePollInput) => Promise<Poll | null>;
  vote: (id: string, input: VoteInput) => Promise<boolean>;
}

const API_BASE = getApiBaseUrl();

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

export const usePollStore = create<PollState>((set) => ({
  polls: [],
  currentPoll: null,
  isLoading: false,
  error: null,
  clearError: () => set({ error: null }),

  fetchPolls: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${API_BASE}/polls`);
      if (!res.ok) {
        const errData = await parseApiPayload(res);
        throw new Error(resolvePollErrorMessage(errData, '고민 목록을 가져오는데 실패했습니다.'));
      }
      const data = (await parseApiPayload(res)) as Poll[];
      set({ polls: data, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || '에러가 발생했습니다.', isLoading: false });
    }
  },

  fetchPoll: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${API_BASE}/polls/${id}`);
      if (!res.ok) {
        const errData = await parseApiPayload(res);
        throw new Error(resolvePollErrorMessage(errData, '해당 고민을 찾을 수 없습니다.'));
      }
      const data = (await parseApiPayload(res)) as Poll;
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

      const res = await fetch(`${API_BASE}/polls`, {
        method: 'POST',
        headers,
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const message = await setAuthSessionExpired(res, '고민을 생성하는데 실패했습니다.');
        throw new Error(message);
      }

      const data = (await parseApiPayload(res)) as Poll;
      set((state) => ({ polls: [data, ...state.polls], isLoading: false }));
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

      const res = await fetch(`${API_BASE}/polls/${id}/vote`, {
        method: 'POST',
        headers,
        body: JSON.stringify(input),
      });
      if (!res.ok) {
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
