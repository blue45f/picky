/**
 * 통합 오디오 엔진 — web/토스 두 앱이 공유하는 단일 소스.
 *
 * BGM 은 2계층: 호스티드 mp3(public /audio/playlist.json, 가사 트랙 대비)가 있으면 우선,
 * 없으면 기존 WebAudio 합성 5트랙으로 폴백해요(파일 없음 상태에서 완전 무해).
 *
 * 공개 표면:
 *  - 효과음:   playClick, installGlobalClickSounds
 *  - BGM:      bgmPlay, bgmPause, bgmNext, getCurrentTrackName
 *  - 호스티드:  configureHostedAudio(base URL 주입), loadHostedPlaylist(프리페치)
 *  - 볼륨/음소거: setBgmVolume, getBgmVolume, setAllMuted, isAllMuted
 *  - 상태/구독: getSoundState, onSoundStateChange, setSfxEnabled, setBgmEnabled,
 *              isSfxEnabled, isBgmEnabled
 *  - 컨텍스트:  resumeAudio (제스처 언락이 필요할 때)
 *
 * 모든 호출은 SSR/비브라우저/미지원 환경에서 graceful no-op 입니다.
 */

export { playClick, installGlobalClickSounds, type ClickVariant } from './sfx';

export {
  setBgmEnabled,
  setSfxEnabled,
  isSfxEnabled,
  isBgmEnabled,
  getSoundState,
  onSoundStateChange,
  getCurrentTrackName,
  setBgmVolume,
  getBgmVolume,
  setAllMuted,
  isAllMuted,
  type SoundState,
  type SoundStateListener,
} from './settings';

export { resumeAudio, getAudioContext } from './context';

export { BGM_TRACKS } from './tracks';

export {
  configureHostedAudio,
  loadHostedPlaylist,
  type BgmSource,
  type HostedTrack,
  type HostedTrackCredit,
} from './hosted';

import { setBgmEnabled, nextTrack, getCurrentTrackName } from './settings';

/** BGM 재생 시작(토글 ON). 사용자 제스처 안에서 호출하면 컨텍스트가 언락돼요. */
export const bgmPlay = (): void => setBgmEnabled(true);

/** BGM 정지(토글 OFF). */
export const bgmPause = (): void => setBgmEnabled(false);

/** 다음 BGM 트랙으로 전환. */
export const bgmNext = (): void => nextTrack();

/** 현재(또는 다음 시작할) 트랙명. (별칭 재노출) */
export { getCurrentTrackName as currentTrackName };
