import React from 'react';
import {
  VoteDonutChart as VoteDonutChartCore,
  DEFAULT_OPTION_COLORS,
} from '../../../../packages/client/src/components/VoteDonutChart';

// Option Colors for Charts — 코어의 공유 팔레트를 그대로 사용(web/toss 단일 소스).
export const OPTION_COLORS = DEFAULT_OPTION_COLORS;

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
