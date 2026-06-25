import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Volume2, VolumeX, Music, SkipForward } from 'lucide-react';
import { useSoundSettings } from '../../../../packages/client/src/store/useSoundSettings';

/**
 * 사운드 설정 컨트롤 — Navbar 우측 클러스터에 놓이는 스피커 아이콘 버튼.
 *
 * 누르면 작은 팝오버가 열리고, 그 안에 효과음(SFX) 토글·배경음(BGM) 토글, 그리고 BGM 이
 * 켜져 있을 땐 현재 트랙명과 "다음 곡" 버튼이 표시돼요. 상태는 web/토스 공유 엔진(`lib/audio`)을
 * 구독하는 `useSoundSettings` 훅으로 가져옵니다.
 *
 * 접근성: 트리거는 aria-expanded/aria-haspopup, 각 토글은 role="switch"+aria-checked,
 * ESC·바깥 클릭으로 닫히고 닫힐 때 포커스를 트리거로 되돌려요. 색은 전부 토큰(var(--…))이라
 * 다크/라이트 양쪽에서 정합합니다.
 *
 * 이 컨트롤 자체는 data-no-sound 라 전역 클릭 사운드가 울리지 않아요(토글이 곧 사운드라 중복 방지).
 */
export const SoundSettingsControl: React.FC = () => {
  const { sfxEnabled, setSfxEnabled, bgmEnabled, setBgmEnabled, currentTrackName, nextTrack } =
    useSoundSettings();

  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  const close = useCallback((restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) {
      triggerRef.current?.focus();
    }
  }, []);

  // ESC 로 닫고, 팝오버 바깥을 누르면 닫아요(포커스 복원은 ESC 때만).
  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        close(true);
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        close(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [open, close]);

  // 트리거 아이콘: 둘 다 꺼져 있으면 음소거 표시, 아니면 스피커.
  const anySoundOn = sfxEnabled || bgmEnabled;
  const TriggerIcon = anySoundOn ? Volume2 : VolumeX;
  const triggerLabel = open ? '사운드 설정 닫기' : '사운드 설정 열기';

  return (
    <div ref={rootRef} data-no-sound style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={triggerLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        title="사운드"
        className="nav-icon-btn"
        style={{
          display: 'grid',
          placeItems: 'center',
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          border: open
            ? '1px solid var(--bg-card-border-hover)'
            : '1px solid var(--bg-card-border)',
          backgroundColor: open ? 'var(--bg-card-hover)' : 'var(--bg-card)',
          color: anySoundOn ? 'var(--brand-accent-teal)' : 'var(--text-secondary)',
          cursor: 'pointer',
          boxShadow: 'var(--shadow-sm)',
          transition: 'all 0.2s cubic-bezier(0.25, 1, 0.5, 1)',
          outline: 'none',
        }}
      >
        <TriggerIcon size={16} aria-hidden="true" />
      </button>

      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="사운드 설정"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            zIndex: 60,
            width: '232px',
            display: 'grid',
            gap: '0.55rem',
            padding: '0.85rem',
            borderRadius: '14px',
            border: '1px solid var(--bg-card-border)',
            background:
              'linear-gradient(180deg, color-mix(in oklab, var(--bg-card) 96%, transparent), var(--bg-card))',
            boxShadow: 'var(--shadow-lg, 0 16px 40px rgba(0,0,0,0.32))',
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: '0.66rem',
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
            }}
          >
            사운드
          </p>

          <SoundToggleRow
            icon={sfxEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
            label="효과음"
            hint="버튼·완료 순간 소리"
            checked={sfxEnabled}
            onChange={setSfxEnabled}
          />

          <SoundToggleRow
            icon={<Music size={15} />}
            label="배경음악"
            hint="잔잔한 생성형 BGM"
            checked={bgmEnabled}
            onChange={setBgmEnabled}
          />

          {bgmEnabled ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.5rem',
                marginTop: '0.1rem',
                padding: '0.55rem 0.6rem',
                borderRadius: '10px',
                border: '1px solid rgba(45, 212, 191, 0.22)',
                background: 'rgba(45, 212, 191, 0.06)',
              }}
            >
              <span style={{ display: 'grid', gap: '2px', minWidth: 0 }}>
                <span
                  style={{
                    fontSize: '0.6rem',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    color: 'var(--brand-accent-teal)',
                  }}
                >
                  지금 재생 중
                </span>
                <span
                  aria-live="polite"
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {currentTrackName || '트랙 준비 중…'}
                </span>
              </span>
              <button
                type="button"
                onClick={nextTrack}
                aria-label="다음 곡으로 넘기기"
                title="다음 곡"
                style={{
                  flexShrink: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  border: '1px solid rgba(45, 212, 191, 0.3)',
                  background: 'rgba(45, 212, 191, 0.12)',
                  color: 'var(--brand-accent-teal)',
                  cursor: 'pointer',
                }}
              >
                <SkipForward size={14} aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

interface SoundToggleRowProps {
  icon: React.ReactNode;
  label: string;
  hint: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}

/** 라벨+힌트 좌측, role="switch" 토글 우측인 한 줄. 전체가 하나의 스위치로 동작해요. */
const SoundToggleRow: React.FC<SoundToggleRowProps> = ({
  icon,
  label,
  hint,
  checked,
  onChange,
}) => {
  const labelId = useId();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelId}
      onClick={() => onChange(!checked)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
        width: '100%',
        padding: '0.5rem 0.55rem',
        borderRadius: '10px',
        border: '1px solid var(--bg-card-border)',
        background: checked ? 'rgba(45, 212, 191, 0.06)' : 'var(--bg-card-hover)',
        color: 'var(--text-primary)',
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display: 'grid',
          placeItems: 'center',
          color: checked ? 'var(--brand-accent-teal)' : 'var(--text-muted)',
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <span id={labelId} style={{ display: 'grid', gap: '1px', flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>{label}</span>
        <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>{hint}</span>
      </span>
      <span
        aria-hidden="true"
        style={{
          position: 'relative',
          flexShrink: 0,
          width: '38px',
          height: '22px',
          borderRadius: '999px',
          background: checked ? 'var(--brand-accent-teal)' : 'var(--bg-card-border-hover)',
          transition: 'background 0.18s ease',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: '2px',
            left: checked ? '18px' : '2px',
            width: '18px',
            height: '18px',
            borderRadius: '50%',
            background: '#fff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
            transition: 'left 0.18s cubic-bezier(0.25, 1, 0.5, 1)',
          }}
        />
      </span>
    </button>
  );
};
