/**
 * 사운드 설정 React 훅 — web/토스 토글 UI 가 공유하는 단일 소스.
 *
 * 통합 오디오 엔진(`lib/audio`)의 외부 상태를 `useSyncExternalStore` 로 구독해, 엔진 상태가
 * 바뀔 때(토글·트랙 전환·가시성 복귀)마다 컴포넌트를 리렌더합니다. 엔진이 모든 영속/언락/
 * 로테이션을 책임지므로 훅은 얇은 view-model 입니다.
 *
 * SSR/비브라우저에서는 서버 스냅샷(기본값)을 돌려주고, 모든 setter 는 graceful no-op 입니다.
 */

import { useCallback, useSyncExternalStore } from 'react';
import {
  getSoundState,
  onSoundStateChange,
  setAllMuted as engineSetAllMuted,
  setBgmEnabled as engineSetBgmEnabled,
  setBgmVolume as engineSetBgmVolume,
  setSfxEnabled as engineSetSfxEnabled,
  type SoundState,
} from '../lib/audio/settings';
import { bgmNext } from '../lib/audio';

export interface UseSoundSettings {
  sfxEnabled: boolean;
  setSfxEnabled: (enabled: boolean) => void;
  bgmEnabled: boolean;
  setBgmEnabled: (enabled: boolean) => void;
  currentTrackName: string;
  /** 다음 BGM 트랙으로 전환. */
  nextTrack: () => void;
  /** BGM 볼륨(0~1). 슬라이더용. */
  bgmVolume: number;
  setBgmVolume: (value: number) => void;
  /** BGM 이 실제로 재생 중인지(인디케이터용). */
  isBgmPlaying: boolean;
  /** 마스터 음소거(SFX+BGM 전체) 여부. */
  allMuted: boolean;
  setAllMuted: (muted: boolean) => void;
  /** 현재 BGM 재생 주체 — 호스티드 mp3('hosted') 또는 합성('synth'). */
  bgmSource: SoundState['bgmSource'];
  /** 현재 트랙 크레딧(호스티드일 때만, 라이선스 표기용). */
  currentTrackCredit: SoundState['currentTrackCredit'];
}

// useSyncExternalStore 는 서버 스냅샷이 안정적(매번 같은 참조)이어야 해요.
const SERVER_SNAPSHOT: SoundState = {
  sfxEnabled: true,
  bgmEnabled: false,
  currentTrackName: '',
  bgmVolume: 0.5,
  isBgmPlaying: false,
  allMuted: false,
  bgmSource: 'synth',
  currentTrackCredit: null,
};

const getServerSnapshot = (): SoundState => SERVER_SNAPSHOT;

/**
 * 사운드 설정 상태와 setter 를 반환해요. 엔진 onChange 구독으로 리렌더됩니다.
 */
export const useSoundSettings = (): UseSoundSettings => {
  const state = useSyncExternalStore(onSoundStateChange, getSoundState, getServerSnapshot);

  const setSfxEnabled = useCallback((enabled: boolean) => {
    engineSetSfxEnabled(enabled);
  }, []);

  const setBgmEnabled = useCallback((enabled: boolean) => {
    engineSetBgmEnabled(enabled);
  }, []);

  const nextTrack = useCallback(() => {
    bgmNext();
  }, []);

  const setBgmVolume = useCallback((value: number) => {
    engineSetBgmVolume(value);
  }, []);

  const setAllMuted = useCallback((muted: boolean) => {
    engineSetAllMuted(muted);
  }, []);

  return {
    sfxEnabled: state.sfxEnabled,
    setSfxEnabled,
    bgmEnabled: state.bgmEnabled,
    setBgmEnabled,
    currentTrackName: state.currentTrackName,
    nextTrack,
    bgmVolume: state.bgmVolume,
    setBgmVolume,
    isBgmPlaying: state.isBgmPlaying,
    allMuted: state.allMuted,
    setAllMuted,
    bgmSource: state.bgmSource,
    currentTrackCredit: state.currentTrackCredit,
  };
};
