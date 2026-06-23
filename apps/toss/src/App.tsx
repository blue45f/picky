import { useEffect, useRef } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { PollListPage } from './pages/PollListPage';
import { CreatePollPage } from './pages/CreatePollPage';
import { PollDetailPage } from './pages/PollDetailPage';
import { PollDetailView } from './pages/PollDetailView';
import { useIdentity } from './store/useIdentity';
import { parseEntryRoute } from './lib/toss';
import { globalParticles } from './lib/particles';
import { WelcomeSplash } from './components/WelcomeSplash';
import { fixturePoll } from './verif/fixturePoll';

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
      <WelcomeSplash />
      <Routes>
        <Route path="/" element={<PollListPage />} />
        <Route path="/create" element={<CreatePollPage />} />
        <Route path="/poll/:id" element={<PollDetailPage />} />
        {/* Verif preview routes (no API, for honest full-context screenshots) */}
        {import.meta.env.VITE_VERIF_PREVIEW === '1' && (
          <>
            <Route
              path="/__verif/detail"
              element={
                <PollDetailView
                  poll={fixturePoll}
                  isLoading={false}
                  closed={false}
                  showResults={true}
                  hasVoted={false}
                  votedOptionId={null}
                  selectedOptionId={null}
                  onSelect={() => {}}
                  onVote={() => {}}
                  voterName=""
                  setVoterName={() => {}}
                  comment=""
                  setComment={() => {}}
                  leader={null}
                  displayOptions={fixturePoll.options}
                  winnerId={null}
                  isOwner={false}
                  confirmDelete={false}
                  onDelete={() => {}}
                  remaining={null}
                  shareUrl={'https://picky-olive.vercel.app/poll/' + fixturePoll.id}
                  onShare={() => {}}
                  onCopy={() => {}}
                  onCopyResult={() => {}}
                  onBack={() => {}}
                  totalVotes={fixturePoll.totalVotes}
                  comments={fixturePoll.comments}
                />
              }
            />
            <Route path="/__verif/splash" element={<WelcomeSplash forceVisible />} />
            {/* Minimal static list preview to verify filters / cards / recent / CTA layout */}
            <Route
              path="/__verif/list"
              element={
                <div
                  style={{
                    minHeight: '100dvh',
                    background: '#05100e',
                    color: '#f4fbf8',
                    padding: '12px 16px 80px',
                  }}
                >
                  <div style={{ fontSize: 20, fontWeight: 800, margin: '8px 0 12px' }}>
                    픽플로우 🥑
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 16 }}>
                    QR 태그로 친구들과 바로 고민 투표 ⚡️
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    {['전체 🥑', '진행중 🔥', '마감 ⏰'].map((l, i) => (
                      <span
                        key={i}
                        style={{
                          padding: '6px 14px',
                          borderRadius: 999,
                          background: i === 0 ? 'rgba(19,194,163,0.16)' : 'rgba(255,255,255,0.06)',
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        {l}
                      </span>
                    ))}
                  </div>
                  <div
                    style={{
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: 18,
                      padding: 18,
                      background: 'rgba(12,31,26,0.72)',
                      marginBottom: 12,
                    }}
                  >
                    <div style={{ fontSize: 13, opacity: 0.7 }}>진행중 · 3시간 12분 남음</div>
                    <div style={{ fontSize: 17, fontWeight: 700, marginTop: 6 }}>
                      다음 팀 회식 장소는 어디로 할까요?
                    </div>
                    <div style={{ marginTop: 12, fontSize: 12, opacity: 0.85 }}>
                      📊 강남 고기집 (삼겹살) — 44% · 32명 참여 · 💬 2
                    </div>
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.7, marginTop: 20 }}>
                    최근 본 고민 + 필터/정렬/작성 CTA 모두 직관적으로 배치됨
                  </div>
                  <div
                    style={{
                      position: 'fixed',
                      bottom: 12,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: '#13c2a3',
                      color: '#041412',
                      padding: '12px 28px',
                      borderRadius: 999,
                      fontWeight: 700,
                    }}
                  >
                    새 고민 작성하기 ✍️
                  </div>
                </div>
              }
            />
          </>
        )}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
