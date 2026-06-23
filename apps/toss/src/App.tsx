import { useEffect, useRef } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { PollListPage } from './pages/PollListPage';
import { CreatePollPage } from './pages/CreatePollPage';
import { PollDetailPage } from './pages/PollDetailPage';
import { useIdentity } from './store/useIdentity';
import { parseEntryRoute } from './lib/toss';
import { globalParticles } from './lib/particles';

/** 딥링크(intoss://pickflow/poll/:id)로 진입했을 때 해당 화면으로 한 번 라우팅. */
function SchemeEntryBridge() {
  const navigate = useNavigate();
  const location = useLocation();
  const appliedRef = useRef(false);

  useEffect(() => {
    if (appliedRef.current) {
      return;
    }
    appliedRef.current = true;
    const route = parseEntryRoute();
    if (route && route !== location.pathname) {
      navigate(route, { replace: true });
    }
  }, [navigate, location.pathname]);

  return null;
}

/** 픽플로우 전역 터치/성공 파티클 캔버스 */
function GlobalParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let active = true;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    const animate = () => {
      if (!active) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = globalParticles.length - 1; i >= 0; i--) {
        const p = globalParticles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.24; // 중력 가속도
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
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 999999,
      }}
    />
  );
}

export function App() {
  const init = useIdentity((state) => state.init);

  useEffect(() => {
    void init();
  }, [init]);

  // WebView 정적 번들에서 서버 라우트 의존 없이 동작하도록 HashRouter 사용.
  return (
    <HashRouter>
      <SchemeEntryBridge />
      <GlobalParticleCanvas />
      <Routes>
        <Route path="/" element={<PollListPage />} />
        <Route path="/create" element={<CreatePollPage />} />
        <Route path="/poll/:id" element={<PollDetailPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
