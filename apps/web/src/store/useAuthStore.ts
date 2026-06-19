import { create } from 'zustand';
import { parseApiPayload, requestApi } from '../lib/api';
import { createAuthStoreState, type AuthState } from './authStoreFactory';

export const useAuthStore = create<AuthState>(
  createAuthStoreState({
    parseApiPayload,
    requestApi,
  }),
);
