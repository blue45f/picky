import { create } from 'zustand';
import { parseApiPayload, requestApi } from '../lib/api';
import { createPollStoreState, type PollState } from '../../../web/src/store/pollStoreFactory';
import { useAuthStore } from './useAuthStore';

const isRetryableLocalPollStatus = (status: number) =>
  status === 404 || status === 405 || status >= 500;

export const usePollStore = create<PollState>(
  createPollStoreState({
    parseApiPayload,
    requestApi,
    useAuthStore,
    canCreateLocalPollFromStatus: isRetryableLocalPollStatus,
    canCreateLocalPollFromError: () => true,
    canApplyLocalVoteFallback: ({ status }) => status === 404,
  }),
);
