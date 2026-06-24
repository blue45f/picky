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

export const IntroSplashScreen: React.FC = () => {
  const [isVisible, setIsVisible] = useState(() => {
    if ('window' in globalThis) {
      return !sessionStorage.getItem('has-seen-picky-intro');
    }
    return true;
  });

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

  // 피키 전용 화려 파티클 + 중앙 버스트 (에메랄드/골드/아보카도)
  useEffect(() => {
    if (!isVisible) return;

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

    const particles: Array<{
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
    }> = [];

    const colors = ['#13c2a3', '#2ee0bf', '#f4c560', '#ffffff', '#60a5fa'];
    const chars = ['🥑', '✨', '✦', '🌟', '💚'];

    const cx = width / 2;
    const cy = height / 2 - 30;

    // 초기 초강력 중앙 버스트 (토스 스플래시와 매칭되는 고글램)
    for (let i = 0; i < 120; i++) {
      const angle = secureRandom() * Math.PI * 2;
      const speed = 3.6 + secureRandom() * 14;
      particles.push({
        x: cx + (secureRandom() - 0.5) * 26,
        y: cy + (secureRandom() - 0.5) * 16,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (1 + secureRandom() * 3),
        size: 11 + secureRandom() * 21,
        color: colors[Math.floor(secureRandom() * colors.length)] ?? '#13c2a3',
        char:
          secureRandom() > 0.33
            ? (chars[Math.floor(secureRandom() * chars.length)] ?? '✨')
            : undefined,
        alpha: 0.98,
        rot: secureRandom() * Math.PI * 2,
        rotSpeed: (secureRandom() - 0.5) * 0.2,
        decay: 0.011 + secureRandom() * 0.015,
      });
    }

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
        p.vy += 0.23;
        p.vx *= 0.977;
        p.vy *= 0.977;
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
            ctx.arc(0, 0, p.size / 3.1, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.fillRect(-p.size / 4.5, -p.size / 4.5, p.size / 2.25, p.size / 2.25);
          }
        }
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    // 2~3차 강력 보조 버스트 (토스와 동등한 극적 화려함)
    const extra = setTimeout(() => {
      for (let i = 0; i < 52; i++) {
        const angle = secureRandom() * Math.PI * 2;
        const speed = 2.2 + secureRandom() * 7;
        particles.push({
          x: cx + (secureRandom() - 0.5) * 160,
          y: cy + (secureRandom() - 0.5) * 70,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed * 0.62 - 1.3,
          size: 7 + secureRandom() * 10,
          color: secureRandom() > 0.48 ? '#f4c560' : '#13c2a3',
          char: undefined,
          alpha: 0.9,
          rot: 0,
          rotSpeed: (secureRandom() - 0.5) * 0.28,
          decay: 0.021 + secureRandom() * 0.016,
        });
      }
    }, 380);

    const extra2 = setTimeout(() => {
      for (let i = 0; i < 28; i++) {
        const angle = secureRandom() * Math.PI * 2;
        const speed = 1.8 + secureRandom() * 4.5;
        particles.push({
          x: cx + (secureRandom() - 0.5) * 90,
          y: cy + (secureRandom() - 0.5) * 40,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed * 0.5 - 0.9,
          size: 5 + secureRandom() * 7,
          color: '#fff',
          char: undefined,
          alpha: 0.82,
          rot: 0,
          rotSpeed: (secureRandom() - 0.5) * 0.35,
          decay: 0.028 + secureRandom() * 0.01,
        });
      }
    }, 780);

    return () => {
      cancelAnimationFrame(animationFrameId);
      clearTimeout(extra);
      clearTimeout(extra2);
      globalThis.removeEventListener('resize', handleResize);
    };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="pf-splash-overlay">
      <canvas ref={canvasRef} className="pf-splash-canvas" />

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
              animation: 'pf-logo-pop 920ms cubic-bezier(0.175,0.885,0.32,1.275) both',
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
          background: #04120f;
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
          margin: 10px 0 2px; font-size: 2.25rem; font-weight: 900; letterSpacing: -1.1px;
          background: linear-gradient(135deg, #f4c560 6%, #13c2a3 40%, #2ee0bf 82%, #f4c560 102%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          filter: drop-shadow(0 6px 18px rgba(19,194,163,0.32));
          opacity:0; transform: translateY(8px);
          animation: pf-reveal 720ms cubic-bezier(0.16,1,0.3,1) 280ms forwards;
        }
        .pf-splash-subtitle {
          margin: 0; font-size: 13.5px; font-weight: 600; color: #a3b3ad; letter-spacing: -0.1px; opacity: 0.92;
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
        @keyframes pf-fadeout {
          to { opacity:0; visibility:hidden; filter: blur(10px); }
        }
      `}</style>
    </div>
  );
};
