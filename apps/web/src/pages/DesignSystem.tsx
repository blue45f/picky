import React from 'react';
import {
  Box,
  BoxSelect,
  CircleHelp,
  CircleSlash2,
  Paintbrush,
  Palette,
  Ruler,
  SlidersHorizontal,
  Type,
  View,
  Wand2,
} from 'lucide-react';

const colorTokens = [
  {
    name: 'bg-main',
    token: '--bg-main',
    value: 'oklch(14% 0.015 260)',
    role: '페이지 배경',
    sample: 'var(--bg-main)',
  },
  {
    name: 'bg-card',
    token: '--bg-card',
    value: 'oklch(18% 0.02 260)',
    role: '기본 카드 배경',
    sample: 'var(--bg-card)',
  },
  {
    name: 'brand-primary',
    token: '--brand-primary',
    value: 'oklch(62% 0.18 260)',
    role: '주요 액션',
    sample: 'var(--brand-primary)',
  },
  {
    name: 'brand-primary-light',
    token: '--brand-primary-light',
    value: 'oklch(75% 0.12 260)',
    role: '호버/강조',
    sample: 'var(--brand-primary-light)',
  },
  {
    name: 'brand-accent-gold',
    token: '--brand-accent-gold',
    value: 'oklch(78% 0.14 85)',
    role: '알림/하이라이트',
    sample: 'var(--brand-accent-gold)',
  },
  {
    name: 'brand-accent-teal',
    token: '--brand-accent-teal',
    value: 'oklch(72% 0.15 170)',
    role: '성공/정보',
    sample: 'var(--brand-accent-teal)',
  },
  {
    name: 'brand-accent-coral',
    token: '--brand-accent-coral',
    value: 'oklch(64% 0.18 25)',
    role: '경고/오류',
    sample: 'var(--brand-accent-coral)',
  },
];

const typographyTokens = [
  { name: 'Display', size: '2.5rem', weight: 900, lineHeight: '1.1', desc: '전면 타이틀' },
  { name: 'Heading 1', size: '1.9rem', weight: 800, lineHeight: '1.25', desc: '섹션 타이틀' },
  { name: 'Heading 2', size: '1.3rem', weight: 700, lineHeight: '1.35', desc: '카드 헤더' },
  { name: 'Body', size: '0.95rem', weight: 400, lineHeight: '1.6', desc: '본문 기본 텍스트' },
  { name: 'Caption', size: '0.75rem', weight: 500, lineHeight: '1.3', desc: '메타/캡션' },
];

const spacingScale = [
  { label: 'x0', px: '2px', usage: '보더/세부 간격' },
  { label: 'x1', px: '4px', usage: '버튼 내부 패딩' },
  { label: 'x2', px: '8px', usage: '작은 칩/배지' },
  { label: 'x3', px: '12px', usage: '입력폼 간격' },
  { label: 'x4', px: '16px', usage: '카드 패딩 기준' },
  { label: 'x6', px: '24px', usage: '섹션 간 마진' },
  { label: 'x8', px: '32px', usage: '타이포/카드 간 여백' },
];

export const DesignSystem: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <section style={{ display: 'grid', gap: '1rem' }}>
        <p
          style={{
            color: 'var(--brand-accent-gold)',
            fontWeight: 700,
            fontSize: '0.75rem',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
          }}
        >
          pickflow design system
        </p>
        <div
          className="content-card"
          style={{ padding: '1.4rem', display: 'grid', gap: '0.85rem' }}
        >
          <h1
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.55rem',
              color: 'var(--text-primary)',
              fontSize: '2rem',
              margin: 0,
            }}
          >
            <Palette size={22} /> 디자인 시스템 실험실
          </h1>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            색상·타이포·간격·컴포넌트를 한 곳에서 점검하고, 실제 서비스 스타일 토큰과 바로 비교할 수
            있는 페이지입니다.
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
              레퍼런스: rotifolk.design
            </a>
            <button
              type="button"
              className="btn-primary"
              style={{ padding: '0.65rem 1rem', fontSize: '0.82rem' }}
            >
              <Wand2 size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
              토큰 카탈로그 시작
            </button>
          </div>
        </div>
      </section>

      <section className="content-card" style={{ padding: '1.2rem', display: 'grid', gap: '1rem' }}>
        <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Paintbrush size={18} /> Color Tokens
        </h2>
        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>
          CSS 변수 기반 팔레트로 UI 전체 스타일을 통제합니다. 컬러칩 색상은 실제 변수값으로
          노출됩니다.
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
            gap: '0.9rem',
          }}
        >
          {colorTokens.map((token) => (
            <div
              key={token.token}
              style={{
                border: '1px solid var(--bg-card-border)',
                borderRadius: '12px',
                overflow: 'hidden',
                background: 'var(--bg-card)',
              }}
            >
              <div style={{ height: '64px', backgroundColor: token.sample }} />
              <div style={{ padding: '0.75rem' }}>
                <div style={{ fontWeight: 700, marginBottom: '4px', color: 'var(--text-primary)' }}>
                  {token.name}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  CSS: {token.token}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{token.value}</div>
                <div
                  style={{
                    marginTop: '0.45rem',
                    fontSize: '0.74rem',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {token.role}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="content-card" style={{ padding: '1.2rem', display: 'grid', gap: '1rem' }}>
        <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Type size={18} /> Typography
        </h2>
        <div style={{ display: 'grid', gap: '0.9rem' }}>
          {typographyTokens.map((typography) => (
            <div
              key={typography.name}
              style={{
                border: '1px solid var(--bg-card-border)',
                borderRadius: '10px',
                padding: '0.8rem',
                background: 'oklch(16% 0.014 260)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '1rem',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: typography.size,
                    lineHeight: typography.lineHeight,
                    fontWeight: typography.weight,
                  }}
                >
                  {typography.name} Token
                </div>
                <div
                  style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}
                >
                  {typography.desc}
                </div>
              </div>
              <div
                style={{
                  fontSize: '0.78rem',
                  color: 'var(--text-muted)',
                  border: '1px dashed var(--bg-card-border)',
                  padding: '6px 10px',
                  borderRadius: '8px',
                  whiteSpace: 'nowrap',
                }}
              >
                size {typography.size} / weight {typography.weight} / lh {typography.lineHeight}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="content-card" style={{ padding: '1.2rem', display: 'grid', gap: '1rem' }}>
        <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <SlidersHorizontal size={18} /> Spacing & Radii
        </h2>
        <div
          style={{
            display: 'grid',
            gap: '0.9rem',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          }}
        >
          {spacingScale.map((spacing) => (
            <div
              key={spacing.label}
              style={{
                border: '1px solid var(--bg-card-border)',
                borderRadius: '10px',
                padding: '0.8rem',
              }}
            >
              <div style={{ fontWeight: 700 }}>{spacing.label}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.2rem 0' }}>
                {spacing.px}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {spacing.usage}
              </div>
              <div style={{ marginTop: '0.55rem' }}>
                <div
                  style={{
                    width: '100%',
                    height: '6px',
                    borderRadius: Number.parseInt(spacing.px) / 2,
                    backgroundColor: 'var(--brand-primary)',
                    opacity: 0.72,
                  }}
                />
              </div>
            </div>
          ))}
          <div
            style={{
              gridColumn: '1 / -1',
              display: 'flex',
              alignItems: 'center',
              gap: '0.7rem',
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                fontSize: '0.88rem',
                color: 'var(--text-secondary)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <Ruler size={14} /> radius
            </span>
            <span
              style={{
                background: 'var(--bg-card-hover)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.4rem 0.65rem',
                fontSize: '0.76rem',
              }}
            >
              sm
            </span>
            <span
              style={{
                background: 'var(--bg-card-hover)',
                borderRadius: 'var(--radius-md)',
                padding: '0.4rem 0.65rem',
                fontSize: '0.76rem',
              }}
            >
              md
            </span>
            <span
              style={{
                background: 'var(--bg-card-hover)',
                borderRadius: 'var(--radius-lg)',
                padding: '0.4rem 0.65rem',
                fontSize: '0.76rem',
              }}
            >
              lg
            </span>
          </div>
        </div>
      </section>

      <section className="content-card" style={{ padding: '1.2rem', display: 'grid', gap: '1rem' }}>
        <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Box size={18} /> Component Primitives
        </h2>
        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>
          페이지에서 자주 쓰이는 기본 컴포넌트들의 실제 스타일을 즉시 확인합니다.
        </p>
        <div style={{ display: 'grid', gap: '0.8rem' }}>
          <div style={{ display: 'flex', gap: '0.55rem', flexWrap: 'wrap' }}>
            <button type="button" className="btn-primary" style={{ padding: '0.68rem 1rem' }}>
              Primary Button
            </button>
            <button type="button" className="btn-secondary" style={{ padding: '0.68rem 1rem' }}>
              Secondary Button
            </button>
            <button
              type="button"
              className="btn-primary"
              style={{ padding: '0.68rem 1rem', opacity: 0.55 }}
              disabled
            >
              Disabled
            </button>
          </div>
          <input className="form-input" placeholder="폼 입력 샘플" />
          <textarea
            className="form-input"
            rows={4}
            placeholder="멀티라인 샘플. 텍스트가 길어질 때 높이와 여백 변화를 확인하세요."
          />
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: '0.72rem',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '999px',
                padding: '0.35rem 0.75rem',
              }}
            >
              chip
            </span>
            <span
              style={{
                fontSize: '0.72rem',
                borderRadius: '999px',
                padding: '0.35rem 0.75rem',
                backgroundColor: 'var(--brand-primary)',
                color: 'white',
              }}
            >
              filled chip
            </span>
            <span
              style={{
                fontSize: '0.72rem',
                borderRadius: '999px',
                padding: '0.35rem 0.75rem',
                border: '1px solid var(--bg-card-border-hover)',
              }}
            >
              outline chip
            </span>
          </div>
        </div>
      </section>

      <section
        className="content-card"
        style={{ padding: '1.2rem', display: 'grid', gap: '0.75rem' }}
      >
        <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <BoxSelect size={18} /> Layout Patterns
        </h2>
        <div
          style={{
            border: '1px solid var(--bg-card-border)',
            borderRadius: '12px',
            padding: '0.9rem',
            background: 'oklch(16% 0.014 260)',
          }}
        >
          <div style={{ display: 'grid', gap: '0.6rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.6rem' }}>
              <div
                style={{
                  padding: '0.7rem',
                  borderRadius: '10px',
                  border: '1px dashed var(--bg-card-border)',
                }}
              >
                sidebar
              </div>
              <div
                style={{
                  padding: '0.7rem',
                  borderRadius: '10px',
                  border: '1px dashed var(--bg-card-border)',
                }}
              >
                content
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem' }}>
              <div
                style={{
                  padding: '0.7rem',
                  borderRadius: '10px',
                  border: '1px dashed var(--bg-card-border)',
                }}
              >
                card
              </div>
              <div
                style={{
                  padding: '0.7rem',
                  borderRadius: '10px',
                  border: '1px dashed var(--bg-card-border)',
                }}
              >
                card
              </div>
              <div
                style={{
                  padding: '0.7rem',
                  borderRadius: '10px',
                  border: '1px dashed var(--bg-card-border)',
                }}
              >
                card
              </div>
            </div>
          </div>
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <CircleHelp size={14} style={{ marginRight: '0.35rem', verticalAlign: 'middle' }} />
          그리드, gap, radius, padding이 실제 화면에서 어떻게 누적되는지 확인할 수 있는 최소
          예시입니다.
        </div>
      </section>

      <section
        className="content-card"
        style={{ padding: '1.2rem', display: 'grid', gap: '0.75rem' }}
      >
        <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CircleSlash2 size={18} /> 상태 표기
        </h2>
        <div
          style={{
            display: 'grid',
            gap: '0.6rem',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          }}
        >
          <p
            style={{
              margin: 0,
              padding: '0.7rem',
              borderRadius: '10px',
              background: 'rgba(99,102,241,0.1)',
              border: '1px solid rgba(99,102,241,0.2)',
            }}
          >
            ✅ Success
          </p>
          <p
            style={{
              margin: 0,
              padding: '0.7rem',
              borderRadius: '10px',
              background: 'rgba(255,165,0,0.08)',
              border: '1px solid rgba(255,165,0,0.25)',
            }}
          >
            ⚠ Warning
          </p>
          <p
            style={{
              margin: 0,
              padding: '0.7rem',
              borderRadius: '10px',
              background: 'rgba(255,84,84,0.08)',
              border: '1px solid rgba(255,84,84,0.25)',
            }}
          >
            🚫 Error
          </p>
        </div>
      </section>
    </div>
  );
};
