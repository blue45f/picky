import { create } from 'zustand';
import { Poll, CreatePollInput, VoteInput } from '@picky/shared';

interface PollState {
  polls: Poll[];
  currentPoll: Poll | null;
  isLoading: boolean;
  error: string | null;

  fetchPolls: () => Promise<void>;
  fetchPoll: (id: string) => Promise<Poll | null>;
  createPoll: (input: CreatePollInput) => Promise<Poll | null>;
  vote: (id: string, input: VoteInput) => Promise<boolean>;
}

const API_BASE = '/api';

export const usePollStore = create<PollState>((set) => ({
  polls: [],
  currentPoll: null,
  isLoading: false,
  error: null,

  fetchPolls: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${API_BASE}/polls`);
      if (!res.ok) throw new Error('고민 목록을 가져오는데 실패했습니다.');
      const data = await res.json();
      set({ polls: data, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || '에러가 발생했습니다.', isLoading: false });
    }
  },

  fetchPoll: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${API_BASE}/polls/${id}`);
      if (!res.ok) throw new Error('해당 고민을 찾을 수 없습니다.');
      const data = await res.json();
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
      const res = await fetch(`${API_BASE}/polls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || '고민을 생성하는데 실패했습니다.');
      }
      const data = await res.json();
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
      const res = await fetch(`${API_BASE}/polls/${id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || '투표 제출에 실패했습니다.');
      }
      const data = await res.json();
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
