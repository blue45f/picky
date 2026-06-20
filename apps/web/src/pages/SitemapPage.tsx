import React from 'react';
import { Link } from 'react-router-dom';

const routes = [
  { to: '/', label: '고민 목록', helper: '투표와 고민을 둘러보는 홈' },
  { to: '/create', label: '새 고민 작성', helper: '새 투표와 공유 링크 만들기' },
  { to: '/poll/:id', label: '투표 상세', helper: '투표 참여, 결과, 발표 모드' },
  { to: '/share/:id', label: '공유 리다이렉트', helper: '공유 URL 호환 경로' },
  { to: '/embed/:id', label: '임베드', helper: '외부 페이지 삽입용 투표' },
  { to: '/present/:id', label: '발표 모드', helper: '스크린 공유용 결과 보기' },
  { to: '/auth/login', label: '로그인', helper: '회원 로그인' },
  { to: '/auth/signup', label: '회원가입', helper: '새 계정 만들기' },
  { to: '/design', label: '디자인 시스템', helper: '토큰과 컴포넌트 스타일가이드' },
] as const;

export const SitemapPage: React.FC = () => (
  <section style={{ maxWidth: '980px', margin: '0 auto', padding: '2.5rem 1rem' }}>
    <div
      style={{
        border: '1px solid var(--bg-card-border)',
        borderRadius: '14px',
        background: 'var(--bg-card)',
        padding: '1.5rem',
        marginBottom: '1rem',
      }}
    >
      <p
        style={{
          margin: 0,
          color: 'var(--brand-accent-gold)',
          fontSize: '0.72rem',
          fontWeight: 800,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        BETA Sitemap
      </p>
      <h1 style={{ margin: '0.4rem 0 0.5rem' }}>pickflow 사이트맵</h1>
      <p style={{ color: 'var(--text-muted)', lineHeight: 1.7 }}>
        고민 목록, 작성, 투표, 공유, 디자인 시스템까지 주요 경로를 한 화면에 정리했습니다.
      </p>
    </div>

    <div
      style={{
        display: 'grid',
        gap: '0.75rem',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
      }}
    >
      {routes.map((route) => (
        <Link
          key={route.to}
          to={route.to}
          style={{
            display: 'grid',
            gap: '0.45rem',
            minHeight: '8rem',
            padding: '1rem',
            border: '1px solid var(--bg-card-border)',
            borderRadius: '12px',
            background: 'rgba(255,255,255,0.03)',
            color: 'inherit',
            textDecoration: 'none',
          }}
        >
          <strong>{route.label}</strong>
          <small style={{ color: 'var(--text-muted)', lineHeight: 1.55 }}>{route.helper}</small>
          <code
            style={{ color: 'var(--text-muted)', fontSize: '0.75rem', overflowWrap: 'anywhere' }}
          >
            {route.to}
          </code>
        </Link>
      ))}
    </div>
  </section>
);
