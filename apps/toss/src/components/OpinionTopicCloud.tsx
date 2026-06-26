/**
 * 의견 토픽 클라우드 — 웹 OpinionTopicCloud 의 토스 포팅.
 * 한글/영문 토크나이저·키워드 추출은 @picky/shared(extractKeywords)에서 소비해요(로직 중복 0).
 * 여기선 빈도 가중 칩 클라우드와 선택지별 키워드 칩만 토스 카드로 렌더해요.
 *
 * 결과 하단에 배치돼요. 의견이 한 줄도 없으면 호출부가 숨겨요(빈 상태 안내만 내부 폴백).
 */
import { useMemo, useState } from 'react';
import type { Poll } from '../shared';
import { buildOpinionTopics, buildOpinionTopicBriefing } from '../shared';
import { theme, FONT } from '../theme';

type OpinionTopicCloudProps = Readonly<{
  poll: Poll;
  /** 토픽 브리핑 텍스트 복사(상위가 토스트·햅틱). 미전달 시 복사 버튼 숨김. */
  onCopyText?: (text: string) => void;
}>;

const CLOUD_COLORS = [theme.accent, theme.gold, theme.text, theme.accentStrong];

export function OpinionTopicCloud({ poll, onCopyText }: OpinionTopicCloudProps) {
  const [copied, setCopied] = useState(false);

  const topic = useMemo(() => {
    // 토픽 콘텐츠/브리핑은 @picky/shared 로 단일화했어요(웹과 동일 로직·동일 출력, 18키워드).
    const topics = buildOpinionTopics(poll);
    return {
      commentCount: topics.commentCount,
      topKeywords: topics.topKeywords,
      maxCount: topics.maxCount,
      optionGroups: topics.optionGroups,
      summaryText: buildOpinionTopicBriefing(poll, topics),
    };
  }, [poll]);

  const handleCopy = () => {
    if (!onCopyText) {
      return;
    }
    onCopyText(topic.summaryText);
    setCopied(true);
    globalThis.setTimeout(() => setCopied(false), 2200);
  };

  return (
    <section
      className="rise"
      aria-label="의견 토픽 클라우드"
      style={{
        marginTop: 16,
        padding: 18,
        borderRadius: theme.radius,
        background: theme.surface,
        border: `1px solid ${theme.border}`,
        boxShadow: '0 8px 32px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 10,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <h2
            style={{
              margin: 0,
              fontSize: FONT.subtitle,
              fontWeight: 800,
              color: theme.text,
              display: 'flex',
              alignItems: 'center',
              gap: 7,
            }}
          >
            <span aria-hidden>🏷️</span>
            의견 토픽 클라우드
          </h2>
          <p
            style={{
              margin: '4px 0 0',
              fontSize: FONT.small,
              color: theme.textMuted,
              lineHeight: 1.5,
            }}
          >
            한마디에서 자주 나온 단어를 모아 토론 주제를 빠르게 파악해요.
          </p>
        </div>
        {onCopyText ? (
          <button
            type="button"
            className="pressable"
            onClick={handleCopy}
            style={{
              flexShrink: 0,
              minHeight: 40,
              padding: '8px 12px',
              borderRadius: theme.radiusSm,
              border: `1px solid ${theme.borderStrong}`,
              background: 'rgba(255,255,255,0.04)',
              color: theme.text,
              fontSize: FONT.small,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {copied ? '복사됨 ✓' : '토픽 복사 📋'}
          </button>
        ) : null}
      </div>

      {topic.topKeywords.length > 0 ? (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px 12px',
            borderRadius: theme.radiusSm,
            border: `1px solid ${theme.border}`,
            background:
              'radial-gradient(circle at 22% 18%, rgba(19,194,163,0.14), transparent 38%), rgba(255,255,255,0.02)',
          }}
        >
          {topic.topKeywords.map((keyword, index) => {
            const weight = keyword.count / topic.maxCount;
            const size = Math.round(FONT.small + weight * 12);
            return (
              <span
                key={keyword.word}
                style={{
                  display: 'inline-flex',
                  alignItems: 'baseline',
                  gap: 3,
                  color: CLOUD_COLORS[index % CLOUD_COLORS.length],
                  fontSize: size,
                  fontWeight: 900,
                  lineHeight: 1.1,
                  opacity: 0.74 + weight * 0.26,
                }}
              >
                {keyword.word}
                <small style={{ fontSize: '0.6em', fontWeight: 800, color: theme.textFaint }}>
                  {keyword.count}
                </small>
              </span>
            );
          })}
        </div>
      ) : (
        <div
          role="note"
          style={{
            padding: '20px 16px',
            borderRadius: theme.radiusSm,
            border: `1px dashed ${theme.borderStrong}`,
            color: theme.textMuted,
            fontSize: FONT.small,
            textAlign: 'center',
            lineHeight: 1.5,
          }}
        >
          아직 반복 키워드를 만들 만큼 의견이 없어요. 참여자에게 선택 이유 한 줄을 부탁해 보세요.
        </div>
      )}

      {/* 선택지별 대표 키워드 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {topic.optionGroups.map((group) => (
          <div
            key={group.optionId}
            style={{
              borderRadius: theme.radiusSm,
              border: `1px solid ${theme.border}`,
              background: 'rgba(255,255,255,0.03)',
              padding: '10px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <strong
                style={{
                  fontSize: FONT.small,
                  fontWeight: 800,
                  color: theme.text,
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {group.optionText}
              </strong>
              <span style={{ flexShrink: 0, fontSize: FONT.caption, color: theme.textFaint }}>
                {group.voteCount}표
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {group.keywords.length > 0 ? (
                group.keywords.map((keyword) => (
                  <span
                    key={`${group.optionId}-${keyword.word}`}
                    style={{
                      borderRadius: theme.radiusPill,
                      border: `1px solid rgba(19,194,163,0.22)`,
                      background: theme.accentSoft,
                      color: theme.text,
                      padding: '3px 10px',
                      fontSize: FONT.caption,
                      fontWeight: 700,
                    }}
                  >
                    {keyword.word} {keyword.count}
                  </span>
                ))
              ) : (
                <span style={{ fontSize: FONT.caption, color: theme.textFaint }}>
                  아직 이 선택지엔 의견 키워드가 없어요.
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
