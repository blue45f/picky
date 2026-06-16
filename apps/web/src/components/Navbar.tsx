import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Plus } from 'lucide-react';

export const Navbar: React.FC = () => {
  const location = useLocation();

  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backgroundColor: 'rgba(11, 15, 23, 0.75)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--bg-card-border)',
        padding: '0.85rem 1.5rem',
      }}
    >
      <div
        style={{
          maxWidth: '980px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        {/* Logo */}
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            textDecoration: 'none',
          }}
        >
          <span
            style={{
              fontSize: '1.25rem',
              fontWeight: 900,
              color: 'var(--brand-primary)',
              letterSpacing: '-0.03em',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            🗳️ pickflow
          </span>
          <span
            style={{
              fontSize: '0.65rem',
              backgroundColor: 'rgba(99, 102, 241, 0.15)',
              color: 'var(--brand-primary-light)',
              padding: '2px 6px',
              borderRadius: '4px',
              fontWeight: 700,
              letterSpacing: '0.05em',
            }}
          >
            BETA
          </span>
        </Link>

        {/* Navigation Action Buttons */}
        <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
          <Link
            to="/"
            style={{
              textDecoration: 'none',
              color: location.pathname === '/' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: location.pathname === '/' ? 700 : 500,
              fontSize: '0.85rem',
              transition: 'color 0.2s',
            }}
          >
            고민 둘러보기
          </Link>
          <Link
            to="/create"
            className="btn-primary"
            style={{
              textDecoration: 'none',
              padding: '8px 16px',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Plus size={14} />
            <span>새 고민 작성</span>
          </Link>
        </div>
      </div>
    </nav>
  );
};
