/** 픽플로우 브랜드 토큰 (다크 + 에메랄드). */
export const theme = {
  bg: '#061411',
  surface: '#0c1f1a',
  surfaceAlt: '#102a23',
  border: 'rgba(255, 255, 255, 0.08)',
  text: '#f4fbf8',
  textMuted: '#9fb4ad',
  accent: '#13c2a3',
  accentSoft: 'rgba(19, 194, 163, 0.16)',
  accentInk: '#041412',
  danger: '#ff6b6b',
  radius: 16,
} as const;

/** 본문 공통 컨테이너 (하단 고정 액션바 여백 포함). */
export const pageShell: React.CSSProperties = {
  maxWidth: 520,
  margin: '0 auto',
  padding: '8px 20px 120px',
};
