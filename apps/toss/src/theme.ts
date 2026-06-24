/** 피키 브랜드 토큰 (다크 + 에메랄드 + 글래스모피즘 기반 프리미엄 UI 적용). */
export const theme = {
  bg: '#05100e',
  surface: 'rgba(14, 33, 28, 0.95)', // 거의 불투명한 다크 카드 — 가독성 우선(글래스 haze 제거)
  surfaceAlt: 'rgba(18, 45, 38, 0.97)',
  surfaceStrong: 'rgba(20, 51, 41, 0.95)',
  border: 'rgba(255, 255, 255, 0.05)', // 은은한 흰색 오버레이
  borderStrong: 'rgba(255, 255, 255, 0.12)',
  text: '#f4fbf8',
  textMuted: '#c5d8d1', // 보조 텍스트 — 고대비(다크 카드 위 ~11:1)
  textFaint: '#abc3bc', // 3차 텍스트 — 또렷하게(~9:1)
  accent: '#13c2a3',
  accentStrong: '#2ee0bf',
  accentSoft: 'rgba(19, 194, 163, 0.22)',
  accentInk: '#041412',
  gold: '#f4c560',
  goldSoft: 'rgba(244, 197, 96, 0.16)',
  success: '#34d399',
  warning: '#fbbf24',
  danger: '#ff6b6b',
  dangerSoft: 'rgba(255, 107, 107, 0.14)',
  track: 'rgba(255, 255, 255, 0.06)',
  overlay: 'rgba(0, 0, 0, 0.82)',
  radius: 22,
  radiusSm: 18,
  radiusPill: 999,
} as const;

/** 본문 공통 컨테이너 (하단 고정 액션바 여백 포함). */
export const pageShell: React.CSSProperties = {
  maxWidth: 520,
  margin: '0 auto',
  padding: '8px 20px 120px',
};

/**
 * 하단 고정 액션바(safe-area 포함).
 * 위로 18px 페이드 영역을 더 둬서 스크롤 끝 콘텐츠가 바 뒤에서 자연스럽게 사라지게 해요.
 * 콘텐츠 컨테이너의 bottom padding은 이 바 높이(≈버튼 52 + 상하 24 + safe-area)를
 * 충분히 덮도록 잡아야 마지막 콘텐츠가 가려지지 않아요.
 */
export const stickyActionBar: React.CSSProperties = {
  position: 'fixed',
  left: 0,
  right: 0,
  bottom: 0,
  paddingTop: 18,
  paddingLeft: 20,
  paddingRight: 20,
  paddingBottom: 'calc(12px + env(safe-area-inset-bottom))',
  background: `linear-gradient(to top, ${theme.bg} 0%, ${theme.bg} 78%, transparent 100%)`,
  pointerEvents: 'none',
};
