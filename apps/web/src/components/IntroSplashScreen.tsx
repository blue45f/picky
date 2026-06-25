import React, { useEffect, useRef, useState } from 'react';

// 파티클 연출용 난수 — crypto.getRandomValues로 S2245(PRNG) 룰을 충족하고, 미지원 환경에서만 폴백해요.
const secureRandom = () => {
  if ('window' in globalThis && globalThis.crypto) {
    const array = new Uint32Array(1);
    globalThis.crypto.getRandomValues(array);
    return (array[0] ?? 0) / 4294967296; // 2^32 → [0, 1)
  }
  return 0.5;
};

// reduced-motion 사용자는 파티클/CSS 모션을 끄고 정적 스플래시만 보여준다(세션 1회·자동 닫힘은 유지).
const prefersReducedMotion = () =>
  'window' in globalThis &&
  typeof globalThis.matchMedia === 'function' &&
  globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches;

interface SplashParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  char?: string;
  alpha: number;
  rot: number;
  rotSpeed: number;
  decay: number;
}

// 토스 WelcomeSplash와 매칭되는 다채로운 색/이모지 팔레트(다양성 확대).
const PARTICLE_COLORS = [
  '#13c2a3',
  '#2ee0bf',
  '#f4c560',
  '#ffffff',
  '#60a5fa',
  '#f43f5e',
  '#a855f7',
  '#34d399',
  '#fbbf24',
];
const PARTICLE_CHARS = ['🥑', '✨', '✦', '🌟', '💚', '💛', '🔥', '🎉', '💥', '🪩', '💎', '⭐'];

export const IntroSplashScreen: React.FC = () => {
  const [isVisible, setIsVisible] = useState(() => {
    if ('window' in globalThis) {
      return !sessionStorage.getItem('has-seen-picky-intro');
    }
    return true;
  });
  const [reducedMotion] = useState(prefersReducedMotion);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!isVisible) return;

    // 화려한 인트로 — 2.65초 후 사라짐 (토스와 동일하게 주목성 극대화)
    const timer = setTimeout(() => {
      setIsVisible(false);
      sessionStorage.setItem('has-seen-picky-intro', 'true');
    }, 2650);

    return () => clearTimeout(timer);
  }, [isVisible]);

  // 피키 전용 화려 파티클 + 중앙 4단계 버스트 (에메랄드/골드/아보카도)
  useEffect(() => {
    // reduced-motion: 파티클 애니메이션 자체를 건너뛴다.
    if (!isVisible || reducedMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = globalThis.innerWidth);
    let height = (canvas.height = globalThis.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = globalThis.innerWidth;
      height = canvas.height = globalThis.innerHeight;
    };

    globalThis.addEventListener('resize', handleResize);

    const particles: SplashParticle[] = [];

    // 위치/세기를 받아 대폭발 + 중형 반짝이를 쏘는 재사용 버스트(토스 createBurst 이식).
    const createBurst = (cx: number, cy: number, intensity = 1) => {
      const mainCount = Math.floor((110 + secureRandom() * 20) * intensity);
      for (let i = 0; i < mainCount; i++) {
        const angle = secureRandom() * Math.PI * 2;
        const speed = (4.2 + secureRandom() * 15) * intensity;
        particles.push({
          x: cx + (secureRandom() - 0.5) * 22,
          y: cy + (secureRandom() - 0.5) * 14,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - (1.4 + secureRandom() * 4),
          size: 12 + secureRandom() * 24,
          color: PARTICLE_COLORS[Math.floor(secureRandom() * PARTICLE_COLORS.length)] ?? '#13c2a3',
          char:
            secureRandom() > 0.34
              ? (PARTICLE_CHARS[Math.floor(secureRandom() * PARTICLE_CHARS.length)] ?? '✨')
              : undefined,
          alpha: 0.99,
          rot: secureRandom() * Math.PI * 2,
          rotSpeed: (secureRandom() - 0.5) * 0.22,
          decay: 0.011 + secureRandom() * 0.016,
        });
      }
      // 중형 반짝이 + 별
      const sparkleCount = Math.floor(42 * intensity);
      for (let i = 0; i < sparkleCount; i++) {
        const angle = secureRandom() * Math.PI * 2;
        const speed = 2 + secureRandom() * 7.5;
        particles.push({
          x: cx + (secureRandom() - 0.5) * 110,
          y: cy + (secureRandom() - 0.5) * 55,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed * 0.58 - 1.2,
          size: 6 + secureRandom() * 9,
          color: secureRandom() > 0.5 ? '#f4c560' : '#ffffff',
          char: undefined,
          alpha: 0.92,
          rot: 0,
          rotSpeed: (secureRandom() - 0.5) * 0.32,
          decay: 0.019 + secureRandom() * 0.018,
        });
      }
    };

    const draw = () => {
      ctx.fillStyle = '#04120f';
      ctx.fillRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2 - 22;

      // 강한 중앙 글로우
      const glow = ctx.createRadialGradient(centerX, centerY, 18, centerX, centerY, 260);
      glow.addColorStop(0, 'rgba(19, 194, 163, 0.18)');
      glow.addColorStop(0.42, 'rgba(244, 197, 96, 0.07)');
      glow.addColorStop(1, 'rgba(4, 18, 15, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 260, 0, Math.PI * 2);
      ctx.fill();

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        if (!p) continue;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.26;
        p.vx *= 0.975;
        p.vy *= 0.975;
        p.alpha -= p.decay;
        p.rot += p.rotSpeed;

        if (p.alpha <= 0.02) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);

        if (p.char) {
          ctx.font = `${p.size}px Pretendard, system-ui`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(p.char, 0, 0);
        } else {
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

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    const cx = width / 2;
    const cy = height / 2 - 30;

    // 로고 등장과 동기화된 4단계 초강력 버스트 (토스 WelcomeSplash와 동등한 극적 화려함).
    const burst1 = setTimeout(() => createBurst(cx, cy, 1), 260);
    const burst2 = setTimeout(() => createBurst(cx - 140, cy - 58, 0.72), 480);
    const burst3 = setTimeout(() => createBurst(cx + 155, cy - 32, 0.68), 740);
    const burst4 = setTimeout(() => createBurst(cx, cy, 0.55), 1050);

    return () => {
      cancelAnimationFrame(animationFrameId);
      clearTimeout(burst1);
      clearTimeout(burst2);
      clearTimeout(burst3);
      clearTimeout(burst4);
      globalThis.removeEventListener('resize', handleResize);
    };
  }, [isVisible, reducedMotion]);

  if (!isVisible) return null;

  return (
    <div className={`pf-splash-overlay${reducedMotion ? ' pf-splash-reduced' : ''}`}>
      {reducedMotion ? null : <canvas ref={canvasRef} className="pf-splash-canvas" />}

      <div className="pf-splash-content">
        {/* 메인 아보카도 + 강한 다중 글로우 (토스와 동일한 주목성) */}
        <div className="pf-splash-icon-wrap">
          <div className="pf-splash-glow" />
          <div
            style={{
              fontSize: 78,
              lineHeight: 1,
              filter:
                'drop-shadow(0 20px 42px rgba(19,194,163,0.42)) drop-shadow(0 5px 12px rgba(244,197,96,0.3))',
              animation: reducedMotion
                ? undefined
                : 'pf-logo-pop 920ms cubic-bezier(0.175,0.885,0.32,1.275) both',
            }}
          >
            🥑
          </div>
        </div>

        <h1 className="pf-splash-title">피키</h1>
        <p className="pf-splash-subtitle">친구들과 나누는 재미있는 고민 투표 🔥</p>

        <div className="pf-splash-tag">QR 태그로 즉시 참여 · 한 표로 결정 ⚡️</div>
      </div>

      <style>{`
        .pf-splash-overlay {
          position: fixed; inset: 0; z-index: 99999;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          /* 토스 WelcomeSplash 매칭: 반투명 배경 + 28px 블러로 뒤 화면을 부드럽게 가린다. */
          background: rgba(4, 18, 15, 0.92);
          backdrop-filter: blur(28px);
          -webkit-backdrop-filter: blur(28px);
          overflow: hidden;
          user-select: none;
          animation: pf-fadeout 820ms cubic-bezier(0.16,1,0.3,1) 2.35s forwards;
        }

        .pf-splash-canvas { position:absolute; inset:0; pointer-events:none; }
        .pf-splash-content { position:relative; z-index:10; text-align:center; display:flex; flex-direction:column; align-items:center; }
        .pf-splash-icon-wrap {
          position:relative; width:108px; height:108px; display:flex; align-items:center; justify-content:center;
          background: linear-gradient(135deg, rgba(19,194,163,0.1), rgba(4,18,15,0.6));
          border-radius: 999px; border: 1px solid rgba(19,194,163,0.28);
          box-shadow: 0 12px 36px rgba(19,194,163,0.18);
          margin-bottom: 6px;
        }
        .pf-splash-glow {
          position:absolute; inset:-3px; border-radius:999px;
          background: radial-gradient(circle, rgba(19,194,163,0.32) 10%, rgba(244,197,96,0.11) 46%, transparent 75%);
          animation: pf-glow 1.7s ease-in-out infinite alternate;
        }
        .pf-splash-title {
          margin: 10px 0 2px; font-size: 2.25rem; font-weight: 900; letter-spacing: -1.1px;
          background: linear-gradient(135deg, #f4c560 6%, #13c2a3 40%, #2ee0bf 82%, #f4c560 102%);
          background-size: 220% 220%;
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          filter: drop-shadow(0 6px 18px rgba(19,194,163,0.32));
          opacity:0; transform: translateY(8px);
          animation: pf-reveal 720ms cubic-bezier(0.16,1,0.3,1) 280ms forwards, pf-gradient-shift 2.1s linear infinite;
        }
        .pf-splash-subtitle {
          margin: 0; font-size: 13.5px; font-weight: 600; color: #a3b3ad; letter-spacing: -0.1px;
          opacity:0; transform: translateY(6px);
          animation: pf-reveal 720ms cubic-bezier(0.16,1,0.3,1) 460ms forwards;
        }
        .pf-splash-tag {
          margin-top: 12px; font-size: 11px; font-weight: 700; letter-spacing: 1.6px;
          color: #7af0db;
          opacity:0; animation: pf-reveal 580ms ease 820ms forwards;
        }
        @keyframes pf-reveal { to { opacity:1; transform: translateY(0); } }
        @keyframes pf-logo-pop {
          0% { transform: scale(0.42); } 52% { transform: scale(1.08); } 100% { transform: scale(1); }
        }
        @keyframes pf-glow {
          0% { opacity: .6; transform: scale(.94); }
          100% { opacity: .95; transform: scale(1.07); }
        }
        @keyframes pf-gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 120% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes pf-fadeout {
          to { opacity:0; visibility:hidden; filter: blur(10px); }
        }

        /* reduced-motion: 모든 모션을 끄고 즉시 완성된 정적 상태로. 자동 닫힘은 JS 타이머가 담당. */
        .pf-splash-reduced,
        .pf-splash-reduced .pf-splash-glow,
        .pf-splash-reduced .pf-splash-title,
        .pf-splash-reduced .pf-splash-subtitle,
        .pf-splash-reduced .pf-splash-tag {
          animation: none !important;
          opacity: 1 !important;
          transform: none !important;
        }
        @media (prefers-reduced-motion: reduce) {
          .pf-splash-overlay,
          .pf-splash-overlay .pf-splash-glow,
          .pf-splash-overlay .pf-splash-title,
          .pf-splash-overlay .pf-splash-subtitle,
          .pf-splash-overlay .pf-splash-tag {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>
    </div>
  );
};
