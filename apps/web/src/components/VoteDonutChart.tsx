import React from 'react';
import { VoteDonutChart as VoteDonutChartCore } from '../../../../packages/client/src/components/VoteDonutChart';

// Option Colors for Charts (웹 디자인 토큰 색 — 코어 차트에 주입).
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
];

interface VoteDonutChartProps {
  options: { id: number; text: string; voteCount: number }[];
}

const emptyState = (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '140px',
      color: 'var(--text-muted)',
      fontSize: '0.8rem',
    }}
  >
    투표 집계 데이터가 없습니다.
  </div>
);

export const VoteDonutChart: React.FC<VoteDonutChartProps> = ({ options }) => (
  <VoteDonutChartCore
    options={options}
    colors={OPTION_COLORS}
    emptyState={emptyState}
    size="150px"
    totalLabelStyle={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}
    captionStyle={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 500 }}
  />
);
