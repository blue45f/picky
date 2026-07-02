// 통합 오디오 엔진(효과음·BGM·사운드 설정)은 packages/client 로 단일화했어요(web/toss 공통).
// 앱인토스 .ait 번들러가 workspace 패키지를 처리하지 못해 소스 파일을 상대 경로로 직접 재수출해요.
import { configureHostedAudio } from '../../../../packages/client/src/lib/audio';

export {
  playClick,
  installGlobalClickSounds,
  bgmPlay,
  bgmPause,
  bgmNext,
  getCurrentTrackName,
  // 효과음 활성 여부의 명령형 게터(훅 아님) — 햅틱을 효과음 음소거에 연동할 때 사용해요.
  isSfxEnabled,
  isBgmEnabled,
  getAudioContext,
  type ClickVariant,
} from '../../../../packages/client/src/lib/audio';

export {
  useSoundSettings,
  type UseSoundSettings,
} from '../../../../packages/client/src/store/useSoundSettings';

// 호스티드 BGM(mp3 플레이리스트) 자산은 공개 웹 오리진에서 서빙돼요 — 토스 WebView 는
// 오리진이 달라(https://picky.apps.tossmini.com) base URL 을 주입해야 manifest/mp3 를 찾아요.
// 미설정/실패 시 기존 합성 BGM 폴백이라 완전 무해해요.
configureHostedAudio({
  baseUrl: import.meta.env.VITE_PUBLIC_APP_URL?.trim() || 'https://picky-olive.vercel.app',
});
