import React from 'react';

interface SnsPreviewCardProps {
  platform: 'x' | 'kakao';
  question: string;
  description?: string | null;
  options: string[];
}

export const SnsPreviewCard: React.FC<SnsPreviewCardProps> = ({
  platform,
  question,
  description,
  options,
}) => {
  if (platform === 'x') {
    return (
      <div
        style={{
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          overflow: 'hidden',
          backgroundColor: '#15202b',
          padding: '12px',
          textAlign: 'left',
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
            }}
          >
            PF
          </div>
          <div>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'white' }}>pickflow</span>
              <span style={{ fontSize: '0.7rem', color: '#8899a6' }}>@pickflow_io · 방금</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'white', marginTop: '2px' }}>
              결정이 너무 어렵습니다! 투표 한 번만 해주세요 🙏
            </p>
          </div>
        </div>

        <div
          style={{
            border: '1px solid #38444d',
            borderRadius: '12px',
            overflow: 'hidden',
            backgroundColor: '#192734',
          }}
        >
          <div style={{ padding: '10px' }}>
            <div style={{ fontSize: '0.65rem', color: '#8899a6', fontWeight: 600 }}>
              PICKFLOW.IO
            </div>
            <div
              style={{
                fontSize: '0.85rem',
                fontWeight: 700,
                color: 'white',
                marginTop: '2px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {question}
            </div>
            <div
              style={{
                fontSize: '0.725rem',
                color: '#8899a6',
                marginTop: '4px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {options.map((opt, i) => `${i + 1}. ${opt}`).join(' | ')}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        border: '1px solid rgba(0, 0, 0, 0.1)',
        borderRadius: '12px',
        overflow: 'hidden',
        backgroundColor: '#ffeb33',
        padding: '12px',
        color: '#3c3c3c',
        textAlign: 'left',
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
        <span style={{ fontSize: '0.65rem', color: '#3b82f6', fontWeight: 700 }}>
          🗳️ 고민 투표 공유
        </span>
        <div
          style={{
            fontSize: '0.825rem',
            fontWeight: 800,
            color: '#111',
            marginTop: '4px',
            lineHeight: 1.35,
          }}
        >
          {question}
        </div>
        <p style={{ fontSize: '0.725rem', color: '#666', marginTop: '4px', lineHeight: 1.35 }}>
          {description || '지인들의 실시간 투표를 통해 고민을 말끔히 해결해보세요!'}
        </p>
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
          <span>👉 투표하러 가기</span>
          <span>pickflow.io</span>
        </div>
      </div>
    </div>
  );
};
