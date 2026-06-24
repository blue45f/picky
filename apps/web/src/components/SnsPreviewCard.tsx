import React from 'react';

interface SnsPreviewCardProps {
  platform: 'x' | 'kakao';
  question: string;
  description?: string | null;
  options: string[];
  imageUrl?: string | null;
}

const brandGradient = 'linear-gradient(135deg, #10251f 0%, #1d6255 54%, #e8c84d 100%)';

type PreviewModel = Readonly<{
  title: string;
  summary: string;
  visibleOptions: string[];
  hiddenOptionCount: number;
  previewReady: boolean;
  hasImagePreview: boolean;
  metaItems: string[];
  imageUrl?: string | null;
}>;

function XPreviewCard({
  title,
  summary,
  visibleOptions,
  hiddenOptionCount,
  previewReady,
  hasImagePreview,
  metaItems,
  imageUrl,
}: PreviewModel) {
  return (
    <div
      style={{
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '10px',
        overflow: 'hidden',
        backgroundColor: '#15202b',
        padding: '12px',
        textAlign: 'left',
        boxShadow: '0 18px 40px rgba(0,0,0,0.2)',
      }}
    >
      <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: 'var(--brand-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.75rem',
            fontWeight: 800,
            color: '#ffffff',
          }}
        >
          PF
        </div>
        <div>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'white' }}>picky</span>
            <span style={{ fontSize: '0.7rem', color: '#8899a6' }}>@picky_io · 방금</span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'white', marginTop: '2px', lineHeight: 1.38 }}>
            30초만 투자해 선택해 주세요. 결과는 picky에서 바로 확인됩니다.
          </p>
        </div>
      </div>

      <div
        style={{
          border: '1px solid #38444d',
          borderRadius: '10px',
          overflow: 'hidden',
          backgroundColor: '#192734',
        }}
      >
        <div
          style={{
            position: 'relative',
            minHeight: '94px',
            overflow: 'hidden',
            background: brandGradient,
            display: 'grid',
            alignContent: 'end',
            gap: '6px',
            padding: '12px',
          }}
        >
          {hasImagePreview ? (
            <>
              <img
                src={imageUrl || ''}
                alt=""
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
              <span
                aria-hidden="true"
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
              border: '1px solid rgba(255,255,255,0.22)',
              borderRadius: '999px',
              background: 'rgba(0,0,0,0.18)',
              color: '#e6fffb',
              padding: '3px 8px',
              fontSize: '0.62rem',
              fontWeight: 900,
            }}
          >
            {previewReady ? 'READY TO SHARE' : 'DRAFT PREVIEW'}
          </span>
          <strong
            style={{
              position: 'relative',
              color: '#ffffff',
              fontSize: '0.98rem',
              lineHeight: 1.22,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {title}
          </strong>
        </div>
        <div style={{ padding: '10px' }}>
          <div style={{ fontSize: '0.65rem', color: '#8899a6', fontWeight: 600 }}>PICKY.IO</div>
          <div
            style={{
              fontSize: '0.85rem',
              fontWeight: 700,
              color: 'white',
              marginTop: '2px',
              lineHeight: 1.32,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: '0.725rem',
              color: '#8899a6',
              marginTop: '4px',
              lineHeight: 1.4,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {summary}
          </div>
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '8px' }}>
            {visibleOptions.map((option, index) => (
              <span
                key={`${option}-${index}`}
                style={{
                  border: '1px solid #38444d',
                  borderRadius: '999px',
                  color: '#d7e1e8',
                  padding: '3px 7px',
                  fontSize: '0.62rem',
                  maxWidth: '100%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {index + 1}. {option}
              </span>
            ))}
            {hiddenOptionCount > 0 ? (
              <span
                style={{
                  border: '1px solid #38444d',
                  borderRadius: '999px',
                  color: '#8899a6',
                  padding: '3px 7px',
                  fontSize: '0.62rem',
                }}
              >
                +{hiddenOptionCount}
              </span>
            ) : null}
          </div>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '5px',
              marginTop: '8px',
              borderTop: '1px solid #38444d',
              paddingTop: '8px',
            }}
          >
            {metaItems.map((item) => (
              <span
                key={`x-${item}`}
                style={{
                  border: '1px solid rgba(136, 153, 166, 0.28)',
                  borderRadius: '999px',
                  color: item === '참여 가능' ? '#5eead4' : '#8899a6',
                  padding: '3px 7px',
                  fontSize: '0.6rem',
                  fontWeight: 800,
                }}
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function KakaoPreviewCard({
  title,
  summary,
  visibleOptions,
  hiddenOptionCount,
  previewReady,
  hasImagePreview,
  metaItems,
  imageUrl,
}: PreviewModel) {
  return (
    <div
      style={{
        border: '1px solid rgba(0, 0, 0, 0.1)',
        borderRadius: '10px',
        overflow: 'hidden',
        backgroundColor: '#ffeb33',
        padding: '12px',
        color: '#3c3c3c',
        textAlign: 'left',
        boxShadow: '0 18px 42px rgba(0,0,0,0.16)',
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '10px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
        }}
      >
        <div
          style={{
            position: 'relative',
            minHeight: '102px',
            borderRadius: '7px',
            overflow: 'hidden',
            background: brandGradient,
            padding: '12px',
            display: 'grid',
            alignContent: 'space-between',
            marginBottom: '10px',
          }}
        >
          {hasImagePreview ? (
            <>
              <img
                src={imageUrl || ''}
                alt=""
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
              <span
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(180deg, rgba(6,20,17,0.06), rgba(6,20,17,0.72))',
                }}
              />
            </>
          ) : null}
          <span
            style={{
              position: 'relative',
              width: 'fit-content',
              border: '1px solid rgba(255,255,255,0.22)',
              borderRadius: '999px',
              background: 'rgba(0,0,0,0.16)',
              color: '#f4fffc',
              padding: '3px 8px',
              fontSize: '0.62rem',
              fontWeight: 900,
            }}
          >
            KAKAO OG PREVIEW
          </span>
          <strong
            style={{
              position: 'relative',
              color: '#ffffff',
              fontSize: '0.98rem',
              lineHeight: 1.22,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {title}
          </strong>
        </div>
        <span style={{ fontSize: '0.65rem', color: '#1d4ed8', fontWeight: 700 }}>
          고민 투표 공유
        </span>
        <div
          style={{
            fontSize: '0.825rem',
            fontWeight: 800,
            color: '#111',
            marginTop: '4px',
            lineHeight: 1.35,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {title}
        </div>
        <p style={{ fontSize: '0.725rem', color: '#666', marginTop: '4px', lineHeight: 1.35 }}>
          {summary}
        </p>
        {visibleOptions.length > 0 ? (
          <div style={{ display: 'grid', gap: '5px', marginTop: '8px' }}>
            {visibleOptions.map((option, index) => (
              <span
                key={`${option}-${index}`}
                style={{
                  border: '1px solid #eee',
                  borderRadius: '7px',
                  background: '#fafafa',
                  color: '#333',
                  padding: '6px 8px',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {index + 1}. {option}
              </span>
            ))}
            {hiddenOptionCount > 0 ? (
              <span style={{ color: '#777', fontSize: '0.64rem', fontWeight: 700 }}>
                외 {hiddenOptionCount}개 선택지 더 보기
              </span>
            ) : null}
          </div>
        ) : null}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '5px',
            marginTop: '8px',
          }}
        >
          {metaItems.map((item) => (
            <span
              key={`kakao-${item}`}
              style={{
                border: '1px solid #eeeeee',
                borderRadius: '999px',
                background: item === '참여 가능' ? '#effaf7' : '#f7f7f7',
                color: item === '참여 가능' ? '#087b68' : '#666666',
                padding: '3px 7px',
                fontSize: '0.6rem',
                fontWeight: 800,
              }}
            >
              {item}
            </span>
          ))}
        </div>
        <div
          style={{
            borderTop: '1px solid #eee',
            marginTop: '8px',
            paddingTop: '6px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.675rem',
            color: '#444',
            fontWeight: 600,
          }}
        >
          <span>{previewReady ? '투표하러 가기' : '질문과 선택지 입력 필요'}</span>
          <span>picky.io</span>
        </div>
      </div>
    </div>
  );
}

export const SnsPreviewCard: React.FC<SnsPreviewCardProps> = ({
  platform,
  question,
  description,
  options,
  imageUrl,
}) => {
  const trimmedQuestion = question.trim();
  const title = trimmedQuestion || '공유될 투표 질문';
  const summary =
    description?.trim() ||
    (options.length > 0
      ? `${options
          .slice(0, 3)
          .map((option, index) => `${index + 1}. ${option}`)
          .join(' · ')}`
      : '링크를 받은 사람이 바로 선택할 수 있는 투표 카드가 표시됩니다.');
  const visibleOptions = options.filter(Boolean).slice(0, 3);
  const hiddenOptionCount = Math.max(options.length - visibleOptions.length, 0);
  const previewReady = trimmedQuestion.length > 0 && options.length >= 2;
  const readableCharacterCount =
    title.length +
    summary.length +
    visibleOptions.reduce((total, option) => total + option.length, 0);
  const estimatedSeconds = Math.max(5, Math.ceil(readableCharacterCount / 16));
  const hasImagePreview = Boolean(imageUrl);
  const metaItems = [
    previewReady ? '참여 가능' : '작성 중',
    `${options.length}개 선택지`,
    hasImagePreview ? '이미지 반영' : '기본 이미지',
    `${estimatedSeconds}초 예상`,
  ];

  const model: PreviewModel = {
    title,
    summary,
    visibleOptions,
    hiddenOptionCount,
    previewReady,
    hasImagePreview,
    metaItems,
    imageUrl,
  };

  if (platform === 'x') {
    return <XPreviewCard {...model} />;
  }

  return <KakaoPreviewCard {...model} />;
};
