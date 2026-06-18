/** 픽플로우 미니앱 공용 UI 프리미티브. TDS 셰임 드리프트 없이 일관된 디자인을 유지해요. */
import type { CSSProperties, ReactNode } from 'react';
import { theme } from '../theme';

type ChipTone = 'accent' | 'gold' | 'muted' | 'danger' | 'neutral';

const chipToneStyle: Record<ChipTone, CSSProperties> = {
  accent: { color: theme.accent, background: theme.accentSoft },
  gold: { color: theme.gold, background: theme.goldSoft },
  danger: { color: theme.danger, background: theme.dangerSoft },
  muted: { color: theme.textMuted, background: 'rgba(255,255,255,0.06)' },
  neutral: { color: theme.text, background: 'rgba(255,255,255,0.08)' },
};

/** 상태/메타 표시용 알약 배지. */
export function Chip({
  children,
  tone = 'muted',
  style,
}: {
  children: ReactNode;
  tone?: ChipTone;
  style?: CSSProperties;
}) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 11,
        fontWeight: 700,
        lineHeight: 1.4,
        padding: '3px 9px',
        borderRadius: theme.radiusPill,
        whiteSpace: 'nowrap',
        ...chipToneStyle[tone],
        ...style,
      }}
    >
      {children}
    </span>
  );
}

/** 가로 진행률 바 (애니메이션 채움). */
export function ProgressBar({
  percent,
  tone = 'accent',
  height = 6,
  track = theme.track,
}: {
  percent: number;
  tone?: 'accent' | 'gold' | 'muted';
  height?: number;
  track?: string;
}) {
  const clamped = Math.max(0, Math.min(100, percent));
  const fill =
    tone === 'gold' ? theme.gold : tone === 'muted' ? 'rgba(255,255,255,0.28)' : theme.accent;
  return (
    <div
      role="presentation"
      style={{
        height,
        borderRadius: theme.radiusPill,
        background: track,
        overflow: 'hidden',
      }}
    >
      <div
        className="pf-bar-fill"
        style={{
          height: '100%',
          width: `${clamped}%`,
          minWidth: clamped > 0 ? 6 : 0,
          borderRadius: 'inherit',
          background: fill,
        }}
      />
    </div>
  );
}

interface SegmentOption<T extends string> {
  value: T;
  label: ReactNode;
}

/** 탭/필터용 세그먼트 컨트롤 (단일 선택). */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: ReadonlyArray<SegmentOption<T>>;
  value: T;
  onChange: (next: T) => void;
  ariaLabel?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      style={{
        display: 'flex',
        gap: 4,
        padding: 4,
        borderRadius: theme.radiusSm,
        background: 'rgba(255,255,255,0.04)',
        border: `1px solid ${theme.border}`,
      }}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            className="pressable"
            onClick={() => onChange(option.value)}
            style={{
              flex: 1,
              minHeight: 34,
              border: 'none',
              borderRadius: theme.radiusSm - 2,
              background: active ? theme.accent : 'transparent',
              color: active ? theme.accentInk : theme.textMuted,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** 로딩 스켈레톤 블록. */
export function Skeleton({
  width = '100%',
  height = 16,
  radius = 8,
  style,
}: {
  width?: number | string;
  height?: number | string;
  radius?: number;
  style?: CSSProperties;
}) {
  return (
    <span
      aria-hidden
      className="pf-skeleton"
      style={{ display: 'block', width, height, borderRadius: radius, ...style }}
    />
  );
}

/** 상단 앱바 (뒤로가기 + 제목 + 우측 액션). */
export function AppBar({
  title,
  onBack,
  right,
}: {
  title?: ReactNode;
  onBack?: () => void;
  right?: ReactNode;
}) {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '12px 12px',
        paddingTop: 'calc(12px + env(safe-area-inset-top))',
      }}
    >
      {onBack ? (
        <button
          type="button"
          className="pressable"
          aria-label="뒤로"
          onClick={onBack}
          style={{
            flexShrink: 0,
            width: 40,
            height: 40,
            display: 'grid',
            placeItems: 'center',
            background: 'none',
            border: 'none',
            color: theme.text,
            fontSize: 24,
            lineHeight: 1,
            cursor: 'pointer',
          }}
        >
          ←
        </button>
      ) : null}
      <strong style={{ flex: 1, fontSize: 17, fontWeight: 800, minWidth: 0 }}>{title}</strong>
      {right ? <div style={{ flexShrink: 0 }}>{right}</div> : null}
    </header>
  );
}
