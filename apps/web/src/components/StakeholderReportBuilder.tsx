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
import type { Poll, ReportAudience } from '@picky/shared';
import { REPORT_AUDIENCES, buildPollReport } from '@picky/shared';
import { copyText } from '../lib/pollShare';

// 청중별 리포트 텍스트·정서·신뢰도 산출은 @picky/shared(pollReport)로 단일화했어요.
// 이 컴포넌트는 그 결과를 받아 웹 UI로만 렌더해요(동작 불변).

type StakeholderReportBuilderProps = Readonly<{
  poll: Poll;
  shareUrl: string;
  pollClosed: boolean;
}>;

export function StakeholderReportBuilder({
  poll,
  shareUrl,
  pollClosed,
}: StakeholderReportBuilderProps) {
  const [audience, setAudience] = useState<ReportAudience>('decision');
  const [copied, setCopied] = useState(false);

  const report = useMemo(
    () => buildPollReport({ poll, shareUrl, pollClosed, audience }),
    [audience, poll, pollClosed, shareUrl],
  );

  const handleCopyReport = async () => {
    try {
      await copyText(report.reportText);
      setCopied(true);
      globalThis.setTimeout(() => setCopied(false), 2200);
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
