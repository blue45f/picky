import React, { useMemo, useState } from 'react';
import {
  CircleCheckBig,
  Copy,
  LayoutTemplate,
  Layers,
  Palette,
  Paintbrush,
  Ruler,
  SlidersHorizontal,
  Type,
  Wand2,
} from 'lucide-react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const colorTokens = [
  {
    name: '배경 Base',
    token: '--bg-main',
    value: 'oklch(14% 0.015 260)',
    purpose: '앱 전체 바탕',
    sample: 'var(--bg-main)',
  },
  {
    name: '카드 패널',
    token: '--bg-card',
    value: 'oklch(18% 0.02 260)',
    purpose: '카드 및 팝오버',
    sample: 'var(--bg-card)',
  },
  {
    name: '메인 액션',
    token: '--brand-primary',
    value: 'oklch(62% 0.18 260)',
    purpose: 'Primary CTA, 강조',
    sample: 'var(--brand-primary)',
  },
  {
    name: '호버/포커스',
    token: '--brand-primary-light',
    value: 'oklch(75% 0.12 260)',
    purpose: '버튼 Hover, Active',
    sample: 'var(--brand-primary-light)',
  },
  {
    name: '경고/알림',
    token: '--brand-accent-gold',
    value: 'oklch(78% 0.14 85)',
    purpose: '헤드라인 포인트, 배지',
    sample: 'var(--brand-accent-gold)',
  },
  {
    name: '성공',
    token: '--brand-accent-teal',
    value: 'oklch(72% 0.15 170)',
    purpose: '성공 상태/제안',
    sample: 'var(--brand-accent-teal)',
  },
  {
    name: '오류',
    token: '--brand-accent-coral',
    value: 'oklch(64% 0.18 25)',
    purpose: '에러/위험 신호',
    sample: 'var(--brand-accent-coral)',
  },
  {
    name: '본문 텍스트',
    token: '--text-primary',
    value: 'oklch(98% 0.005 260)',
    purpose: '일반 본문',
    sample: 'var(--text-primary)',
  },
  {
    name: '메타 텍스트',
    token: '--text-muted',
    value: 'oklch(66% 0.015 260)',
    purpose: '보조 라벨/캡션',
    sample: 'var(--text-muted)',
  },
];

const typographyScale = [
  {
    token: 'Display',
    size: '2.8rem',
    weight: 900,
    lineHeight: 1.06,
    example: '디자인 시스템 랩',
    note: 'Hero와 첫 인상 영역',
  },
  {
    token: 'H1',
    size: '1.9rem',
    weight: 800,
    lineHeight: 1.2,
    example: '섹션 헤더',
    note: '페이지 내부 큰 제목',
  },
  {
    token: 'H2',
    size: '1.35rem',
    weight: 700,
    lineHeight: 1.34,
    example: '카드 타이틀',
    note: '컴포넌트 제목',
  },
  {
    token: 'Body',
    size: '0.95rem',
    weight: 400,
    lineHeight: 1.65,
    example: '본문 문장',
    note: '읽기 편한 가독성',
  },
  {
    token: 'Caption',
    size: '0.74rem',
    weight: 500,
    lineHeight: 1.35,
    example: '작은 메타 텍스트',
    note: '상태 뱃지/타임라인 레이블',
  },
];

const shapeTokens = [
  { token: '--radius-sm', value: '8px', sample: 8, purpose: '입력/칩 기본 모양' },
  { token: '--radius-md', value: '12px', sample: 12, purpose: '카드/패널 기본 모양' },
  { token: '--radius-lg', value: '18px', sample: 18, purpose: '모달/시트/대형 박스' },
  { token: '--shadow-sm', value: '0 2px 8px rgba(0, 0, 0, 0.2)', purpose: '기본 분리감' },
  {
    token: '--shadow-md',
    value: '0 12px 24px -4px rgba(0, 0, 0, 0.4)',
    purpose: '패널 레이어',
  },
  {
    token: '--shadow-glow',
    value: '0 0 24px rgba(99, 102, 241, 0.15)',
    purpose: '인터랙션 강조',
  },
];

const primitiveActions = ['기본', '호버', '활성', '비활성', '로딩'];

const snippetExamples = [
  {
    title: 'Primary 버튼',
    usage: '핵심 작업',
    code: '<button className="btn-primary">새 폴 선택</button>',
  },
  {
    title: 'Secondary 버튼',
    usage: '보조 동작',
    code: '<button className="btn-secondary">취소</button>',
  },
  {
    title: '폼 입력',
    usage: '텍스트 입력',
    code: '<input className="form-input" placeholder="이름을 입력하세요" />',
  },
  {
    title: '카드 패턴',
    usage: '콘텐츠 블록',
    code: '<article className="content-card"><h4>카드 제목</h4><p>본문...</p></article>',
  },
];

const contrastPairs = [
  { bg: 'var(--bg-main)', text: 'var(--text-primary)', label: '본문 대비' },
  { bg: 'var(--brand-primary)', text: 'var(--text-primary)', label: '브랜드 대비' },
  { bg: 'var(--brand-accent-coral)', text: 'var(--text-primary)', label: '경고 대비' },
  { bg: 'rgba(0,0,0,0.42)', text: 'var(--text-primary)', label: '다크 카드 대비' },
];

type DensityMode = 'compact' | 'balanced' | 'spacious';

type DensityStyle = {
  gap: string;
  cardPadding: string;
  inputPad: string;
};

const densityStyles: Record<DensityMode, DensityStyle> = {
  compact: {
    gap: '0.55rem',
    cardPadding: '0.9rem',
    inputPad: '10px 12px',
  },
  balanced: {
    gap: '0.75rem',
    cardPadding: '1.12rem',
    inputPad: '12px 14px',
  },
  spacious: {
    gap: '1rem',
    cardPadding: '1.35rem',
    inputPad: '14px 16px',
  },
};

export const DesignSystem: React.FC = () => {
  useDocumentTitle('디자인 시스템');
  const [density, setDensity] = useState<DensityMode>('balanced');
  const [copyKey, setCopyKey] = useState<string>('');
  const [ctaMode, setCtaMode] = useState<'text' | 'loading'>('text');

  const copyCode = (key: string, text: string) => {
    navigator.clipboard?.writeText(text).finally(() => {
      setCopyKey(key);
      setTimeout(() => setCopyKey((current) => (current === key ? '' : current)), 1400);
    });
  };

  const currentDensity = useMemo(() => densityStyles[density], [density]);

  return (
    <div
      style={{
        position: 'relative',
        display: 'grid',
        gap: currentDensity.gap,
      }}
    >
      <style>
        {`
          @keyframes ds-float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-8px); }
          }
          @keyframes ds-sheen {
            0% { transform: translateX(-140%); opacity: 0.4; }
            100% { transform: translateX(140%); opacity: 0; }
          }
        `}
      </style>

      <section
        className="content-card"
        style={{
          position: 'relative',
          overflow: 'hidden',
          padding: currentDensity.cardPadding,
          display: 'grid',
          gap: '0.85rem',
          animation: 'slideUp 0.55s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        }}
      >
        <div
          style={{
            position: 'absolute',
            width: '230px',
            height: '230px',
            borderRadius: '50%',
            right: '-70px',
            top: '-60px',
            background:
              'radial-gradient(circle at center, rgba(255,255,255,0.18), rgba(255,255,255,0) 70%)',
            pointerEvents: 'none',
            opacity: 0.35,
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: '260px',
            height: '260px',
            borderRadius: '50%',
            left: '-120px',
            bottom: '-150px',
            background:
              'radial-gradient(circle at center, rgba(132, 94, 247, 0.32), rgba(132, 94, 247, 0) 72%)',
            pointerEvents: 'none',
            filter: 'blur(1px)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(120deg, rgba(99,102,241,0.15), transparent 40%, rgba(245,158,11,0.08) 100%)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
        <div style={{ position: 'relative', zIndex: 1, display: 'grid', gap: '0.8rem' }}>
          <span
            style={{
              color: 'var(--brand-accent-gold)',
              fontWeight: 700,
              fontSize: '0.72rem',
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
            }}
          >
            Pickflow Design System
          </span>
          <h1
            style={{
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '0.55rem',
              fontSize: '2.05rem',
              lineHeight: 1.1,
            }}
          >
            <Palette size={24} />
            서비스 전체를 이끄는 디자인 원본
          </h1>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.75, maxWidth: 780 }}>
            토큰부터 컴포넌트까지 한 번에 점검할 수 있는 내부 전용 디자인 시스템 뷰입니다.
            버튼/입력/카드/섹션 레이아웃의 규칙을 같은 문맥에서 확인하고 즉시 UI로 환원할 수
            있습니다.
          </p>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.65rem',
              alignItems: 'center',
            }}
          >
            <button
              type="button"
              className="btn-primary"
              style={{
                padding: '0.7rem 1.05rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                animation: 'ds-float 2.8s ease-in-out infinite',
              }}
            >
              <Wand2 size={15} />
              토큰 카탈로그 시작
            </button>
            <span
              style={{
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.45rem 0.65rem',
                borderRadius: '999px',
                border: '1px solid rgba(255,255,255,0.12)',
              }}
            >
              <CircleCheckBig size={15} />
              상태: 실서비스 연동 준비 완료
            </span>
          </div>
        </div>
      </section>

      <section id="foundation" style={{ display: 'grid', gap: currentDensity.gap }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            gap: '0.6rem',
            alignItems: 'end',
          }}
        >
          <h2
            style={{
              margin: 0,
              display: 'inline-flex',
              gap: '0.55rem',
              alignItems: 'center',
            }}
          >
            <Paintbrush size={18} />
            Foundation Tokens
          </h2>
          <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
            <button
              type="button"
              className={density === 'compact' ? 'btn-primary' : 'btn-secondary'}
              onClick={() => setDensity('compact')}
              style={{ padding: '0.45rem 0.74rem', fontSize: '0.73rem' }}
            >
              compact
            </button>
            <button
              type="button"
              className={density === 'balanced' ? 'btn-primary' : 'btn-secondary'}
              onClick={() => setDensity('balanced')}
              style={{ padding: '0.45rem 0.74rem', fontSize: '0.73rem' }}
            >
              balanced
            </button>
            <button
              type="button"
              className={density === 'spacious' ? 'btn-primary' : 'btn-secondary'}
              onClick={() => setDensity('spacious')}
              style={{ padding: '0.45rem 0.74rem', fontSize: '0.73rem' }}
            >
              spacious
            </button>
          </div>
        </div>

        <section className="content-card" style={{ padding: currentDensity.cardPadding }}>
          <div style={{ display: 'grid', gap: currentDensity.gap }}>
            {colorTokens.map((token, index) => (
              <div
                key={token.token}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '180px 1fr auto',
                  alignItems: 'center',
                  gap: '0.75rem',
                  border: '1px solid var(--bg-card-border)',
                  borderRadius: '10px',
                  padding: '0.7rem',
                  background:
                    'linear-gradient(120deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01))',
                  transform: `translateY(${index * 0.5}px)`,
                  animation: `slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${index * 45 + 120}ms both`,
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    minWidth: 0,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {token.name}
                </div>
                <div>
                  <div
                    style={{
                      fontSize: '0.86rem',
                      color: 'var(--text-secondary)',
                      marginBottom: '2px',
                    }}
                  >
                    {token.token} · {token.value}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    {token.purpose}
                  </div>
                </div>
                <div
                  style={{
                    width: '64px',
                    height: '28px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: token.sample,
                    boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.2)',
                  }}
                />
              </div>
            ))}
          </div>
        </section>
      </section>

      <section style={{ display: 'grid', gap: currentDensity.gap }}>
        <h2
          style={{
            margin: 0,
            display: 'inline-flex',
            gap: '0.55rem',
            alignItems: 'center',
          }}
        >
          <Type size={18} />
          Typography System
        </h2>
        <section className="content-card" style={{ padding: currentDensity.cardPadding }}>
          <div style={{ display: 'grid', gap: currentDensity.gap }}>
            {typographyScale.map((type, index) => (
              <div
                key={type.token}
                className="content-card"
                style={{
                  background: 'oklch(16% 0.013 260)',
                  borderRadius: '10px',
                  padding: '0.9rem',
                  display: 'grid',
                  gap: '0.4rem',
                  borderLeft: '3px solid var(--brand-primary)',
                  animation: `slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${index * 55 + 100}ms both`,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '0.7rem',
                    flexWrap: 'wrap',
                    color: 'var(--text-secondary)',
                    fontSize: '0.74rem',
                  }}
                >
                  <span>{type.token}</span>
                  <span>
                    {type.size} / {type.weight} / lh {type.lineHeight}
                  </span>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: type.size,
                    lineHeight: type.lineHeight,
                    fontWeight: type.weight,
                    color: 'var(--text-primary)',
                  }}
                >
                  {type.example}
                </p>
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {type.note}
                </p>
              </div>
            ))}
          </div>
        </section>
      </section>

      <section style={{ display: 'grid', gap: currentDensity.gap }}>
        <h2
          style={{
            margin: 0,
            display: 'inline-flex',
            gap: '0.55rem',
            alignItems: 'center',
          }}
        >
          <Ruler size={18} />
          Spacing, Radius & Depth
        </h2>
        <section className="content-card" style={{ padding: currentDensity.cardPadding }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: currentDensity.gap,
            }}
          >
            {shapeTokens.map((shape, index) => (
              <div
                key={shape.token}
                style={{
                  border: '1px solid var(--bg-card-border)',
                  borderRadius: '10px',
                  padding: '0.8rem',
                  background: 'var(--bg-card)',
                  display: 'grid',
                  gap: '0.4rem',
                  animation: `slideUp 0.45s cubic-bezier(0.16, 1, 0.3, 1) ${index * 55 + 160}ms both`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <strong>{shape.token}</strong>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    {shape.value}
                  </span>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {shape.purpose}
                </span>
                <div
                  style={{
                    height: '10px',
                    borderRadius: '999px',
                    background:
                      'linear-gradient(90deg, var(--bg-main), var(--brand-primary), var(--brand-primary-light))',
                  }}
                />
                {shape.sample ? (
                  <div
                    style={{
                      marginTop: '2px',
                      height: '24px',
                      background: 'rgba(255,255,255,0.08)',
                      borderRadius: `${shape.sample}px`,
                      border: '1px solid rgba(255,255,255,0.2)',
                    }}
                  />
                ) : null}
              </div>
            ))}
          </div>
        </section>
      </section>

      <section style={{ display: 'grid', gap: currentDensity.gap }}>
        <h2
          style={{
            margin: 0,
            display: 'inline-flex',
            gap: '0.55rem',
            alignItems: 'center',
          }}
        >
          <SlidersHorizontal size={18} />
          Component Primitives
        </h2>
        <section className="content-card" style={{ padding: currentDensity.cardPadding }}>
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.6rem',
                alignItems: 'center',
              }}
            >
              <button
                type="button"
                className={ctaMode === 'text' ? 'btn-primary' : 'btn-secondary'}
                style={{ padding: '0.68rem 1.02rem' }}
                onClick={() => setCtaMode('text')}
              >
                텍스트 버튼
              </button>
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: '0.68rem 1.02rem' }}
                onClick={() => setCtaMode('loading')}
              >
                로딩 상태 보기
              </button>
              <div
                style={{
                  marginLeft: 'auto',
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  gap: '0.45rem',
                  alignItems: 'center',
                }}
              >
                {primitiveActions.map((action) => (
                  <span
                    key={action}
                    style={{
                      padding: '0.22rem 0.56rem',
                      borderRadius: '999px',
                      border: '1px dashed var(--bg-card-border)',
                      color: 'var(--text-muted)',
                      fontSize: '0.73rem',
                    }}
                  >
                    {action}
                  </span>
                ))}
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                gap: '0.6rem',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.6rem',
                  flexWrap: 'wrap',
                  border: '1px solid var(--bg-card-border)',
                  borderRadius: '10px',
                  padding: '1rem',
                }}
              >
                <button type="button" className="btn-primary" style={{ padding: '0.68rem 1.1rem' }}>
                  Primary
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: '0.68rem 1.1rem' }}
                >
                  Secondary
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  style={{ padding: '0.68rem 1.1rem', opacity: 0.48 }}
                  disabled
                >
                  Disabled
                </button>
                {ctaMode === 'loading' ? (
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ padding: '0.68rem 1.1rem', position: 'relative' }}
                  >
                    <span style={{ opacity: 0.8 }}>로딩중</span>
                    <span
                      style={{
                        position: 'absolute',
                        width: '14px',
                        height: '14px',
                        border: '2px solid rgba(255,255,255,0.32)',
                        borderTopColor: 'white',
                        borderRadius: '50%',
                        animation: 'ds-float 1s linear infinite',
                        right: '0.75rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                      }}
                    />
                  </button>
                ) : null}
              </div>

              <div
                style={{
                  display: 'grid',
                  gap: '0.6rem',
                  border: '1px solid var(--bg-card-border)',
                  borderRadius: '10px',
                  padding: '0.8rem',
                }}
              >
                <input
                  className="form-input"
                  placeholder="텍스트 입력"
                  style={{ padding: currentDensity.inputPad }}
                />
                <textarea
                  className="form-input"
                  rows={4}
                  placeholder="멀티라인 입력"
                  style={{ padding: currentDensity.inputPad, resize: 'vertical' }}
                />
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      borderRadius: '999px',
                      padding: '0.35rem 0.75rem',
                      border: '1px solid rgba(255,255,255,0.16)',
                      fontSize: '0.74rem',
                      background: 'var(--bg-card-hover)',
                    }}
                  >
                    chip
                  </span>
                  <span
                    style={{
                      borderRadius: '999px',
                      padding: '0.35rem 0.75rem',
                      fontSize: '0.74rem',
                      background: 'var(--brand-primary)',
                      color: 'white',
                    }}
                  >
                    filled chip
                  </span>
                  <span
                    style={{
                      borderRadius: '999px',
                      padding: '0.35rem 0.75rem',
                      fontSize: '0.74rem',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.2)',
                    }}
                  >
                    outline chip
                  </span>
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gap: '0.65rem',
                  border: '1px solid var(--bg-card-border)',
                  borderRadius: '10px',
                  padding: '0.8rem',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.7rem',
                  }}
                >
                  <strong style={{ fontSize: '0.9rem' }}>Action Tokens</strong>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    컴포넌트 규격
                  </span>
                </div>
                <div
                  style={{
                    display: 'grid',
                    gap: '0.5rem',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  }}
                >
                  {[
                    ['Radius', 'var(--radius-md)'],
                    ['Height', ctaMode === 'loading' ? '44px' : '40px'],
                    ['Border', '1px solid var(--bg-card-border)'],
                    ['Font', '0.9rem / 600'],
                  ].map((entry) => (
                    <div
                      key={entry[0]}
                      style={{
                        padding: '0.55rem 0.7rem',
                        background: 'var(--bg-card-hover)',
                        borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.12)',
                        fontSize: '0.74rem',
                      }}
                    >
                      <div style={{ color: 'var(--text-muted)' }}>{entry[0]}</div>
                      <div style={{ fontWeight: 700, marginTop: '0.24rem' }}>{entry[1]}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </section>

      <section style={{ display: 'grid', gap: currentDensity.gap }}>
        <h2
          style={{
            margin: 0,
            display: 'inline-flex',
            gap: '0.55rem',
            alignItems: 'center',
          }}
        >
          <LayoutTemplate size={18} />
          Layout System
        </h2>
        <section className="content-card" style={{ padding: currentDensity.cardPadding }}>
          <div
            style={{
              display: 'grid',
              gap: '0.75rem',
              border: '1px solid var(--bg-card-border)',
              borderRadius: '12px',
              padding: '0.8rem',
              background: 'oklch(16% 0.014 260)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                background:
                  'radial-gradient(circle at 30% 0%, rgba(99,102,241,0.18), rgba(99,102,241,0) 45%), radial-gradient(circle at 70% 100%, rgba(16,185,129,0.13), rgba(16,185,129,0) 52%)',
              }}
            />
            <div
              style={{
                position: 'relative',
                zIndex: 1,
                display: 'grid',
                gridTemplateColumns: '220px 1fr',
                gap: '0.65rem',
              }}
            >
              <aside
                style={{
                  borderRadius: '10px',
                  border: '1px dashed var(--bg-card-border)',
                  padding: '0.8rem',
                  background: 'rgba(255,255,255,0.03)',
                }}
              >
                네비게이션
              </aside>
              <main
                style={{
                  borderRadius: '10px',
                  border: '1px dashed var(--bg-card-border)',
                  padding: '0.8rem',
                  background: 'rgba(255,255,255,0.03)',
                }}
              >
                콘텐츠
              </main>
            </div>
            <div
              style={{
                position: 'relative',
                zIndex: 1,
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: '0.65rem',
              }}
            >
              {['상태 카드', '통계 카드', '참여자 카드'].map((cardLabel) => (
                <div
                  key={cardLabel}
                  style={{
                    borderRadius: '10px',
                    border: '1px solid var(--bg-card-border)',
                    padding: '0.75rem',
                    background: 'rgba(255,255,255,0.03)',
                    minHeight: '74px',
                    display: 'grid',
                    alignContent: 'center',
                  }}
                >
                  {cardLabel}
                </div>
              ))}
            </div>
          </div>
        </section>
      </section>

      <section style={{ display: 'grid', gap: currentDensity.gap }}>
        <h2
          style={{
            margin: 0,
            display: 'inline-flex',
            gap: '0.55rem',
            alignItems: 'center',
          }}
        >
          <Layers size={18} />
          코드 스니펫
        </h2>
        <section className="content-card" style={{ padding: currentDensity.cardPadding }}>
          <div style={{ display: 'grid', gap: '0.7rem' }}>
            {snippetExamples.map((snippet, index) => (
              <div
                key={snippet.title}
                style={{
                  border: '1px solid var(--bg-card-border)',
                  borderRadius: '10px',
                  padding: '0.8rem',
                  background: 'oklch(16% 0.014 260)',
                  display: 'grid',
                  gap: '0.4rem',
                  animation: `slideUp 0.45s cubic-bezier(0.16, 1, 0.3, 1) ${index * 70 + 110}ms both`,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '0.6rem',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700 }}>{snippet.title}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.74rem' }}>
                      {snippet.usage}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => copyCode(snippet.title, snippet.code)}
                    style={{
                      padding: '0.45rem 0.72rem',
                      display: 'inline-flex',
                      gap: '0.4rem',
                      alignItems: 'center',
                    }}
                  >
                    <Copy size={14} />
                    {copyKey === snippet.title ? '복사됨' : '복사'}
                  </button>
                </div>
                <pre
                  style={{
                    margin: 0,
                    borderRadius: '8px',
                    padding: '0.75rem',
                    backgroundColor: 'rgba(0,0,0,0.3)',
                    color: 'var(--text-secondary)',
                    fontSize: '0.77rem',
                    overflowX: 'auto',
                    position: 'relative',
                  }}
                >
                  <code>{snippet.code}</code>
                  <span
                    style={{
                      position: 'absolute',
                      right: 0,
                      bottom: 0,
                      width: '32px',
                      height: '100%',
                      pointerEvents: 'none',
                      background: 'linear-gradient(90deg, rgba(0,0,0,0), rgba(0,0,0,0.32))',
                    }}
                  />
                </pre>
              </div>
            ))}
          </div>
        </section>
      </section>

      <section style={{ display: 'grid', gap: currentDensity.gap }}>
        <h2
          style={{
            margin: 0,
            display: 'inline-flex',
            gap: '0.55rem',
            alignItems: 'center',
          }}
        >
          <Type size={18} />
          접근성 체크
        </h2>
        <section className="content-card" style={{ padding: currentDensity.cardPadding }}>
          <div
            style={{
              display: 'grid',
              gap: '0.6rem',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            }}
          >
            {contrastPairs.map((pair) => (
              <div
                key={pair.label}
                style={{
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.12)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    padding: '0.7rem',
                    color: pair.text,
                    background: pair.bg,
                    fontSize: '0.98rem',
                    fontWeight: 700,
                  }}
                >
                  {pair.label}
                </div>
                <div
                  style={{
                    padding: '0.6rem',
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary)',
                    background: 'var(--bg-card)',
                    borderTop: '1px solid rgba(255,255,255,0.12)',
                  }}
                >
                  기본 대비 샘플
                  <br />
                  <span style={{ color: 'var(--text-muted)' }}>
                    배경 대비가 실서비스에서 충분한지 UI 확인용 시나리오입니다.
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </section>

      <section
        className="content-card"
        style={{ padding: '1.1rem', display: 'grid', gap: '0.5rem' }}
      >
        <h3 style={{ margin: 0, fontSize: '0.95rem' }}>페이지 요약</h3>
        <p
          style={{
            margin: 0,
            color: 'var(--text-secondary)',
            lineHeight: 1.75,
            fontSize: '0.84rem',
          }}
        >
          이 페이지는 토큰과 원칙을 기반으로 한 일관된 스타일링으로 구성되며, 실제 서비스 컴포넌트의
          베이스로 바로 연결되도록 작성되어 있습니다.
        </p>
        <div
          style={{
            marginTop: '0.4rem',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem',
            color: 'var(--text-muted)',
            fontSize: '0.75rem',
          }}
        >
          <span
            style={{
              border: '1px dashed var(--bg-card-border)',
              padding: '0.35rem 0.65rem',
              borderRadius: '999px',
            }}
          >
            반응형 레이아웃 대응
          </span>
          <span
            style={{
              border: '1px dashed var(--bg-card-border)',
              padding: '0.35rem 0.65rem',
              borderRadius: '999px',
            }}
          >
            인터랙션 상태 커버
          </span>
          <span
            style={{
              border: '1px dashed var(--bg-card-border)',
              padding: '0.35rem 0.65rem',
              borderRadius: '999px',
            }}
          >
            코드 복붙 패턴 제공
          </span>
        </div>
      </section>
    </div>
  );
};
