import { theme } from '../theme';

/**
 * 선택지별 차트 색상 팔레트(OKLCH, 테마 독립).
 * 웹(apps/web)의 동일 팔레트를 이식해 선택지 색이 두 플랫폼에서 일관돼요.
 */
export const OPTION_COLORS = [
  'oklch(62% 0.18 260)', // Indigo
  'oklch(78% 0.14 85)', // Gold
  'oklch(72% 0.15 170)', // Teal
  'oklch(64% 0.18 25)', // Coral
  'oklch(60% 0.15 320)', // Purple
  'oklch(70% 0.12 130)', // Lime
  'oklch(65% 0.15 210)', // Cyan
  'oklch(75% 0.11 60)', // Orange
  'oklch(58% 0.16 290)', // Magenta
  'oklch(68% 0.14 100)', // Olive
] as const;

interface VoteDonutChartProps {
  options: { id: number; text: string; voteCount: number }[];
}

/**
 * 순수 React+SVG 도넛 차트(의존성 0). 총 0표면 호출 측에서 숨김 가드를 두는 걸 권장하지만,
 * 방어적으로 여기서도 0표면 null을 반환해 빈 도넛을 그리지 않아요.
 */
export function VoteDonutChart({ options }: Readonly<VoteDonutChartProps>) {
  const total = options.reduce((sum, opt) => sum + opt.voteCount, 0);
  if (total === 0) {
    return null;
  }

  let accumulatedPercent = 0;
  const radius = 46;
  const circumference = 2 * Math.PI * radius;

  // 스크린리더용 분포 요약 — 도넛은 시각 전용이라 텍스트 대안으로 각 선택지 비율을 읽어준다.
  const distributionLabel = options
    .filter((opt) => opt.voteCount > 0)
    .map((opt) => `${opt.text} ${Math.round((opt.voteCount / total) * 100)}%`)
    .join(', ');
  const chartLabel = `투표 결과 도넛 차트. 총 ${total}표 — ${distributionLabel}`;

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        width: 150,
        height: 150,
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 120 120"
        role="img"
        aria-label={chartLabel}
        style={{ transform: 'rotate(-90deg)' }}
      >
        <title>{chartLabel}</title>
        {options.map((opt, i) => {
          const percent = opt.voteCount / total;
          if (percent === 0) {
            return null;
          }
          const strokeDasharray = `${percent * circumference} ${circumference}`;
          const strokeDashoffset = -accumulatedPercent * circumference;
          accumulatedPercent += percent;
          const color = OPTION_COLORS[i % OPTION_COLORS.length];

          return (
            <circle
              key={opt.id}
              cx="60"
              cy="60"
              r={radius}
              fill="transparent"
              stroke={color}
              strokeWidth="12"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }}
            />
          );
        })}
      </svg>
      <div
        style={{
          position: 'absolute',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}
      >
        <span style={{ fontSize: 20, fontWeight: 800, color: theme.text }}>{total}표</span>
        <span style={{ fontSize: 11, color: theme.textMuted, fontWeight: 500 }}>총 참여자</span>
      </div>
    </div>
  );
}
