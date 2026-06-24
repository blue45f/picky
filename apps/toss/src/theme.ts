/** 픽플로우 브랜드 토큰 (다크 + 에메랄드 + 글래스모피즘 기반 프리미엄 UI 적용). */
export const theme = {
  bg: '#05100e',
  surface: 'rgba(12, 31, 26, 0.72)', // 영롱한 반투명 글래스
  surfaceAlt: 'rgba(16, 42, 35, 0.88)',
  surfaceStrong: 'rgba(20, 51, 41, 0.95)',
  border: 'rgba(255, 255, 255, 0.05)', // 은은한 흰색 오버레이
  borderStrong: 'rgba(255, 255, 255, 0.12)',
  text: '#f4fbf8',
  textMuted: '#9fb4ad',
  textFaint: '#6c857d',
  accent: '#13c2a3',
  accentStrong: '#2ee0bf',
  accentSoft: 'rgba(19, 194, 163, 0.16)',
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

/** 하단 고정 액션바(safe-area 포함). */
export const stickyActionBar: React.CSSProperties = {
  position: 'fixed',
  left: 0,
  right: 0,
  bottom: 0,
  padding: '12px 20px calc(12px + env(safe-area-inset-bottom))',
  background: `linear-gradient(to top, ${theme.bg} 72%, transparent)`,
};
