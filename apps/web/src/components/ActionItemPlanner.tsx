import { useMemo, useState } from 'react';
import {
  CalendarPlus,
  Check,
  ClipboardCheck,
  Copy,
  Download,
  ListChecks,
  MessageSquare,
  Target,
  UserRound,
} from 'lucide-react';
import type { Poll } from '@picky/shared';
import { copyText } from '../lib/pollShare';

type ActionItemPlannerProps = {
  poll: Poll;
  shareUrl: string;
};

type ActionStep = {
  id: string;
  title: string;
  description: string;
};

const getLocalDateValue = (offsetDays: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
};

const escapeIcsText = (value: string): string => {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
    .replace(/\n/g, '\\n');
};

const formatIcsDate = (dateValue: string): string => {
  return dateValue.replace(/-/g, '');
};

const downloadTextFile = (filename: string, content: string, type: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

export function ActionItemPlanner({ poll, shareUrl }: ActionItemPlannerProps) {
  const [owner, setOwner] = useState('');
  const [dueDate, setDueDate] = useState(getLocalDateValue(7));
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const plan = useMemo(() => {
    const sortedOptions = [...poll.options].sort((a, b) => b.voteCount - a.voteCount);
    const leader = sortedOptions[0] || null;
    const runnerUp = sortedOptions[1] || null;
    const leaderShare =
      poll.totalVotes > 0 && leader ? Math.round((leader.voteCount / poll.totalVotes) * 100) : 0;
    const voteGap = leader ? leader.voteCount - (runnerUp?.voteCount || 0) : 0;
    const representativeComments = (poll.comments || [])
      .filter((commentItem) => !leader || commentItem.selectedOptionId === leader.id)
      .slice(0, 3);
    const assignee = owner.trim() || '담당자 지정 필요';
    const dueDateLabel = dueDate || '기한 미정';
    const selectedDecision = leader
      ? `${leader.text} (${leader.voteCount}표, ${leaderShare}%)`
      : '아직 확정 선택지 없음';
    const hasOwner = Boolean(owner.trim());
    const hasDueDate = Boolean(dueDate);
    const hasEvidence = representativeComments.length > 0;

    const handoffItems = [
      {
        label: '담당자',
        ready: hasOwner,
        value: assignee,
        help: hasOwner
          ? '공지문과 일정에 담당자가 명시됩니다.'
          : '실행 책임자가 비어 있으면 결정이 후속 행동으로 이어지기 어렵습니다.',
      },
      {
        label: '기한',
        ready: hasDueDate,
        value: dueDateLabel,
        help: hasDueDate
          ? '후속 점검 일정과 액션 플랜에 같은 날짜가 반영됩니다.'
          : '점검일을 정하면 회의 후 실행 여부를 다시 확인할 수 있습니다.',
      },
      {
        label: '결정안',
        ready: Boolean(leader),
        value: selectedDecision,
        help: leader
          ? '선두 선택지를 기준으로 공지와 실행 단계가 생성됩니다.'
          : '투표가 모이면 결정안이 자동으로 채워집니다.',
      },
      {
        label: '근거',
        ready: hasEvidence,
        value: hasEvidence ? `대표 의견 ${representativeComments.length}개` : '대표 의견 없음',
        help: hasEvidence
          ? '대표 의견을 회의록과 업무 카드에 붙일 수 있습니다.'
          : '선택 이유가 없으면 실행 근거를 별도로 보강하는 편이 좋습니다.',
      },
    ];

    const steps: ActionStep[] = [
      {
        id: 'announce',
        title: '결정 공지',
        description: `${selectedDecision} 기준으로 참여자에게 결과와 근거를 공유합니다.`,
      },
      {
        id: 'owner',
        title: '담당자 지정',
        description: `${assignee}가 실행 범위, 필요한 리소스, 첫 작업을 확인합니다.`,
      },
      {
        id: 'evidence',
        title: '근거 보관',
        description: `결과 링크와 대표 의견 ${representativeComments.length}개를 회의록에 남깁니다.`,
      },
      {
        id: 'review',
        title: '후속 점검',
        description: `${dueDate || '기한 미정'}까지 진행 여부와 남은 이슈를 점검합니다.`,
      },
    ];

    const commentLines =
      representativeComments.length > 0
        ? representativeComments
            .map(
              (commentItem, index) =>
                `${index + 1}. ${commentItem.comment} - ${commentItem.voterName || '익명'}`,
            )
            .join('\n')
        : '대표 의견이 아직 없습니다.';

    const markdown = [
      `[pickflow 액션 플랜]`,
      `질문: ${poll.question}`,
      `결정안: ${selectedDecision}`,
      `담당자: ${assignee}`,
      `기한: ${dueDate || '기한 미정'}`,
      `참여: ${poll.totalVotes}명 · 의견 ${poll.comments.length}개 · 격차 ${voteGap}표`,
      `결과 링크: ${shareUrl}`,
      '',
      '[업무 인수인계 체크]',
      ...handoffItems.map(
        (item) => `- ${item.label}: ${item.value} (${item.ready ? '준비됨' : '보완 필요'})`,
      ),
      '',
      '[실행 단계]',
      ...steps.map((step, index) => `${index + 1}. ${step.title}: ${step.description}`),
      '',
      '[대표 의견]',
      commentLines,
    ].join('\n');

    const announcement = [
      `[결정 공지] ${poll.question}`,
      '',
      `결정안: ${selectedDecision}`,
      `담당자: ${assignee}`,
      `기한: ${dueDate || '기한 미정'}`,
      `근거: 총 ${poll.totalVotes}명이 참여했고, 1위와 2위 격차는 ${voteGap}표입니다.`,
      '',
      `결과와 의견: ${shareUrl}`,
      '위 기준으로 다음 실행을 진행하겠습니다.',
    ].join('\n');

    return {
      announcement,
      assignee,
      handoffItems,
      leader,
      leaderShare,
      markdown,
      representativeComments,
      selectedDecision,
      steps,
      voteGap,
    };
  }, [dueDate, owner, poll, shareUrl]);

  const handleCopyPlan = async () => {
    try {
      await copyText(plan.markdown);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch (err) {
      console.error('action plan copy failed', err);
    }
  };

  const handleDownloadCalendar = () => {
    const dateStamp = formatIcsDate(dueDate || getLocalDateValue(7));
    const nextDate = new Date(`${dueDate || getLocalDateValue(7)}T00:00:00`);
    nextDate.setDate(nextDate.getDate() + 1);
    const endDate = nextDate.toISOString().slice(0, 10).replace(/-/g, '');
    const uid = `pickflow-${poll.id}-${dateStamp}@pickflow.local`;
    const description = `${plan.markdown}\n\n${plan.announcement}`;
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//pickflow//Action Plan//KO',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${escapeIcsText(uid)}`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTSTART;VALUE=DATE:${dateStamp}`,
      `DTEND;VALUE=DATE:${endDate}`,
      `SUMMARY:${escapeIcsText(`[pickflow] ${poll.question} 후속 점검`)}`,
      `DESCRIPTION:${escapeIcsText(description)}`,
      `URL:${escapeIcsText(shareUrl)}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    downloadTextFile(`pickflow-${poll.id}-action-plan.ics`, ics, 'text/calendar;charset=utf-8');
    setDownloaded(true);
    window.setTimeout(() => setDownloaded(false), 2200);
  };

  return (
    <section
      className="content-card"
      style={{
        display: 'grid',
        gap: '1rem',
        border: '1px solid rgba(250, 204, 21, 0.2)',
        background:
          'linear-gradient(135deg, rgba(250, 204, 21, 0.08), rgba(45, 212, 191, 0.04) 52%, rgba(255,255,255,0.025))',
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
              color: 'var(--brand-accent-gold)',
              fontSize: '0.68rem',
              fontWeight: 900,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            <ListChecks size={13} />
            Action item planner
          </span>
          <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1rem' }}>
            결정 이후 실행까지 정리
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
            선두 선택지를 기준으로 담당자, 기한, 공지문, 후속 점검 일정을 만들어 회의가 끝난 뒤에도
            실행이 끊기지 않게 합니다.
          </p>
        </div>
        <div
          style={{
            display: 'inline-flex',
            gap: '0.45rem',
            flexWrap: 'wrap',
            justifyContent: 'flex-end',
          }}
        >
          <button
            type="button"
            onClick={handleCopyPlan}
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
            {copied ? '플랜 복사됨' : '액션 플랜 복사'}
          </button>
          <button
            type="button"
            onClick={handleDownloadCalendar}
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
            {downloaded ? <Check size={14} /> : <CalendarPlus size={14} />}
            {downloaded ? '일정 저장됨' : '점검 일정 받기'}
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 210px), 1fr))',
          gap: '0.65rem',
        }}
      >
        <label
          style={{
            display: 'grid',
            gap: '0.35rem',
            color: 'var(--text-secondary)',
            fontSize: '0.72rem',
            fontWeight: 800,
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <UserRound size={13} />
            담당자
          </span>
          <input
            type="text"
            value={owner}
            onChange={(event) => setOwner(event.target.value)}
            placeholder="예: 김희준, 제품팀, 운영 담당자"
            style={{
              minHeight: '38px',
              border: '1px solid var(--bg-card-border)',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(3, 14, 12, 0.38)',
              color: 'var(--text-primary)',
              padding: '0 0.75rem',
              fontFamily: 'var(--font-sans)',
              fontSize: '0.76rem',
            }}
          />
        </label>
        <label
          style={{
            display: 'grid',
            gap: '0.35rem',
            color: 'var(--text-secondary)',
            fontSize: '0.72rem',
            fontWeight: 800,
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <CalendarPlus size={13} />
            후속 점검일
          </span>
          <input
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            style={{
              minHeight: '38px',
              border: '1px solid var(--bg-card-border)',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(3, 14, 12, 0.38)',
              color: 'var(--text-primary)',
              padding: '0 0.75rem',
              fontFamily: 'var(--font-sans)',
              fontSize: '0.76rem',
            }}
          />
        </label>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
          gap: '0.65rem',
        }}
      >
        <div className="insight-tile">
          <span>
            <Target size={13} />
            결정안
          </span>
          <strong>{plan.leader ? `${plan.leaderShare}%` : '대기'}</strong>
          <small>{plan.selectedDecision}</small>
        </div>
        <div className="insight-tile">
          <span>
            <MessageSquare size={13} />
            근거 의견
          </span>
          <strong>{plan.representativeComments.length}개</strong>
          <small>선두 선택지에 연결된 대표 의견입니다.</small>
        </div>
        <div className="insight-tile">
          <span>
            <ClipboardCheck size={13} />
            실행 준비
          </span>
          <strong>{owner.trim() && dueDate ? '준비됨' : '보완 필요'}</strong>
          <small>
            {owner.trim() ? `${plan.assignee} 담당` : '담당자를 지정하면 공지가 명확해집니다.'}
          </small>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 170px), 1fr))',
          gap: '0.55rem',
        }}
        aria-label="업무 인수인계 체크"
      >
        {plan.handoffItems.map((item) => (
          <article
            key={item.label}
            style={{
              display: 'grid',
              gap: '0.3rem',
              border: item.ready
                ? '1px solid rgba(45, 212, 191, 0.18)'
                : '1px solid rgba(250, 204, 21, 0.24)',
              borderRadius: 'var(--radius-sm)',
              background: item.ready ? 'rgba(45, 212, 191, 0.035)' : 'rgba(250, 204, 21, 0.05)',
              padding: '0.72rem',
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                color: item.ready ? 'var(--brand-accent-teal)' : 'var(--brand-accent-gold)',
                fontSize: '0.66rem',
                fontWeight: 900,
              }}
            >
              {item.ready ? <Check size={13} /> : <ClipboardCheck size={13} />}
              {item.label}
            </span>
            <strong style={{ color: 'var(--text-primary)', fontSize: '0.78rem', lineHeight: 1.35 }}>
              {item.value}
            </strong>
            <small
              style={{ color: 'var(--text-secondary)', fontSize: '0.65rem', lineHeight: 1.42 }}
            >
              {item.help}
            </small>
          </article>
        ))}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 210px), 1fr))',
          gap: '0.65rem',
        }}
      >
        {plan.steps.map((step, index) => (
          <article
            key={step.id}
            style={{
              display: 'grid',
              gap: '0.45rem',
              border: '1px solid var(--bg-card-border)',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(3, 14, 12, 0.3)',
              padding: '0.75rem',
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                color: index === 0 ? 'var(--brand-accent-gold)' : 'var(--text-primary)',
                fontSize: '0.74rem',
                fontWeight: 900,
              }}
            >
              <Download size={13} />
              {index + 1}. {step.title}
            </span>
            <p
              style={{
                margin: 0,
                color: 'var(--text-secondary)',
                fontSize: '0.7rem',
                lineHeight: 1.45,
              }}
            >
              {step.description}
            </p>
          </article>
        ))}
      </div>

      <div
        style={{
          border: '1px solid var(--bg-card-border)',
          borderRadius: 'var(--radius-sm)',
          background: 'rgba(255,255,255,0.032)',
          padding: '0.85rem',
          display: 'grid',
          gap: '0.35rem',
        }}
      >
        <strong style={{ color: 'var(--text-primary)', fontSize: '0.8rem' }}>공지 미리보기</strong>
        <p
          style={{
            margin: 0,
            color: 'var(--text-secondary)',
            fontSize: '0.72rem',
            lineHeight: 1.55,
            whiteSpace: 'pre-line',
          }}
        >
          {plan.announcement}
        </p>
      </div>
    </section>
  );
}
