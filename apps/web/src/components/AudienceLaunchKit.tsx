import { useMemo, useState } from 'react';
import { Check, Copy, MessageSquare, QrCode, Send, Users } from 'lucide-react';
import { Poll } from '@picky/shared';
import { copyText } from '../lib/pollShare';
import { buildQrSvgDataUri } from '../lib/qrCode';

type LaunchKitVariant = {
  id: string;
  label: string;
  description: string;
  body: string;
};

type AudienceLaunchKitProps = {
  poll: Poll;
  shareUrl: string;
  endAtLabel: string;
  resultsVisibilityLabel: string;
  canViewResults: boolean;
};

const getJoinCode = (poll: Poll): string => {
  const explicitCode = String((poll as Poll & { joinCode?: string }).joinCode || '').trim();
  if (explicitCode) {
    return explicitCode.toUpperCase();
  }

  return (poll.id.replace(/[^a-zA-Z0-9]/g, '').slice(-6) || poll.id).toUpperCase();
};

const formatVoteCount = (count: number): string => {
  return count > 0 ? `${count}명 참여 중` : '첫 참여를 기다리는 중';
};

const buildLaunchVariants = ({
  poll,
  shareUrl,
  endAtLabel,
  resultsVisibilityLabel,
  canViewResults,
}: AudienceLaunchKitProps): LaunchKitVariant[] => {
  const joinCode = getJoinCode(poll);
  const description = poll.description ? `\n\n설명: ${poll.description}` : '';
  const statusLine = `마감: ${endAtLabel} · 결과: ${resultsVisibilityLabel}`;
  const resultLine = canViewResults
    ? `현재 ${formatVoteCount(poll.totalVotes)}입니다.`
    : '투표 후 결과를 확인할 수 있습니다.';

  return [
    {
      id: 'kakao',
      label: '카카오톡 단체방',
      description: '친구/팀 채팅방에 짧게 던질 초대문',
      body: `[pickflow 투표]\n${poll.question}${description}\n\n${statusLine}\n${resultLine}\n\n참여 링크: ${shareUrl}\n참여 코드: ${joinCode}`,
    },
    {
      id: 'meeting',
      label: '회의 채팅',
      description: 'Zoom, Slack, Teams, 디스코드에 붙여넣기',
      body: `회의 중 빠르게 의견을 모으겠습니다.\n\n질문: ${poll.question}\n참여 방법: 아래 링크로 접속하거나 화면의 QR/코드를 입력해 주세요.\n참여 링크: ${shareUrl}\n참여 코드: ${joinCode}\n\n${statusLine}\n${resultLine}`,
    },
    {
      id: 'presenter',
      label: '진행자 멘트',
      description: '현장 발표자가 그대로 읽을 수 있는 20초 스크립트',
      body: `지금부터 짧은 투표를 진행하겠습니다.\n질문은 "${poll.question}"입니다.\n휴대폰으로 화면의 QR을 찍거나 참여 코드 ${joinCode}를 입력해 주세요.\n선택 후 가능하면 한 줄 이유도 남겨주세요.\n결과는 ${resultsVisibilityLabel} 방식으로 확인합니다.`,
    },
    {
      id: 'reminder',
      label: '리마인더',
      description: '참여율이 낮을 때 한 번 더 보내는 문구',
      body: `아직 투표 전이라면 20초만 참여 부탁드립니다.\n\n${poll.question}\n${shareUrl}\n\n현재 ${formatVoteCount(poll.totalVotes)}입니다. 의견 한 줄까지 남겨주시면 결정에 더 도움이 됩니다.`,
    },
  ];
};

export function AudienceLaunchKit({
  poll,
  shareUrl,
  endAtLabel,
  resultsVisibilityLabel,
  canViewResults,
}: AudienceLaunchKitProps) {
  const [copiedVariantId, setCopiedVariantId] = useState<string | null>(null);
  const joinCode = getJoinCode(poll);
  const qrCodeUrl = useMemo(() => buildQrSvgDataUri(shareUrl) ?? '', [shareUrl]);
  const launchVariants = useMemo(
    () =>
      buildLaunchVariants({
        poll,
        shareUrl,
        endAtLabel,
        resultsVisibilityLabel,
        canViewResults,
      }),
    [poll, shareUrl, endAtLabel, resultsVisibilityLabel, canViewResults],
  );

  const handleCopyVariant = async (variant: LaunchKitVariant) => {
    try {
      await copyText(variant.body);
      setCopiedVariantId(variant.id);
      window.setTimeout(() => setCopiedVariantId(null), 2200);
    } catch (err) {
      console.error('launch kit copy failed', err);
    }
  };

  const handleCopyAll = async () => {
    const body = launchVariants
      .map((variant) => `## ${variant.label}\n${variant.body}`)
      .join('\n\n---\n\n');

    try {
      await copyText(body);
      setCopiedVariantId('all');
      window.setTimeout(() => setCopiedVariantId(null), 2200);
    } catch (err) {
      console.error('launch kit copy all failed', err);
    }
  };

  return (
    <section
      className="content-card"
      style={{
        display: 'grid',
        gap: '1rem',
        border: '1px solid rgba(32, 214, 178, 0.22)',
        background:
          'linear-gradient(135deg, rgba(32, 214, 178, 0.08), rgba(250, 204, 21, 0.045) 52%, rgba(255,255,255,0.025))',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '0.85rem',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'grid', gap: '0.35rem' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--brand-accent-teal)',
              fontSize: '0.68rem',
              fontWeight: 900,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            <Send size={13} />
            Audience launch kit
          </span>
          <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1rem' }}>
            참여율을 올리는 배포 문구
          </h3>
          <p
            style={{
              margin: 0,
              color: 'var(--text-secondary)',
              fontSize: '0.76rem',
              lineHeight: 1.55,
              maxWidth: '58ch',
            }}
          >
            카카오톡, 회의 채팅, 현장 진행 멘트까지 링크·코드·QR을 같은 메시지로 묶어 바로 공유할 수
            있습니다.
          </p>
        </div>
        <button
          type="button"
          onClick={handleCopyAll}
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
          {copiedVariantId === 'all' ? <Check size={14} /> : <Copy size={14} />}
          {copiedVariantId === 'all' ? '전체 복사됨' : '전체 문구 복사'}
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 230px), 1fr))',
          gap: '0.85rem',
        }}
      >
        <aside
          style={{
            display: 'grid',
            gap: '0.75rem',
            alignContent: 'start',
            border: '1px solid var(--bg-card-border)',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(3, 14, 12, 0.42)',
            padding: '0.85rem',
          }}
        >
          <div
            style={{
              display: 'grid',
              gap: '0.45rem',
              justifyItems: 'center',
              textAlign: 'center',
            }}
          >
            <img
              src={qrCodeUrl}
              alt="투표 참여 QR 코드"
              width={112}
              height={112}
              style={{
                width: '112px',
                height: '112px',
                borderRadius: '10px',
                background: '#fff',
                padding: '8px',
              }}
            />
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                color: 'var(--text-muted)',
                fontSize: '0.68rem',
                fontWeight: 800,
              }}
            >
              <QrCode size={13} />
              QR로 바로 참여
            </span>
          </div>
          <div
            style={{
              display: 'grid',
              gap: '0.35rem',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              paddingTop: '0.75rem',
            }}
          >
            <span style={{ color: 'var(--text-muted)', fontSize: '0.66rem', fontWeight: 800 }}>
              참여 코드
            </span>
            <strong
              style={{
                color: 'var(--brand-accent-gold)',
                fontSize: '1.15rem',
                letterSpacing: '0.08em',
              }}
            >
              {joinCode}
            </strong>
            <small style={{ color: 'var(--text-muted)', lineHeight: 1.45 }}>
              링크, QR, 참여 코드를 함께 노출하면 모바일과 발표 화면 모두에서 이탈이 줄어듭니다.
            </small>
          </div>
        </aside>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '0.65rem',
          }}
        >
          {launchVariants.map((variant) => {
            const copied = copiedVariantId === variant.id;

            return (
              <article
                key={variant.id}
                style={{
                  display: 'grid',
                  gap: '0.7rem',
                  alignContent: 'space-between',
                  border: '1px solid var(--bg-card-border)',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(255,255,255,0.035)',
                  padding: '0.8rem',
                  minHeight: '170px',
                }}
              >
                <div style={{ display: 'grid', gap: '0.45rem' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      color: 'var(--text-primary)',
                      fontSize: '0.78rem',
                      fontWeight: 900,
                    }}
                  >
                    {variant.id === 'presenter' ? <Users size={14} /> : <MessageSquare size={14} />}
                    {variant.label}
                  </span>
                  <p
                    style={{
                      margin: 0,
                      color: 'var(--text-muted)',
                      fontSize: '0.68rem',
                      lineHeight: 1.45,
                    }}
                  >
                    {variant.description}
                  </p>
                  <p
                    style={{
                      margin: 0,
                      color: 'var(--text-secondary)',
                      fontSize: '0.7rem',
                      lineHeight: 1.5,
                      whiteSpace: 'pre-line',
                      display: '-webkit-box',
                      WebkitLineClamp: 4,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {variant.body}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyVariant(variant)}
                  className="ghost-btn"
                  style={{
                    justifySelf: 'start',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '6px 10px',
                    fontSize: '0.68rem',
                  }}
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? '복사됨' : '복사'}
                </button>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
