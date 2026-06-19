import { create } from 'zustand';
import { parseApiPayload, requestApi } from '../lib/api';
import { createPollStoreState, type PollState } from './pollStoreFactory';
import { useAuthStore } from './useAuthStore';

const isRetryableLocalPollStatus = (status: number) =>
  status === 404 || status === 405 || status >= 500;

const isLocalPollFallbackAllowed = () => {
  if (import.meta.env.VITE_ALLOW_LOCAL_POLL_FALLBACK === 'true') {
    return true;
  }

  if (import.meta.env.DEV) {
    return true;
  }

  if (typeof window === 'undefined') {
    return false;
  }

  const { hostname } = window.location;
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.local');
};

export const usePollStore = create<PollState>(
  createPollStoreState({
    parseApiPayload,
    requestApi,
    useAuthStore,
    canCreateLocalPollFromStatus: (status) =>
      isLocalPollFallbackAllowed() && isRetryableLocalPollStatus(status),
    canCreateLocalPollFromError: isLocalPollFallbackAllowed,
    canApplyLocalVoteFallback: ({ id, status }) =>
      isRetryableLocalPollStatus(status) || id.startsWith('local-'),
  }),
);
