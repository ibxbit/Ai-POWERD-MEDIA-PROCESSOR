import React from 'react';

const features = [
  {
    badge: 'New',
    title: 'AI Noise Suppression',
    desc: 'Crystal-clear audio in any environment, powered by advanced neural networks.'
  },
  {
    title: 'Real-Time Video Effects',
    desc: 'Apply background blur, color correction, and more—live, with no lag.'
  },
  {
    title: 'Smart Recording',
    desc: 'Record enhanced streams with one click, including all AI-powered improvements.'
  },
  {
    title: 'Live Stats & Analytics',
    desc: 'Monitor performance, quality, and AI impact in real time.'
  }
];

export default function Landing() {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0c1b', color: '#fff', fontFamily: 'Sora, Inter, Segoe UI, Arial, sans-serif', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @media (max-width: 900px) {
          .hero-row { flex-direction: column !important; align-items: flex-start !important; padding: 0 16px !important; }
          .hero-left, .hero-right { max-width: 100% !important; margin-top: 40px !important; }
          .watermark { font-size: 5rem !important; top: 120px !important; }
        }
        @media (max-width: 600px) {
          .hero-title { font-size: 2.1rem !important; }
          .hero-desc { font-size: 1rem !important; }
          .feature-card { min-width: 90vw !important; max-width: 98vw !important; padding: 18px 10px !important; }
          .features-row { flex-direction: column !important; gap: 18px !important; }
        }
      `}</style>
      {/* Side Labels */}
      <div style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%) rotate(-90deg)', color: '#b0b3c7', fontSize: '1rem', letterSpacing: '0.2em', fontWeight: 600, opacity: 0.7, zIndex: 10, userSelect: 'none', display: window.innerWidth < 600 ? 'none' : 'block' }}>AFRICA • ETH • ADDIS ABABA</div>
      <div style={{ position: 'absolute', right: 0, top: '60%', transform: 'translateY(-50%) rotate(90deg)', color: '#b0b3c7', fontSize: '1rem', letterSpacing: '0.2em', fontWeight: 600, opacity: 0.7, zIndex: 10, userSelect: 'none', textAlign: 'right', display: window.innerWidth < 600 ? 'none' : 'block' }}>AI Media Processing</div>
      {/* Hero Section */}
      <div className="hero-row" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', maxWidth: 1400, width: '100vw', margin: '0 auto', padding: '0 48px', position: 'relative', minHeight: 420 }}>
        <div className="hero-left" style={{ zIndex: 2, flex: 1, maxWidth: 520 }}>
          <div className="hero-title" style={{ fontSize: '3.8rem', fontWeight: 900, lineHeight: 1.08, marginTop: 80, marginBottom: 0, letterSpacing: -2, wordBreak: 'break-word', textAlign: 'left', fontFamily: 'Sora, sans-serif' }}>
            Great <span style={{ color: '#4f7cff', fontWeight: 900, letterSpacing: -1 }}>media</span><br />is a force of <br />innovation.
          </div>
        </div>
        <div className="hero-right" style={{ zIndex: 2, maxWidth: 480, marginTop: 100, flex: 1 }}>
          <div className="hero-desc" style={{ fontSize: '1.18rem', color: '#e0e2f5', fontWeight: 500, lineHeight: 1.7, textAlign: 'left', zIndex: 2, fontFamily: 'Sora, sans-serif' }}>
            ColloAI Media Processor lets you enhance, analyze, and transform video & audio in real time with AI.<br /><br />From noise suppression and background blur to smart video effects and live stats, empower your media with next-gen technology.<br /><br /><b>Seamless. Fast. Powerful.</b>
          </div>
        </div>
        {/* Watermark */}
        <div className="watermark" style={{ position: 'absolute', left: '50%', top: 80, fontSize: '10rem', color: '#23243a', fontWeight: 900, opacity: 0.13, pointerEvents: 'none', userSelect: 'none', transform: 'translateX(-50%)', zIndex: 0, fontFamily: 'Sora, sans-serif' }}>
          CAI
        </div>
      </div>
      {/* What we do / How we think */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 40, marginTop: 24, marginBottom: 0, fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: '1.1rem', color: '#fff', zIndex: 2, flexWrap: 'wrap' }}>
        <div style={{ cursor: 'pointer', color: '#fff', opacity: 0.92, transition: 'color 0.2s' }}>→ What we do</div>
        <div style={{ cursor: 'pointer', color: '#fff', opacity: 0.92, transition: 'color 0.2s' }}>→ How we think</div>
      </div>
      {/* Latest Features / Announcements */}
      <div style={{ width: '100vw', maxWidth: 1400, margin: '0 auto', marginTop: 60, padding: '0 48px 32px 48px' }}>
        <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#fff', marginBottom: 24, letterSpacing: 0.5, fontFamily: 'Sora, sans-serif' }}>Latest Features</div>
        <div className="features-row" style={{ display: 'flex', flexDirection: 'row', gap: 32, flexWrap: 'wrap' }}>
          {features.map((f, i) => (
            <div className="feature-card" key={i} style={{ background: '#15172b', borderRadius: 18, boxShadow: '0 4px 32px 0 rgba(31, 38, 135, 0.18)', padding: '28px 32px', minWidth: 220, maxWidth: 320, flex: 1, display: 'flex', flexDirection: 'column', gap: 10, position: 'relative', fontFamily: 'Sora, sans-serif' }}>
              {f.badge && <div style={{ position: 'absolute', top: 18, right: 18, background: '#4f7cff', color: '#fff', borderRadius: 6, fontSize: '0.92rem', fontWeight: 700, padding: '2px 12px', letterSpacing: 0.5 }}>New</div>}
              <div style={{ fontSize: '1.18rem', fontWeight: 700, marginBottom: 6 }}>{f.title}</div>
              <div style={{ color: '#b0b3c7', fontSize: '1rem', fontWeight: 500 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>
      {/* Socials */}
      <div style={{ position: 'fixed', left: 24, bottom: 24, display: 'flex', flexDirection: 'column', gap: 16, zIndex: 20 }}>
        <a href="https://github.com/ibxbit/Ai-POWERD-MEDIA-PROCESSOR" target="_blank" rel="noopener noreferrer" style={{ color: '#fff', fontSize: 22, opacity: 0.7 }}><i className="fab fa-github" /></a>
        <a href="https://twitter.com/ibxbit" target="_blank" rel="noopener noreferrer" style={{ color: '#fff', fontSize: 22, opacity: 0.7 }}><i className="fab fa-twitter" /></a>
        <a href="https://t.me/ibxbit" target="_blank" rel="noopener noreferrer" style={{ color: '#fff', fontSize: 22, opacity: 0.7 }}><i className="fab fa-telegram" /></a>
      </div>
    </div>
  );
} 