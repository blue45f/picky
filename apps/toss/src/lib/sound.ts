// 통합 오디오 엔진(효과음·BGM·사운드 설정)은 packages/client 로 단일화했어요(web/toss 공통).
// 앱인토스 .ait 번들러가 workspace 패키지를 처리하지 못해 소스 파일을 상대 경로로 직접 재수출해요.
export {
  playClick,
  installGlobalClickSounds,
  bgmPlay,
  bgmPause,
  bgmNext,
  getCurrentTrackName,
  // 효과음 활성 여부의 명령형 게터(훅 아님) — 햅틱을 효과음 음소거에 연동할 때 사용해요.
  isSfxEnabled,
  type ClickVariant,
} from '../../../../packages/client/src/lib/audio';

export {
  useSoundSettings,
  type UseSoundSettings,
} from '../../../../packages/client/src/store/useSoundSettings';
