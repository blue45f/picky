import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { PollList } from './pages/PollList';
import { CreatePoll } from './pages/CreatePoll';
import { PollDetail } from './pages/PollDetail';

export const App: React.FC = () => {
  return (
    <Router>
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        <Navbar />

        {/* Main Layout Area */}
        <main
          style={{
            flexGrow: 1,
            width: '100%',
            maxWidth: '680px',
            margin: '0 auto',
            padding: '2.5rem 1.25rem 5rem 1.25rem',
          }}
        >
          <Routes>
            <Route path="/" element={<PollList />} />
            <Route path="/create" element={<CreatePoll />} />
            <Route path="/poll/:id" element={<PollDetail />} />
          </Routes>
        </main>

        {/* Footer Area */}
        <footer
          style={{
            marginTop: 'auto',
            padding: '2rem 1.5rem',
            borderTop: '1px solid var(--bg-card-border)',
            textAlign: 'center',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            backgroundColor: 'oklch(12% 0.015 260)',
          }}
        >
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}
          >
            <p>© {new Date().getFullYear()} pickflow. All rights reserved.</p>
            <p
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                color: 'var(--text-muted)',
              }}
            >
              <span>Built with Premium UI & Monorepo Architecture for</span>
              <Heart size={10} style={{ color: 'var(--brand-accent-coral)' }} />
              <span>Standardized Developer Portfolio</span>
            </p>
          </div>
        </footer>
      </div>
    </Router>
  );
};
