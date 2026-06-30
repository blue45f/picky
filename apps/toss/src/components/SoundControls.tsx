/**
 * 사운드 설정 — 효과음(SFX) · 배경음악(BGM) · 다음 곡 전환 컨트롤.
 *
 * 통합 오디오 엔진(packages/client `lib/audio`)을 `useSoundSettings` 훅으로 소비해요.
 * - BGM ON 토글이 사용자 제스처라, 그 순간 AudioContext 가 언락되고 첫 트랙이 즉시 재생돼요.
 * - 다크 내비바 대비를 확보(에메랄드/골드 토큰)하고, 라벨-가시텍스트를 일치시켰어요(WCAG 2.5.3).
 * - 사운드 자체에 `[data-no-sound]` 를 달아, 토글을 누를 때 전역 클릭 'tap' 이 겹쳐 울리지 않게 해요.
 */
import { theme, FONT } from '../theme';
import { useSoundSettings } from '../lib/sound';
import { hapticFeedback } from '../lib/toss';
import { useState } from 'react';
import { requestPushAgreement } from '../lib/notifications';

const toggleStyle = (active: boolean): React.CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  minHeight: 36,
  padding: '6px 12px',
  borderRadius: theme.radiusPill,
  border: `1px solid ${active ? theme.accent : theme.border}`,
  background: active ? theme.accentSoft : 'rgba(255,255,255,0.04)',
  color: active ? theme.accentStrong : theme.textMuted,
  fontSize: FONT.small,
  fontWeight: 700,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
});

/** 헤더/설정 영역에 놓는 사운드 컨트롤 묶음. */
export function SoundControls() {
  const { sfxEnabled, setSfxEnabled, bgmEnabled, setBgmEnabled, currentTrackName, nextTrack } =
    useSoundSettings();

  const [pushAgreed, setPushAgreed] = useState(() => {
    try {
      return localStorage.getItem('picky_toss_push_agreed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleSfx = () => {
    const next = !sfxEnabled;
    setSfxEnabled(next);
    // 끄는 순간엔 소리를 내지 않으려고, 켤 때만 가벼운 햅틱.
    if (next) {
      hapticFeedback('tickWeak');
    }
  };

  const toggleBgm = () => {
    const next = !bgmEnabled;
    setBgmEnabled(next); // ON 이면 엔진이 컨텍스트 언락 + 첫 트랙 즉시 재생.
    hapticFeedback('tickWeak');
  };

  const skipTrack = () => {
    nextTrack();
    hapticFeedback('tickWeak');
  };

  const handlePushAgreement = async () => {
    hapticFeedback('tickWeak');
    const templateCode =
      import.meta.env.VITE_TOSS_NOTIFICATION_TEMPLATE_CODE || 'ALERT_OTP_TEMPLATE';
    const res = await requestPushAgreement(templateCode);
    if (res === 'agree') {
      setPushAgreed(true);
      try {
        localStorage.setItem('picky_toss_push_agreed', 'true');
      } catch {
        // ignore
      }
    } else if (res === 'reject') {
      setPushAgreed(false);
      try {
        localStorage.setItem('picky_toss_push_agreed', 'false');
      } catch {
        // ignore
      }
    }
  };

  return (
    <div
      role="group"
      aria-label="서비스 설정"
      data-no-sound
      style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}
    >
      <button
        type="button"
        className="pressable"
        aria-pressed={sfxEnabled}
        aria-label={sfxEnabled ? '효과음 끄기' : '효과음 켜기'}
        onClick={toggleSfx}
        style={toggleStyle(sfxEnabled)}
      >
        <span aria-hidden>{sfxEnabled ? '🔊' : '🔈'}</span>
        <span>효과음</span>
      </button>

      <button
        type="button"
        className="pressable"
        aria-pressed={bgmEnabled}
        aria-label={bgmEnabled ? '배경음악 끄기' : '배경음악 켜기'}
        onClick={toggleBgm}
        style={toggleStyle(bgmEnabled)}
      >
        <span aria-hidden>{bgmEnabled ? '🎵' : '🎧'}</span>
        <span>배경음악</span>
      </button>

      <button
        type="button"
        className="pressable"
        aria-pressed={pushAgreed}
        aria-label={pushAgreed ? '알림 끄기' : '알림 받기'}
        onClick={handlePushAgreement}
        style={toggleStyle(pushAgreed)}
      >
        <span aria-hidden>{pushAgreed ? '🔔' : '🔕'}</span>
        <span>알림 받기</span>
      </button>

      {bgmEnabled ? (
        <button
          type="button"
          className="pressable"
          aria-label={currentTrackName ? `다음 곡으로 (현재 ${currentTrackName})` : '다음 곡으로'}
          onClick={skipTrack}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            minHeight: 36,
            padding: '6px 12px',
            borderRadius: theme.radiusPill,
            border: `1px solid ${theme.gold}55`,
            background: theme.goldSoft,
            color: theme.gold,
            fontSize: FONT.small,
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            maxWidth: 180,
          }}
        >
          <span aria-hidden>⏭️</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {currentTrackName || '다음 곡'}
          </span>
        </button>
      ) : null}
    </div>
  );
}
