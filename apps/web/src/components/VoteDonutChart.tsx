import React from 'react';

// Option Colors for Charts
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

export const VoteDonutChart: React.FC<VoteDonutChartProps> = ({ options }) => {
  const total = options.reduce((sum, opt) => sum + opt.voteCount, 0);
  if (total === 0) {
    return (
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
  }

  let accumulatedPercent = 0;
  const radius = 46;
  const circumference = 2 * Math.PI * radius;

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        width: '150px',
        height: '150px',
      }}
    >
      <svg width="100%" height="100%" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
        {options.map((opt, i) => {
          const percent = opt.voteCount / total;
          if (percent === 0) return null;
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
        <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
          {total}표
        </span>
        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 500 }}>
          총 참여자
        </span>
      </div>
    </div>
  );
};
