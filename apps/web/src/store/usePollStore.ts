import { create } from 'zustand';
import { parseApiPayload, requestApi } from '../lib/api';
import {
  createPollStoreState,
  type PollState,
} from '../../../../packages/client/src/store/pollStoreFactory';
import { useAuthStore } from './useAuthStore';

// 폴백 정책(로컬 폴 생성·로컬 투표 반영)은 packages/client 의 단일 정책으로 통일했어요.
// web/toss가 같은 동작을 쓰도록 별도 게이트를 두지 않습니다(프로덕션 가짜 성공·유령 폴 제거).
export const usePollStore = create<PollState>(
  createPollStoreState({
    parseApiPayload,
    requestApi,
    useAuthStore,
  }),
);
