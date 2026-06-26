/**
 * SNS 공유 프리뷰 카드(토스) — 공유 링크가 X(트위터)/카카오 피드에 어떻게 보일지 미리보기.
 * 카드 콘텐츠(제목/요약/노출 선택지/메타)는 @picky/shared(buildSnsPreviewContent) 단일 소스에서
 * 가져와요(웹 SnsPreviewCard와 동일 콘텐츠). 여기선 토스 다크 테마로 카드 UI만 렌더해요.
 *
 * 웹은 모달 안에서 같은 미리보기를 보여줘요 — 토스에서도 공유 시트에 동일하게 노출해 SNS 공유 경험을 맞춰요.
 */
import { useState } from 'react';
import type { Poll } from '../shared';
import { buildSnsPreviewContent } from '../shared';
import { theme, FONT } from '../theme';

type SnsPreviewCardProps = Readonly<{ poll: Poll }>;

type Platform = 'x' | 'kakao';

const brandGradient = 'linear-gradient(135deg, #10251f 0%, #1d6255 54%, #e8c84d 100%)';

export function SnsPreviewCard({ poll }: SnsPreviewCardProps) {
  const [platform, setPlatform] = useState<Platform>('kakao');
  const content = buildSnsPreviewContent({
    question: poll.question,
    description: poll.description,
    options: poll.options.map((option) => option.text),
    imageUrl: poll.options.find((option) => option.imageUrl)?.imageUrl,
  });
  const imageUrl = poll.options.find((option) => option.imageUrl)?.imageUrl;

  return (
    <section
      aria-label="SNS 공유 미리보기"
      style={{
        marginTop: 12,
        paddingTop: 14,
        borderTop: `1px solid ${theme.border}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}
      >
        <span
          style={{
            fontSize: FONT.body,
            fontWeight: 800,
            color: theme.text,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span aria-hidden>👀</span> SNS 노출 미리보기
        </span>
        <div
          role="tablist"
          aria-label="미리보기 플랫폼"
          style={{
            display: 'flex',
            gap: 4,
            background: 'rgba(255,255,255,0.05)',
            borderRadius: theme.radiusPill,
            padding: 3,
          }}
        >
          {(['kakao', 'x'] as const).map((value) => {
            const active = platform === value;
            return (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={active}
                className="pressable"
                onClick={() => setPlatform(value)}
                style={{
                  minHeight: 32,
                  padding: '4px 12px',
                  borderRadius: theme.radiusPill,
                  border: 'none',
                  background: active ? theme.accent : 'transparent',
                  color: active ? theme.accentInk : theme.textMuted,
                  fontSize: FONT.caption,
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                {value === 'kakao' ? '카카오' : 'X'}
              </button>
            );
          })}
        </div>
      </div>

      <div
        style={{
          border: `1px solid ${platform === 'kakao' ? 'rgba(0,0,0,0.12)' : '#38444d'}`,
          borderRadius: 12,
          overflow: 'hidden',
          background: platform === 'kakao' ? '#ffeb33' : '#15202b',
          padding: platform === 'kakao' ? 10 : 0,
        }}
      >
        <div
          style={{
            background: platform === 'kakao' ? '#fff' : 'transparent',
            borderRadius: platform === 'kakao' ? 8 : 0,
            overflow: 'hidden',
          }}
        >
          {/* OG 히어로 */}
          <div
            style={{
              position: 'relative',
              minHeight: 92,
              background: brandGradient,
              display: 'grid',
              alignContent: 'end',
              gap: 6,
              padding: 12,
            }}
          >
            {content.hasImagePreview && imageUrl ? (
              <>
                <img
                  src={imageUrl}
                  alt=""
                  aria-hidden
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
                <span
                  aria-hidden
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(180deg, rgba(6,20,17,0.08), rgba(6,20,17,0.72))',
                  }}
                />
              </>
            ) : null}
            <span
              style={{
                position: 'relative',
                width: 'fit-content',
                border: '1px solid rgba(255,255,255,0.24)',
                borderRadius: theme.radiusPill,
                background: 'rgba(0,0,0,0.2)',
                color: '#eafff9',
                padding: '3px 8px',
                fontSize: 10.5,
                fontWeight: 900,
              }}
            >
              {content.previewReady ? 'READY TO SHARE' : 'DRAFT PREVIEW'}
            </span>
            <strong
              style={{
                position: 'relative',
                color: '#fff',
                fontSize: 15,
                lineHeight: 1.25,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {content.title}
            </strong>
          </div>
          {/* 본문 */}
          <div style={{ padding: platform === 'kakao' ? '10px 12px 4px' : 12 }}>
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 800,
                color: platform === 'kakao' ? '#1d4ed8' : '#8899a6',
                letterSpacing: 0.2,
              }}
            >
              {platform === 'kakao' ? '고민 투표 공유' : 'PICKY.IO'}
            </div>
            <div
              style={{
                fontSize: 13.5,
                fontWeight: 800,
                color: platform === 'kakao' ? '#111' : '#fff',
                marginTop: 3,
                lineHeight: 1.32,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {content.title}
            </div>
            <div
              style={{
                fontSize: 12,
                color: platform === 'kakao' ? '#666' : '#8899a6',
                marginTop: 4,
                lineHeight: 1.4,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {content.summary}
            </div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 8 }}>
              {content.visibleOptions.map((option, index) => (
                <span
                  key={`${option}-${index}`}
                  style={{
                    border: `1px solid ${platform === 'kakao' ? '#eee' : '#38444d'}`,
                    borderRadius: theme.radiusPill,
                    background: platform === 'kakao' ? '#fafafa' : 'transparent',
                    color: platform === 'kakao' ? '#333' : '#d7e1e8',
                    padding: '3px 8px',
                    fontSize: 10.5,
                    fontWeight: 700,
                    maxWidth: '100%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {index + 1}. {option}
                </span>
              ))}
              {content.hiddenOptionCount > 0 ? (
                <span
                  style={{
                    color: platform === 'kakao' ? '#777' : '#8899a6',
                    fontSize: 10.5,
                    fontWeight: 700,
                    alignSelf: 'center',
                  }}
                >
                  +{content.hiddenOptionCount}
                </span>
              ) : null}
            </div>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 5,
                marginTop: 8,
                borderTop: `1px solid ${platform === 'kakao' ? '#eee' : '#38444d'}`,
                paddingTop: 8,
              }}
            >
              {content.metaItems.map((item) => {
                const highlight = item === '참여 가능';
                return (
                  <span
                    key={item}
                    style={{
                      borderRadius: theme.radiusPill,
                      color: highlight
                        ? platform === 'kakao'
                          ? '#087b68'
                          : '#5eead4'
                        : platform === 'kakao'
                          ? '#666'
                          : '#8899a6',
                      fontSize: 10,
                      fontWeight: 800,
                    }}
                  >
                    {item}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
