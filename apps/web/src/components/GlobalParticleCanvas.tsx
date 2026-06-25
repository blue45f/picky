import { useEffect, useRef } from 'react';
import { globalParticles } from '../lib/particles';

/**
 * 전역 파티클 캔버스 — triggerParticleBurst로 쌓인 파티클을 렌더해요.
 * 토스 인앱(apps/toss App.tsx)과 동일한 연출. 라우트 위에 고정되어 페이지 전환에도 유지돼요.
 */
export function GlobalParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let active = true;

    const handleResize = () => {
      canvas.width = globalThis.innerWidth;
      canvas.height = globalThis.innerHeight;
    };
    handleResize();
    globalThis.addEventListener('resize', handleResize);

    const animate = () => {
      if (!active) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = globalParticles.length - 1; i >= 0; i--) {
        const p = globalParticles[i];
        if (!p) continue;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.24; // 중력
        p.vx *= 0.98; // 공기 저항
        p.vy *= 0.98;
        p.alpha -= p.decay;
        p.rotation += p.rotationSpeed;

        if (p.alpha <= 0) {
          globalParticles.splice(i, 1);
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
          ctx.fillStyle = p.color;
          if (i % 2 === 0) {
            ctx.beginPath();
            ctx.arc(0, 0, p.size / 3, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.fillRect(-p.size / 4, -p.size / 4, p.size / 2, p.size / 2);
          }
        }
        ctx.restore();
      }

      requestAnimationFrame(animate);
    };

    animate();

    return () => {
      active = false;
      globalThis.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      tabIndex={-1}
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 999999 }}
    />
  );
}
