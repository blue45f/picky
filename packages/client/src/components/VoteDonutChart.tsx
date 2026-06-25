import type { CSSProperties, ReactNode } from 'react';

/**
 * 순수 React+SVG 도넛 차트(의존성 0) — web/toss 두 앱이 공유하는 렌더 코어.
 * 선택지 색 팔레트(OPTION_COLORS)와 중앙 라벨 스타일·빈 상태는 **prop으로 주입**해
 * 각 앱이 자기 디자인 토큰(웹 CSS 변수 / 토스 theme)을 쓰도록 했어요.
 */
export interface VoteDonutChartOption {
  id: number;
  text: string;
  voteCount: number;
}

export interface VoteDonutChartProps {
  options: VoteDonutChartOption[];
  /** 선택지별 차트 색 팔레트(앱별 주입). i % colors.length 로 순환해요. */
  colors: readonly string[];
  /** 총 0표일 때 렌더할 내용(미지정 시 null). 웹은 안내 div, 토스는 null. */
  emptyState?: ReactNode;
  /** 바깥 컨테이너 크기(px 또는 CSS 길이). 기본 150. */
  size?: number | string;
  /** 중앙 "N표" 텍스트 스타일(앱별 색/폰트 주입). */
  totalLabelStyle?: CSSProperties;
  /** 중앙 "총 참여자" 보조 텍스트 스타일(앱별 주입). */
  captionStyle?: CSSProperties;
  /** 보조 캡션 문구(기본 "총 참여자"). */
  caption?: string;
}

const RADIUS = 46;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function VoteDonutChart({
  options,
  colors,
  emptyState = null,
  size = 150,
  totalLabelStyle,
  captionStyle,
  caption = '총 참여자',
}: Readonly<VoteDonutChartProps>) {
  const total = options.reduce((sum, opt) => sum + opt.voteCount, 0);
  if (total === 0) {
    return <>{emptyState}</>;
  }

  let accumulatedPercent = 0;

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
        width: size,
        height: size,
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
          const strokeDasharray = `${percent * CIRCUMFERENCE} ${CIRCUMFERENCE}`;
          const strokeDashoffset = -accumulatedPercent * CIRCUMFERENCE;
          accumulatedPercent += percent;
          const color = colors[i % colors.length];

          return (
            <circle
              key={opt.id}
              cx="60"
              cy="60"
              r={RADIUS}
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
        <span style={totalLabelStyle}>{total}표</span>
        <span style={captionStyle}>{caption}</span>
      </div>
    </div>
  );
}
