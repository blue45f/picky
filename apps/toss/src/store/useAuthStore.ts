import { create } from 'zustand';
import { parseApiPayload, requestApi } from '../lib/api';
import { tossAppLogin } from '../lib/toss';
import { createAuthStoreState, type AuthState } from '../../../web/src/store/authStoreFactory';

export const useAuthStore = create<AuthState>(
  createAuthStoreState({
    parseApiPayload,
    requestApi,
    tossAppLogin,
  }),
);
