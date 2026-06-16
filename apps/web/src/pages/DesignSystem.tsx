import React from 'react';
import {
  Box,
  Paintbrush,
  Palette,
  Ruler,
  SlidersHorizontal,
  Type,
  View,
  Wand2,
  BoxSelect,
} from 'lucide-react';

const foundationTokens = [
  {
    token: '--bg-main',
    value: 'oklch(14% 0.015 260)',
    usage: '앱 배경',
    sample: 'var(--bg-main)',
  },
  {
    token: '--bg-card',
    value: 'oklch(18% 0.02 260)',
    usage: '카드/패널 배경',
    sample: 'var(--bg-card)',
  },
  {
    token: '--brand-primary',
    value: 'oklch(62% 0.18 260)',
    usage: '메인 CTA',
    sample: 'var(--brand-primary)',
  },
  {
    token: '--brand-primary-light',
    value: 'oklch(75% 0.12 260)',
    usage: '호버 상태',
    sample: 'var(--brand-primary-light)',
  },
  {
    token: '--brand-accent-gold',
    value: 'oklch(78% 0.14 85)',
    usage: '강조/알림',
    sample: 'var(--brand-accent-gold)',
  },
  {
    token: '--brand-accent-teal',
    value: 'oklch(72% 0.15 170)',
    usage: '성공/보조 액션',
    sample: 'var(--brand-accent-teal)',
  },
  {
    token: '--brand-accent-coral',
    value: 'oklch(64% 0.18 25)',
    usage: '경고/오류',
    sample: 'var(--brand-accent-coral)',
  },
];

const typographyTokens = [
  {
    token: 'Display',
    size: '2.45rem',
    weight: 900,
    lh: '1.1',
    usage: '페이지 메인 헤드라인',
  },
  {
    token: 'Heading 1',
    size: '1.9rem',
    weight: 800,
    lh: '1.25',
    usage: '섹션 타이틀',
  },
  {
    token: 'Heading 2',
    size: '1.3rem',
    weight: 700,
    lh: '1.35',
    usage: '카드 타이틀',
  },
  {
    token: 'Body',
    size: '0.95rem',
    weight: 400,
    lh: '1.6',
    usage: '기본 본문',
  },
  {
    token: 'Caption',
    size: '0.75rem',
    weight: 500,
    lh: '1.3',
    usage: '메타/작은 텍스트',
  },
];

const spacingTokens = [
  {
    token: '--radius-sm',
    value: '8px',
    usage: '버튼/칩 기본',
  },
  {
    token: '--radius-md',
    value: '12px',
    usage: '카드/폼 요소',
  },
  {
    token: '--radius-lg',
    value: '18px',
    usage: '콘텐츠 모달/패널',
  },
  {
    token: '--shadow-sm',
    value: '0 2px 8px rgba(0, 0, 0, 0.2)',
    usage: '기본 카드',
  },
  {
    token: '--shadow-md',
    value: '0 12px 24px -4px rgba(0, 0, 0, 0.4)',
    usage: '입체 패널',
  },
  {
    token: '--shadow-glow',
    value: '0 0 24px rgba(99, 102, 241, 0.15)',
    usage: '주요 액션 강조',
  },
];

const componentSnippets: Array<{ title: string; subtitle: string; code: string }> = [
  {
    title: 'Primary Button',
    subtitle: '프로덕션 기준 CTA',
    code: `<button className="btn-primary">투표 시작</button>`,
  },
  {
    title: 'Secondary Button',
    subtitle: '보조 액션',
    code: `<button className="btn-secondary">취소</button>`,
  },
  {
    title: 'Input',
    subtitle: '기본 폼 입력',
    code: `<input className="form-input" placeholder="입력하세요" />`,
  },
];

const StatusPill = ({
  label,
  textColor,
  bgColor,
}: {
  label: string;
  textColor: string;
  bgColor: string;
}) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.4rem',
      padding: '0.35rem 0.7rem',
      borderRadius: '999px',
      border: '1px solid rgba(255,255,255,0.12)',
      color: textColor,
      fontSize: '0.78rem',
      background: bgColor,
      flexShrink: 0,
    }}
  >
    {label}
  </span>
);

export const DesignSystem: React.FC = () => {
  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <section className="content-card" style={{ padding: '1.4rem', display: 'grid', gap: '0.9rem' }}>
        <p
          style={{
            color: 'var(--brand-accent-gold)',
            fontWeight: 700,
            fontSize: '0.73rem',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
          }}
        >
          pickflow design system
        </p>
        <h1
          style={{
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '0.55rem',
            fontSize: '2rem',
            lineHeight: 1.2,
          }}
        >
          <Palette size={22} />
          디자인 시스템 페이지
        </h1>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          rotifolk 디자인 페이지처럼 토큰, 타이포, 컴포넌트를 한곳에서 확인하고 바로 참고 가능한 형태의 가이드를 제공합니다.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
          <a
            href="https://rotifolk.vercel.app/design"
            target="_blank"
            rel="noreferrer"
            className="btn-secondary"
            style={{ textDecoration: 'none', padding: '0.65rem 1rem', fontSize: '0.82rem' }}
          >
            <View size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
            rotifolk Design 참고
          </a>
          <button type="button" className="btn-primary" style={{ padding: '0.65rem 1rem', fontSize: '0.82rem' }}>
            <Wand2 size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
            토큰 카탈로그
          </button>
        </div>
      </section>

      <section className="content-card" style={{ padding: '1.2rem', display: 'grid', gap: '0.9rem' }}>
        <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Paintbrush size={18} /> Foundation Tokens
        </h2>
        <div style={{ display: 'grid', gap: '0.7rem' }}>
          {foundationTokens.map((token) => (
            <div
              key={token.token}
              style={{
                border: '1px solid var(--bg-card-border)',
                borderRadius: '12px',
                overflow: 'hidden',
                background: 'var(--bg-card)',
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr' }}>
                <div
                  style={{
                    width: '100%',
                    padding: '0.9rem',
                    backgroundColor: token.sample,
                  }}
                />
                <div style={{ padding: '0.9rem', display: 'grid', gap: '0.3rem' }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{token.token}</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{token.value}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{token.usage}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="content-card" style={{ padding: '1.2rem', display: 'grid', gap: '0.9rem' }}>
        <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Type size={18} /> Typography Scale
        </h2>
        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>
          실제 크기와 라인하이트를 즉시 비교할 수 있도록 샘플 텍스트를 함께 노출합니다.
        </p>
        <div style={{ display: 'grid', gap: '0.55rem' }}>
          {typographyTokens.map((scale) => (
            <div
              key={scale.token}
              style={{
                border: '1px solid var(--bg-card-border)',
                borderRadius: '10px',
                padding: '0.8rem',
                background: 'oklch(16% 0.014 260)',
                display: 'grid',
                gap: '0.5rem',
              }}
            >
              <div
                style={{
                  fontSize: scale.size,
                  lineHeight: scale.lh,
                  fontWeight: scale.weight,
                  color: 'var(--text-primary)',
                }}
              >
                {scale.token} Example
              </div>
              <div
                style={{
                  fontSize: '0.76rem',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                }}
              >
                <span>{scale.usage}</span>
                <span style={{ whiteSpace: 'nowrap' }}>
                  {scale.size} · {scale.weight} · lh {scale.lh}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="content-card" style={{ padding: '1.2rem', display: 'grid', gap: '0.9rem' }}>
        <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Ruler size={18} /> Shape & Shadow
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '0.65rem',
          }}
        >
          {spacingTokens.map((token) => (
            <div
              key={token.token}
              style={{
                border: '1px solid var(--bg-card-border)',
                borderRadius: '10px',
                padding: '0.75rem',
                background: 'var(--bg-card)',
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>{token.token}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.35rem' }}>
                {token.value}
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{token.usage}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="content-card" style={{ padding: '1.2rem', display: 'grid', gap: '0.9rem' }}>
        <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <SlidersHorizontal size={18} /> Component Primitives
        </h2>
        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>
          디자인 토큰 기반 컴포넌트 샘플을 바로 확인하고 문구/크기 조합을 테스트합니다.
        </p>
        <div style={{ display: 'grid', gap: '0.7rem' }}>
          <div style={{ display: 'flex', gap: '0.55rem', flexWrap: 'wrap' }}>
            <button type="button" className="btn-primary" style={{ padding: '0.68rem 1rem' }}>
              Primary
            </button>
            <button type="button" className="btn-secondary" style={{ padding: '0.68rem 1rem' }}>
              Secondary
            </button>
            <button
              type="button"
              className="btn-primary"
              style={{ padding: '0.68rem 1rem', opacity: 0.52 }}
              disabled
            >
              Disabled
            </button>
          </div>
          <input className="form-input" placeholder="아이디 또는 닉네임" />
          <textarea
            className="form-input"
            rows={4}
            placeholder="멀티라인 입력 시 간격과 줄바꿈이 잘 적용되는지 확인해보세요."
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            <StatusPill
              label="Primary"
              textColor="var(--text-primary)"
              bgColor="var(--brand-primary)"
            />
            <StatusPill
              label="Success"
              textColor="var(--text-primary)"
              bgColor="rgba(64, 201, 177, 0.2)"
            />
            <StatusPill
              label="Warn"
              textColor="var(--text-primary)"
              bgColor="rgba(245, 158, 11, 0.22)"
            />
          </div>
        </div>
      </section>

      <section className="content-card" style={{ padding: '1.2rem', display: 'grid', gap: '0.9rem' }}>
        <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Box size={18} /> Token Usage Snippets
        </h2>
        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>
          실제 화면에서 복붙 가능한 최소 예시 코드입니다.
        </p>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {componentSnippets.map((snippet) => (
            <div
              key={snippet.title}
              style={{
                border: '1px solid var(--bg-card-border)',
                borderRadius: '10px',
                padding: '0.75rem',
                background: 'oklch(16% 0.014 260)',
              }}
            >
              <div style={{ marginBottom: '0.45rem', display: 'grid', gap: '0.2rem' }}>
                <div style={{ fontWeight: 700 }}>{snippet.title}</div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                  {snippet.subtitle}
                </div>
              </div>
              <pre
                style={{
                  margin: 0,
                  padding: '0.7rem',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(0,0,0,0.28)',
                  color: 'var(--text-secondary)',
                  fontSize: '0.75rem',
                  overflowX: 'auto',
                }}
              >
                <code>{snippet.code}</code>
              </pre>
            </div>
          ))}
        </div>
      </section>

      <section className="content-card" style={{ padding: '1.2rem', display: 'grid', gap: '0.75rem' }}>
        <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <BoxSelect size={18} /> Layout Pattern
        </h2>
        <div
          style={{
            border: '1px solid var(--bg-card-border)',
            borderRadius: '12px',
            padding: '0.9rem',
            background: 'oklch(16% 0.014 260)',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '220px 1fr',
              gap: '0.6rem',
              marginBottom: '0.6rem',
            }}
          >
            <div
              style={{
                borderRadius: '10px',
                border: '1px dashed var(--bg-card-border)',
                padding: '0.7rem',
              }}
            >
              Sidebar
            </div>
            <div
              style={{
                borderRadius: '10px',
                border: '1px dashed var(--bg-card-border)',
                padding: '0.7rem',
              }}
            >
              Content
            </div>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: '0.6rem',
            }}
          >
            <div
              style={{
                borderRadius: '10px',
                border: '1px dashed var(--bg-card-border)',
                padding: '0.7rem',
              }}
            >
              Card A
            </div>
            <div
              style={{
                borderRadius: '10px',
                border: '1px dashed var(--bg-card-border)',
                padding: '0.7rem',
              }}
            >
              Card B
            </div>
            <div
              style={{
                borderRadius: '10px',
                border: '1px dashed var(--bg-card-border)',
                padding: '0.7rem',
              }}
            >
              Card C
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
