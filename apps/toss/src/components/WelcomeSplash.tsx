import { useEffect, useRef, useState } from 'react';
import { theme } from '../theme';
import { hapticFeedback } from '../lib/toss';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  char?: string;
  alpha: number;
  rotation: number;
  rotationSpeed: number;
  decay: number;
}

// 파티클 연출용 난수 — crypto.getRandomValues로 S2245(PRNG) 룰을 충족하고, 미지원 환경에서만 폴백해요.
const secureRandom = () => {
  if (typeof window !== 'undefined' && window.crypto) {
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    return (array[0] ?? 0) / 4294967296; // 2^32 → [0, 1)
  }
  return 0.5;
};

export function WelcomeSplash({ forceVisible = false }: { forceVisible?: boolean } = {}) {
  const [visible, setVisible] = useState(forceVisible);
  const [fadeOut, setFadeOut] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    if (forceVisible) {
      setVisible(true);
      return; // for verif/static preview: stay visible, no auto-dismiss or session
    }

    // 세션당 한 번만 보여주기
    const shown = sessionStorage.getItem('pf_welcome_splash_shown');
    if (shown === 'true') {
      return;
    }

    setVisible(true);
    // Haptic feedback
    hapticFeedback('tickWeak');

    // 더 오래 머물며 주목받게: 2.1s 후 fade, 2.6s 후 완전 제거 (화려함 극대화)
    const fadeTimer = setTimeout(() => {
      setFadeOut(true);
    }, 2100);

    const removeTimer = setTimeout(() => {
      setVisible(false);
      sessionStorage.setItem('pf_welcome_splash_shown', 'true');
    }, 2600);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [forceVisible]);

  useEffect(() => {
    if (!visible || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    // 파티클 생성 함수 — 극대화된 화려함: 4단계 폭발 + 대량 파티클 + 이모지 폭우
    const createBurst = (cx: number, cy: number, intensity = 1) => {
      const particles: Particle[] = [];
      const colors = [
        theme.accent,
        theme.accentStrong,
        theme.gold,
        '#ffffff',
        '#60a5fa',
        '#f43f5e',
        '#a855f7',
        '#34d399',
        '#fbbf24',
      ];
      const chars = ['🥑', '✨', '✦', '🌟', '💚', '💛', '🔥', '🎉', '💥', '🪩', '💎', '⭐'];

      // 메인 대폭발: 110~130개
      const count = Math.floor(110 + secureRandom() * 20) * intensity;
      for (let i = 0; i < count; i++) {
        const angle = secureRandom() * Math.PI * 2;
        const speed = (4.2 + secureRandom() * 15) * intensity;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed - (1.4 + secureRandom() * 4);
        const size = 12 + secureRandom() * 24;
        const color = colors[Math.floor(secureRandom() * colors.length)];
        const char =
          secureRandom() > 0.34 ? chars[Math.floor(secureRandom() * chars.length)] : undefined;

        particles.push({
          x: cx + (secureRandom() - 0.5) * 22,
          y: cy + (secureRandom() - 0.5) * 14,
          vx,
          vy,
          size,
          color,
          char,
          alpha: 0.99,
          rotation: secureRandom() * Math.PI * 2,
          rotationSpeed: (secureRandom() - 0.5) * 0.22,
          decay: 0.011 + secureRandom() * 0.016,
        });
      }
      // 중형 반짝이 + 별
      for (let i = 0; i < 42 * intensity; i++) {
        const angle = secureRandom() * Math.PI * 2;
        const speed = 2 + secureRandom() * 7.5;
        particles.push({
          x: cx + (secureRandom() - 0.5) * 110,
          y: cy + (secureRandom() - 0.5) * 55,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed * 0.58 - 1.2,
          size: 6 + secureRandom() * 9,
          color: secureRandom() > 0.5 ? theme.gold : '#ffffff',
          char: undefined,
          alpha: 0.92,
          rotation: 0,
          rotationSpeed: (secureRandom() - 0.5) * 0.32,
          decay: 0.019 + secureRandom() * 0.018,
        });
      }
      particlesRef.current =
        particlesRef.current.length > 0 ? [...particlesRef.current, ...particles] : particles;
    };

    // 로고 등장과 동기화된 4단계 초강력 버스트
    const burstTimeout = setTimeout(() => {
      createBurst(window.innerWidth / 2, window.innerHeight / 2 - 42, 1.0);
      hapticFeedback('success');
    }, 260);

    const burst2 = setTimeout(() => {
      createBurst(window.innerWidth / 2 - 140, window.innerHeight / 2 - 88, 0.72);
    }, 480);
    const burst3 = setTimeout(() => {
      createBurst(window.innerWidth / 2 + 155, window.innerHeight / 2 - 62, 0.68);
      hapticFeedback('tickWeak');
    }, 740);
    const burst4 = setTimeout(() => {
      createBurst(window.innerWidth / 2, window.innerHeight / 2 - 30, 0.55);
    }, 1050);

    // 애니메이션 루프
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const particles = particlesRef.current;

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];

        // 이동 및 물리연산
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.26;
        p.vx *= 0.975;
        p.vy *= 0.975;
        p.alpha -= p.decay;
        p.rotation += p.rotationSpeed;

        if (p.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);

        if (p.char) {
          ctx.font = `${p.size}px Pretendard, system-ui`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(p.char, 0, 0);
        } else {
          // 귀여운 사각형/원형 색종이 조각 + 별 반짝
          ctx.fillStyle = p.color;
          if (i % 3 === 0) {
            ctx.beginPath();
            ctx.arc(0, 0, p.size / 2.8, 0, Math.PI * 2);
            ctx.fill();
          } else if (i % 3 === 1) {
            ctx.fillRect(-p.size / 3.5, -p.size / 3.5, p.size / 1.75, p.size / 1.75);
          } else {
            // 얇은 다이아 반짝이
            ctx.beginPath();
            ctx.moveTo(0, -p.size / 2.2);
            ctx.lineTo(p.size / 3, 0);
            ctx.lineTo(0, p.size / 2.2);
            ctx.lineTo(-p.size / 3, 0);
            ctx.closePath();
            ctx.fill();
          }
        }
        ctx.restore();
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(burstTimeout);
      clearTimeout(burst2);
      clearTimeout(burst3);
      clearTimeout(burst4);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(4, 14, 12, 0.92)',
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'opacity 0.45s cubic-bezier(0.25, 1, 0.5, 1)',
        opacity: fadeOut ? 0 : 1,
        pointerEvents: fadeOut ? 'none' : 'auto',
      }}
    >
      {/* 배경 글로우 링 — 극적인 주목성 */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '46%',
          transform: 'translate(-50%, -50%)',
          width: 238,
          height: 238,
          borderRadius: '999px',
          background:
            'radial-gradient(circle, rgba(19,194,163,0.22) 0%, rgba(244,197,96,0.09) 38%, rgba(0,0,0,0) 70%)',
          zIndex: 0,
          animation: 'pf-glow-pulse 1.65s ease-in-out infinite alternate',
          pointerEvents: 'none',
        }}
      />

      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
          zIndex: 2,
          textAlign: 'center',
          animation: 'pf-splash-pop 1.05s cubic-bezier(0.175, 0.885, 0.32, 1.275) both',
        }}
      >
        {/* 메인 아바타: 더 크고 강한 그림자 + 펄스 + 링 */}
        <div style={{ position: 'relative' }}>
          <div
            style={{
              position: 'absolute',
              inset: -22,
              borderRadius: '999px',
              background:
                'radial-gradient(circle, rgba(19,194,163,0.25) 10%, rgba(244,197,96,0.12) 42%, transparent 70%)',
              animation: 'pf-glow-pulse 1.6s ease-in-out infinite alternate',
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              fontSize: 92,
              filter:
                'drop-shadow(0 20px 40px rgba(19, 194, 163, 0.42)) drop-shadow(0 6px 14px rgba(244,197,96,0.3))',
              animation:
                'pf-avatar-float 1.9s ease-in-out infinite alternate, pf-logo-pop 1.05s cubic-bezier(0.175,0.885,0.32,1.275) both',
              lineHeight: 1,
            }}
          >
            🥑
          </div>
        </div>

        <div>
          <h1
            style={{
              fontSize: 32,
              fontWeight: 900,
              letterSpacing: '-1.2px',
              margin: 0,
              background:
                'linear-gradient(135deg, #f4c560 6%, #13c2a3 42%, #2ee0bf 78%, #f4c560 102%)',
              backgroundSize: '220% 220%',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 8px 22px rgba(19, 194, 163, 0.32))',
              animation: 'pf-gradient-shift 2.1s linear infinite',
            }}
          >
            픽플로우
          </h1>
          <p
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: theme.textMuted,
              marginTop: 10,
              opacity: 0.97,
              letterSpacing: '-0.2px',
            }}
          >
            친구들과 나누는 재미있는 고민 투표 🔥
          </p>
          {/* 주목성 보조 태그라인 — QR 강조 */}
          <div
            style={{
              marginTop: 6,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '2.2px',
              color: theme.accent,
              opacity: 0.85,
            }}
          >
            QR 태그로 즉시 참여 · 한 표로 결정
          </div>
        </div>

        {/* 화려한 스파클 장식 */}
        <div style={{ position: 'relative', width: 140, height: 2, marginTop: -2 }}>
          <span className="splash-sparkle" style={{ left: -24, top: -12, animationDelay: '120ms' }}>
            ✦
          </span>
          <span
            className="splash-sparkle"
            style={{ right: -28, top: 3, animationDelay: '480ms', fontSize: 12 }}
          >
            ✨
          </span>
          <span
            className="splash-sparkle"
            style={{ left: 46, top: -16, animationDelay: '820ms', fontSize: 11 }}
          >
            🌟
          </span>
        </div>
      </div>

      <style>{`
        @keyframes pf-splash-pop {
          0% { transform: scale(0.58); opacity: 0; }
          38% { transform: scale(1.12); opacity: 1; }
          58% { transform: scale(0.95); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes pf-avatar-float {
          0% { transform: translateY(0) rotate(-4deg); }
          100% { transform: translateY(-10px) rotate(4deg); }
        }
        @keyframes pf-logo-pop {
          0% { transform: scale(0.4); }
          50% { transform: scale(1.06); }
          100% { transform: scale(1); }
        }
        @keyframes pf-gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 120% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes pf-glow-pulse {
          0% { transform: translate(-50%, -50%) scale(0.92); opacity: 0.65; }
          100% { transform: translate(-50%, -50%) scale(1.12); opacity: 0.95; }
        }
        .splash-sparkle {
          position: absolute;
          color: #f4c560;
          font-size: 13px;
          animation: pf-sparkle 1.4s ease-in-out infinite;
          pointer-events: none;
          text-shadow: 0 0 6px rgba(244,197,96,0.6);
        }
        @keyframes pf-sparkle {
          0%, 100% { transform: scale(0.3) rotate(0deg); opacity: 0; }
          45% { transform: scale(1.35) rotate(22deg); opacity: 1; }
          70% { transform: scale(0.9) rotate(-12deg); opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}
