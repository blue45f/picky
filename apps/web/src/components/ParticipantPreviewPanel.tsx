import { useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  FileText,
  ImageIcon,
  MessageSquare,
  Smartphone,
  TimerReset,
} from 'lucide-react';

type PreviewOption = {
  text: string;
  imageUrl?: string;
};

type PreviewAttachment = {
  name: string;
  type?: string;
  size: number;
};

type ParticipantPreviewPanelProps = Readonly<{
  question: string;
  description: string;
  options: PreviewOption[];
  attachments: PreviewAttachment[];
  endsAtLocal: string;
  resultsVisibility: 'afterVote' | 'always';
}>;

const formatDeadline = (value: string): string => {
  if (!value) {
    return '상시 진행';
  }

  try {
    return new Intl.DateTimeFormat('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return value;
  }
};

const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

export function ParticipantPreviewPanel({
  question,
  description,
  options,
  attachments,
  endsAtLocal,
  resultsVisibility,
}: ParticipantPreviewPanelProps) {
  const preview = useMemo(() => {
    const normalizedQuestion = question.trim();
    const normalizedDescription = description.trim();
    const filledOptions = options
      .map((option, index) => ({
        ...option,
        index,
        text: option.text.trim(),
      }))
      .filter((option) => option.text.length > 0);
    const uniqueOptions = new Set(filledOptions.map((option) => option.text.toLowerCase()));
    const hasDuplicateOptions = uniqueOptions.size !== filledOptions.length;
    const hasImages = filledOptions.some((option) => Boolean(option.imageUrl));
    const estimatedSeconds = clamp(
      18 +
        filledOptions.length * 5 +
        Math.ceil(normalizedDescription.length / 80) * 6 +
        attachments.length * 8,
      20,
      110,
    );
    let effortLabel: string;
    if (estimatedSeconds <= 40) {
      effortLabel = '낮음';
    } else if (estimatedSeconds <= 70) {
      effortLabel = '보통';
    } else {
      effortLabel = '높음';
    }

    let questionHelp: string;
    if (normalizedQuestion.length < 8) {
      questionHelp = '참가자가 맥락을 이해하기엔 질문이 짧습니다.';
    } else if (normalizedQuestion.length > 90) {
      questionHelp = '모바일에서 질문이 길게 느껴질 수 있습니다.';
    } else {
      questionHelp = '모바일 첫 화면에서 바로 이해할 수 있습니다.';
    }

    let optionScanHelp: string;
    if (hasDuplicateOptions) {
      optionScanHelp = '중복 선택지가 있어 참가자가 헷갈릴 수 있습니다.';
    } else if (filledOptions.length > 6) {
      optionScanHelp = '선택지가 많아 단톡방 즉시 응답에는 부담이 있습니다.';
    } else {
      optionScanHelp = '선택지를 빠르게 비교할 수 있습니다.';
    }

    const readinessItems = [
      {
        label: '질문 명확성',
        passed: normalizedQuestion.length >= 8 && normalizedQuestion.length <= 90,
        help: questionHelp,
      },
      {
        label: '선택지 스캔',
        passed: filledOptions.length >= 2 && filledOptions.length <= 6 && !hasDuplicateOptions,
        help: optionScanHelp,
      },
      {
        label: '결정 맥락',
        passed: normalizedDescription.length >= 20 || attachments.length > 0,
        help:
          normalizedDescription.length >= 20 || attachments.length > 0
            ? '배경 설명이나 참고 파일이 있어 판단 근거가 있습니다.'
            : '왜 투표하는지 한 줄 배경을 추가하면 응답 품질이 좋아집니다.',
      },
    ];
    const readinessScore = Math.round(
      (readinessItems.filter((item) => item.passed).length / readinessItems.length) * 100,
    );

    return {
      estimatedSeconds,
      effortLabel,
      filledOptions,
      hasImages,
      readinessItems,
      readinessScore,
    };
  }, [attachments.length, description, options, question]);

  const previewOptions =
    preview.filledOptions.length > 0
      ? preview.filledOptions
      : [
          { index: 0, text: '첫 번째 선택지', imageUrl: '' },
          { index: 1, text: '두 번째 선택지', imageUrl: '' },
        ];

  let readinessColor: string;
  if (preview.readinessScore >= 80) {
    readinessColor = 'var(--brand-accent-teal)';
  } else if (preview.readinessScore >= 60) {
    readinessColor = 'var(--brand-accent-gold)';
  } else {
    readinessColor = 'var(--brand-accent-coral)';
  }

  return (
    <section
      className="content-card"
      style={{
        padding: '1rem',
        display: 'grid',
        gap: '1rem',
        border: '1px solid rgba(45, 212, 191, 0.2)',
        background:
          'linear-gradient(135deg, rgba(45, 212, 191, 0.075), rgba(99, 102, 241, 0.045) 52%, rgba(255,255,255,0.025))',
        cursor: 'default',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '0.9rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'grid', gap: '0.28rem' }}>
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
            <Smartphone size={13} />
            Participant preview
          </span>
          <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '0.98rem' }}>
            참가자 화면 미리보기
          </h2>
          <p
            style={{
              margin: 0,
              color: 'var(--text-secondary)',
              fontSize: '0.74rem',
              lineHeight: 1.55,
              maxWidth: '62ch',
            }}
          >
            모바일에서 질문, 선택지, 첨부, 결과 공개 방식이 어떻게 보이는지 확인합니다. 공유 전에
            응답 부담을 낮추는 마지막 점검 단계입니다.
          </p>
        </div>
        <div
          style={{
            minWidth: '112px',
            border: '1px solid var(--bg-card-border)',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(3, 14, 12, 0.35)',
            padding: '0.58rem 0.72rem',
            textAlign: 'right',
          }}
        >
          <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.64rem' }}>
            참가 준비도
          </span>
          <strong
            style={{
              color: readinessColor,
              fontSize: '1.12rem',
            }}
          >
            {preview.readinessScore}%
          </strong>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
          gap: '0.85rem',
          alignItems: 'start',
        }}
      >
        <div
          style={{
            width: 'min(100%, 320px)',
            justifySelf: 'center',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '26px',
            padding: '0.65rem',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))',
            boxShadow: '0 18px 50px rgba(0,0,0,0.22)',
          }}
        >
          <div
            className="preview-phone-dark"
            style={{
              borderRadius: '20px',
              overflow: 'hidden',
              background: '#061411',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.72rem 0.82rem',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                color: 'var(--text-muted)',
                fontSize: '0.62rem',
                fontWeight: 900,
              }}
            >
              <span>picky</span>
              <span>{resultsVisibility === 'always' ? 'LIVE RESULTS' : 'VOTE FIRST'}</span>
            </div>
            <div style={{ display: 'grid', gap: '0.78rem', padding: '0.95rem' }}>
              <div style={{ display: 'grid', gap: '0.32rem' }}>
                <span
                  style={{
                    color: 'var(--brand-accent-teal)',
                    fontSize: '0.62rem',
                    fontWeight: 900,
                  }}
                >
                  {formatDeadline(endsAtLocal)}
                </span>
                <h3
                  style={{
                    margin: 0,
                    color: 'var(--text-primary)',
                    fontSize: '0.98rem',
                    lineHeight: 1.35,
                    overflowWrap: 'anywhere',
                  }}
                >
                  {question.trim() || '참가자가 보게 될 질문이 여기에 표시됩니다.'}
                </h3>
                {description.trim() ? (
                  <p
                    style={{
                      margin: 0,
                      color: 'var(--text-secondary)',
                      fontSize: '0.7rem',
                      lineHeight: 1.45,
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {description.trim()}
                  </p>
                ) : null}
              </div>

              {attachments.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                  {attachments.slice(0, 3).map((attachment, index) => (
                    <span
                      key={`${attachment.name}-${index}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        border: '1px solid rgba(250, 204, 21, 0.2)',
                        borderRadius: '999px',
                        color: 'var(--brand-accent-gold)',
                        background: 'rgba(250, 204, 21, 0.055)',
                        padding: '4px 7px',
                        fontSize: '0.58rem',
                        fontWeight: 800,
                        maxWidth: '100%',
                      }}
                    >
                      <FileText size={10} />
                      <span
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {attachment.name}
                      </span>
                    </span>
                  ))}
                </div>
              ) : null}

              <div style={{ display: 'grid', gap: '0.45rem' }}>
                {previewOptions.slice(0, 6).map((option) => (
                  <div
                    key={`${option.index}-${option.text}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.55rem',
                      border: '1px solid rgba(255,255,255,0.09)',
                      borderRadius: '12px',
                      background: 'rgba(255,255,255,0.04)',
                      padding: '0.56rem',
                    }}
                  >
                    {option.imageUrl ? (
                      <img
                        src={option.imageUrl}
                        alt=""
                        style={{
                          width: '34px',
                          height: '34px',
                          objectFit: 'cover',
                          borderRadius: '9px',
                          flexShrink: 0,
                        }}
                      />
                    ) : (
                      <span
                        style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '9px',
                          background: 'rgba(45, 212, 191, 0.08)',
                          color: 'var(--brand-accent-teal)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {preview.hasImages ? <ImageIcon size={15} /> : option.index + 1}
                      </span>
                    )}
                    <span
                      style={{
                        color: 'var(--text-secondary)',
                        fontSize: '0.72rem',
                        lineHeight: 1.35,
                        overflowWrap: 'anywhere',
                      }}
                    >
                      {option.text}
                    </span>
                  </div>
                ))}
              </div>

              <div
                style={{
                  display: 'grid',
                  gap: '0.28rem',
                  border: '1px dashed rgba(148, 163, 184, 0.22)',
                  borderRadius: '12px',
                  padding: '0.65rem',
                  color: 'var(--text-muted)',
                  fontSize: '0.66rem',
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <MessageSquare size={12} />
                  선택 이유 한 줄 남기기
                </span>
                <span>결정에 도움이 되는 근거를 짧게 적어주세요.</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gap: '0.65rem' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(128px, 1fr))',
              gap: '0.55rem',
            }}
          >
            <div className="insight-tile">
              <span>
                <TimerReset size={13} />
                예상 응답 시간
              </span>
              <strong>{preview.estimatedSeconds}초</strong>
              <small>응답 부담 {preview.effortLabel}</small>
            </div>
            <div className="insight-tile">
              <span>
                <Eye size={13} />
                결과 공개
              </span>
              <strong>{resultsVisibility === 'always' ? '즉시 공개' : '투표 후 공개'}</strong>
              <small>
                {resultsVisibility === 'always'
                  ? '참가 전에도 흐름을 볼 수 있습니다.'
                  : '선택 후 결과를 확인합니다.'}
              </small>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '0.55rem' }}>
            {preview.readinessItems.map((item) => (
              <article
                key={item.label}
                style={{
                  display: 'grid',
                  gap: '0.28rem',
                  border: '1px solid var(--bg-card-border)',
                  borderRadius: 'var(--radius-sm)',
                  background: item.passed
                    ? 'rgba(45, 212, 191, 0.055)'
                    : 'rgba(250, 204, 21, 0.05)',
                  padding: '0.68rem',
                }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    color: item.passed ? 'var(--brand-accent-teal)' : 'var(--brand-accent-gold)',
                    fontSize: '0.72rem',
                    fontWeight: 900,
                  }}
                >
                  {item.passed ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                  {item.label}
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.67rem', lineHeight: 1.42 }}>
                  {item.help}
                </span>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
