import { VoteDonutChart as VoteDonutChartCore } from '../../../../packages/client/src/components/VoteDonutChart';
import { theme } from '../theme';

/**
 * 선택지별 차트 색상 팔레트(OKLCH, 테마 독립).
 * 웹(apps/web)과 동일 팔레트라 선택지 색이 두 플랫폼에서 일관돼요.
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
 * 순수 React+SVG 도넛 차트(packages/client 코어 위 토스 테마 주입).
 * 총 0표면 호출 측에서 숨김 가드를 두는 걸 권장하지만, 방어적으로 0표면 null을 반환해요.
 */
export function VoteDonutChart({ options }: Readonly<VoteDonutChartProps>) {
  return (
    <VoteDonutChartCore
      options={options}
      colors={OPTION_COLORS}
      size={150}
      totalLabelStyle={{ fontSize: 20, fontWeight: 800, color: theme.text }}
      captionStyle={{ fontSize: 11, color: theme.textMuted, fontWeight: 500 }}
    />
  );
}
