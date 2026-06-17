import { useMemo, useState } from 'react';
import {
  BarChart3,
  Check,
  ClipboardList,
  Copy,
  FileText,
  MessageSquare,
  Radio,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { Poll } from '@picky/shared';
import { copyText } from '../lib/pollShare';

type ReportAudience = 'decision' | 'participants' | 'retrospective';

type StakeholderReportBuilderProps = {
  poll: Poll;
  shareUrl: string;
  pollClosed: boolean;
};

type ReportAudienceConfig = {
  id: ReportAudience;
  label: string;
  description: string;
};

const REPORT_AUDIENCES: ReportAudienceConfig[] = [
  {
    id: 'decision',
    label: '의사결정권자',
    description: '결론, 표본, 격차, 리스크를 압축해 보고합니다.',
  },
  {
    id: 'participants',
    label: '참여자 공지',
    description: '참여해준 사람들에게 결과와 다음 단계를 공유합니다.',
  },
  {
    id: 'retrospective',
    label: '운영 회고',
    description: '참여율, 의견률, 개선 포인트를 다음 투표에 남깁니다.',
  },
];

const POSITIVE_WORDS = ['좋', '추천', '찬성', '효율', '빠르', '쉬', '만족', '필요', '선호'];
const NEGATIVE_WORDS = ['걱정', '문제', '리스크', '어렵', '불안', '비싸', '부담', '반대', '복잡'];

const countMatches = (text: string, keywords: string[]): number => {
  const normalized = text.toLowerCase();
  return keywords.reduce(
    (count, keyword) => count + (normalized.includes(keyword.toLowerCase()) ? 1 : 0),
    0,
  );
};

const getSentimentLabel = (comments: Poll['comments']): { label: string; help: string } => {
  const score = comments.reduce((total, commentItem) => {
    const positive = countMatches(commentItem.comment, POSITIVE_WORDS);
    const negative = countMatches(commentItem.comment, NEGATIVE_WORDS);
    return total + positive - negative;
  }, 0);

  if (score > 1) {
    return {
      label: '긍정 우세',
      help: '찬성/선호 근거가 상대적으로 많습니다.',
    };
  }

  if (score < -1) {
    return {
      label: '리스크 우세',
      help: '우려나 반대 신호를 먼저 정리해야 합니다.',
    };
  }

  return {
    label: '중립',
    help: '찬반 신호가 혼재되어 있습니다.',
  };
};

const buildReportText = ({
  audience,
  confidenceScore,
  feedbackRate,
  leaderLine,
  poll,
  pollClosed,
  sentimentLabel,
  shareUrl,
  voteGap,
  voteGapShare,
}: {
  audience: ReportAudience;
  confidenceScore: number;
  feedbackRate: number;
  leaderLine: string;
  poll: Poll;
  pollClosed: boolean;
  sentimentLabel: string;
  shareUrl: string;
  voteGap: number;
  voteGapShare: number;
}): string => {
  const topComments = poll.comments
    .slice(0, 3)
    .map(
      (commentItem, index) =>
        `${index + 1}. ${commentItem.comment} - ${commentItem.voterName || '익명'}`,
    )
    .join('\n');

  if (audience === 'participants') {
    return [
      `[pickflow 결과 공유]`,
      `질문: ${poll.question}`,
      `결과: ${leaderLine}`,
      `참여: ${poll.totalVotes}명 · 의견 ${poll.comments.length}개`,
      `상태: ${pollClosed ? '마감' : '진행 중'}`,
      '',
      '참여해주셔서 감사합니다. 남겨주신 선택과 의견은 다음 결정/실행에 반영하겠습니다.',
      `결과 확인: ${shareUrl}`,
    ].join('\n');
  }

  if (audience === 'retrospective') {
    return [
      `[pickflow 운영 회고]`,
      `질문: ${poll.question}`,
      `참여: ${poll.totalVotes}명`,
      `의견: ${poll.comments.length}개`,
      `의견률: ${feedbackRate}%`,
      `정서: ${sentimentLabel}`,
      `결정 신뢰도: ${confidenceScore}%`,
      '',
      '[개선 포인트]',
      poll.totalVotes < 8
        ? '- 표본이 작습니다. 다음에는 공유 채널과 리마인더를 늘리세요.'
        : '- 표본은 기본 기준을 충족했습니다.',
      feedbackRate < 25
        ? '- 의견률이 낮습니다. 선택 이유 입력을 더 강하게 유도하세요.'
        : '- 의견 근거가 충분히 쌓였습니다.',
      voteGapShare < 12
        ? '- 표 차이가 작습니다. 결선이나 짧은 토론을 고려하세요.'
        : '- 선두 흐름이 비교적 명확합니다.',
      '',
      `결과 링크: ${shareUrl}`,
    ].join('\n');
  }

  return [
    `[pickflow 의사결정 리포트]`,
    `질문: ${poll.question}`,
    `권고안: ${leaderLine}`,
    `참여: ${poll.totalVotes}명 · 의견 ${poll.comments.length}개`,
    `격차: ${voteGap}표 (${voteGapShare}%)`,
    `정서: ${sentimentLabel}`,
    `결정 신뢰도: ${confidenceScore}%`,
    `상태: ${pollClosed ? '마감' : '진행 중'}`,
    '',
    '[대표 의견]',
    topComments || '아직 대표 의견이 없습니다.',
    '',
    `근거 링크: ${shareUrl}`,
  ].join('\n');
};

export function StakeholderReportBuilder({
  poll,
  shareUrl,
  pollClosed,
}: StakeholderReportBuilderProps) {
  const [audience, setAudience] = useState<ReportAudience>('decision');
  const [copied, setCopied] = useState(false);

  const report = useMemo(() => {
    const sortedOptions = [...poll.options].sort((a, b) => b.voteCount - a.voteCount);
    const leader = sortedOptions[0] || null;
    const runnerUp = sortedOptions[1] || null;
    const leaderShare =
      poll.totalVotes > 0 && leader ? Math.round((leader.voteCount / poll.totalVotes) * 100) : 0;
    const voteGap = leader ? leader.voteCount - (runnerUp?.voteCount || 0) : 0;
    const voteGapShare = poll.totalVotes > 0 ? Math.round((voteGap / poll.totalVotes) * 100) : 0;
    const feedbackRate =
      poll.totalVotes > 0 ? Math.round((poll.comments.length / poll.totalVotes) * 100) : 0;
    const sampleScore = Math.min(40, Math.round((poll.totalVotes / 12) * 40));
    const marginScore = Math.min(30, Math.round((voteGapShare / 30) * 30));
    const feedbackScore = Math.min(20, Math.round((feedbackRate / 35) * 20));
    const closureScore = pollClosed ? 10 : 4;
    const confidenceScore = Math.min(100, sampleScore + marginScore + feedbackScore + closureScore);
    const sentiment = getSentimentLabel(poll.comments || []);
    const leaderLine = leader
      ? `${leader.text} (${leader.voteCount}표, ${leaderShare}%)`
      : '아직 선두 선택지 없음';
    const activeAudience =
      REPORT_AUDIENCES.find((item) => item.id === audience) || REPORT_AUDIENCES[0];
    const reportText = buildReportText({
      audience,
      confidenceScore,
      feedbackRate,
      leaderLine,
      poll,
      pollClosed,
      sentimentLabel: sentiment.label,
      shareUrl,
      voteGap,
      voteGapShare,
    });

    return {
      activeAudience,
      confidenceScore,
      feedbackRate,
      leaderLine,
      reportText,
      sentiment,
      voteGap,
      voteGapShare,
    };
  }, [audience, poll, pollClosed, shareUrl]);

  const handleCopyReport = async () => {
    try {
      await copyText(report.reportText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch (err) {
      console.error('stakeholder report copy failed', err);
    }
  };

  return (
    <section
      className="content-card"
      style={{
        display: 'grid',
        gap: '1rem',
        border: '1px solid rgba(99, 102, 241, 0.22)',
        background:
          'linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(45, 212, 191, 0.045) 50%, rgba(255,255,255,0.025))',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '0.85rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'grid', gap: '0.35rem' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--brand-primary)',
              fontSize: '0.68rem',
              fontWeight: 900,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            <FileText size={13} />
            Stakeholder report builder
          </span>
          <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1rem' }}>
            보고 대상별 결과 리포트
          </h3>
          <p
            style={{
              margin: 0,
              color: 'var(--text-secondary)',
              fontSize: '0.76rem',
              lineHeight: 1.55,
              maxWidth: '62ch',
            }}
          >
            같은 결과라도 의사결정권자, 참여자, 운영 회고에 필요한 정보가 다릅니다. 대상에 맞춰
            리포트 문구를 즉시 재구성합니다.
          </p>
        </div>
        <button
          type="button"
          onClick={handleCopyReport}
          className="btn-secondary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 12px',
            fontSize: '0.72rem',
            whiteSpace: 'nowrap',
          }}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? '리포트 복사됨' : '리포트 복사'}
        </button>
      </div>

      <div
        role="tablist"
        aria-label="리포트 대상 선택"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))',
          gap: '0.55rem',
        }}
      >
        {REPORT_AUDIENCES.map((item) => {
          const active = audience === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setAudience(item.id)}
              style={{
                border: active
                  ? '1px solid rgba(99, 102, 241, 0.52)'
                  : '1px solid var(--bg-card-border)',
                borderRadius: 'var(--radius-sm)',
                background: active ? 'rgba(99, 102, 241, 0.12)' : 'rgba(255,255,255,0.028)',
                color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                padding: '0.72rem',
                textAlign: 'left',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
              }}
            >
              <strong style={{ display: 'block', fontSize: '0.76rem', marginBottom: '0.25rem' }}>
                {item.label}
              </strong>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.66rem', lineHeight: 1.4 }}>
                {item.description}
              </span>
            </button>
          );
        })}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))',
          gap: '0.65rem',
        }}
      >
        <div className="insight-tile">
          <span>
            <Radio size={13} />
            리포트 대상
          </span>
          <strong>{report.activeAudience.label}</strong>
          <small>{report.activeAudience.description}</small>
        </div>
        <div className="insight-tile">
          <span>
            <ShieldCheck size={13} />
            신뢰도
          </span>
          <strong>{report.confidenceScore}%</strong>
          <small>표본, 격차, 의견률, 마감 상태 기준입니다.</small>
        </div>
        <div className="insight-tile">
          <span>
            <MessageSquare size={13} />
            정서
          </span>
          <strong>{report.sentiment.label}</strong>
          <small>{report.sentiment.help}</small>
        </div>
        <div className="insight-tile">
          <span>
            <Users size={13} />
            의견률
          </span>
          <strong>{report.feedbackRate}%</strong>
          <small>
            {poll.totalVotes}명 중 {poll.comments.length}명이 의견을 남겼습니다.
          </small>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(min(100%, 230px), 0.42fr)',
          gap: '0.85rem',
        }}
      >
        <div
          style={{
            border: '1px solid var(--bg-card-border)',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(3, 14, 12, 0.36)',
            padding: '0.9rem',
            display: 'grid',
            gap: '0.45rem',
          }}
        >
          <strong
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--text-primary)',
              fontSize: '0.8rem',
            }}
          >
            <ClipboardList size={14} />
            리포트 미리보기
          </strong>
          <p
            style={{
              margin: 0,
              color: 'var(--text-secondary)',
              fontSize: '0.72rem',
              lineHeight: 1.55,
              whiteSpace: 'pre-line',
            }}
          >
            {report.reportText}
          </p>
        </div>

        <aside
          style={{
            display: 'grid',
            gap: '0.65rem',
            alignContent: 'start',
            border: '1px solid var(--bg-card-border)',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(255,255,255,0.032)',
            padding: '0.85rem',
          }}
        >
          <strong
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--text-primary)',
              fontSize: '0.78rem',
            }}
          >
            <BarChart3 size={14} />
            보고 핵심
          </strong>
          <p
            style={{
              margin: 0,
              color: 'var(--text-secondary)',
              fontSize: '0.7rem',
              lineHeight: 1.5,
            }}
          >
            선두는 {report.leaderLine}입니다. 1위와 2위 격차는 {report.voteGap}표, 전체 대비{' '}
            {report.voteGapShare}%입니다.
          </p>
          <p
            style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.68rem', lineHeight: 1.45 }}
          >
            리포트 복사 후 Slack, 카카오톡, 회의록, Notion에 바로 붙여넣을 수 있습니다.
          </p>
        </aside>
      </div>
    </section>
  );
}
