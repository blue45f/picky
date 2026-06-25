/** 피키 브랜드 토큰 (다크 + 에메랄드 + 글래스모피즘 기반 프리미엄 UI 적용). */
export const theme = {
  bg: '#05100e',
  // 불투명 다크 카드 — 본문 오로라 그라데이션이 비쳐 텍스트 대비가 흔들리지 않게 완전 불투명 처리.
  // (반투명이면 움직이는 배경 위에서 흰 텍스트 대비가 들쭉날쭉 → WCAG 1.4.3 위반으로 측정됨)
  surface: '#0e211c',
  surfaceAlt: '#122d26',
  surfaceStrong: '#143329',
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

/**
 * TDS 4px 그리드에 맞춘 간격 토큰. 인라인 매직넘버 대신 의미 단위로 쓰면
 * 화면 간 리듬이 일관돼요(토스 Foundation Spacing 규칙 준수).
 */
export const SPACE = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

/**
 * TDS Typography 토큰에 근사한 본문 타입 램프(px).
 * 토스 가이드는 하드코딩보다 토큰화를 권장해요 — 분수 폰트값(13.5/14.5/16.5 등)을
 * 이 정수 램프로 통일해 더 큰 텍스트 모드에서도 비율이 깨지지 않게 해요.
 */
export const FONT = {
  /** 캡션·메타(t7 근사) */
  caption: 12,
  /** 보조 본문(t6) */
  small: 13,
  /** 기본 본문(t5) */
  body: 14,
  /** 강조 본문·입력(t5+) — iOS 줌 방지 16px 플로어 */
  bodyLg: 15,
  /** 리스트 제목·라벨(t4) */
  subtitle: 17,
  /** 카드 제목(t3) */
  title: 18,
  /** 섹션 헤드라인(t2) */
  heading: 22,
  /** 상세 히어로 질문(t1) */
  hero: 26,
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
