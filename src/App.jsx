import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Landing from './pages/Landing';
import Demo from './pages/Demo';
import Features from './pages/Features';
import About from './pages/About';
import Docs from './pages/Docs';

export default function App() {
  return (
    <BrowserRouter>
      <style>{`
        @media (max-width: 900px) {
          .main-nav { flex-direction: column !important; align-items: flex-start !important; padding: 24px 10px 0 10px !important; gap: 18px !important; }
          .main-nav-links { flex-wrap: wrap !important; gap: 18px !important; }
        }
        @media (max-width: 600px) {
          .main-nav { padding: 16px 2vw 0 2vw !important; }
          .main-nav-links { font-size: 0.98rem !important; gap: 10px !important; }
        }
      `}</style>
      <nav className="main-nav" style={{ width: '100vw', maxWidth: 1400, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '36px 48px 0 48px', zIndex: 2, fontFamily: 'Sora, Inter, Segoe UI, Arial, sans-serif' }}>
        <div style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: 1, color: '#fff', fontFamily: 'Inter, Segoe UI, Arial, sans-serif' }}>
          Collo<span style={{ color: '#4f7cff' }}>AI</span>
        </div>
        <div className="main-nav-links" style={{ display: 'flex', gap: 36, alignItems: 'center' }}>
          <Link to="/" style={{ color: '#fff', textDecoration: 'none', fontSize: '1.08rem', fontWeight: 600, opacity: 0.85, position: 'relative' }}>Home</Link>
          <Link to="/features" style={{ color: '#fff', textDecoration: 'none', fontSize: '1.08rem', fontWeight: 600, opacity: 0.85 }}>Features</Link>
          <Link to="/about" style={{ color: '#fff', textDecoration: 'none', fontSize: '1.08rem', fontWeight: 600, opacity: 0.85 }}>About</Link>
          <Link to="/docs" style={{ color: '#fff', textDecoration: 'none', fontSize: '1.08rem', fontWeight: 600, opacity: 0.85 }}>Docs</Link>
          <a href="https://github.com/ibxbit/Ai-POWERD-MEDIA-PROCESSOR" target="_blank" rel="noopener noreferrer" style={{ color: '#fff', textDecoration: 'none', fontSize: '1.08rem', fontWeight: 600, opacity: 0.85 }}>GitHub</a>
          <Link to="/demo" style={{ background: '#4f7cff', color: '#fff', borderRadius: 8, padding: '10px 28px', fontWeight: 700, fontSize: '1.08rem', marginLeft: 18, boxShadow: '0 2px 12px 0 rgba(79,124,255,0.10)', border: 'none', cursor: 'pointer', textDecoration: 'none', display: 'inline-block' }}>Try Demo</Link>
        </div>
      </nav>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/features" element={<Features />} />
        <Route path="/about" element={<About />} />
        <Route path="/docs" element={<Docs />} />
        <Route path="/demo" element={<Demo />} />
      </Routes>
    </BrowserRouter>
  );
} 