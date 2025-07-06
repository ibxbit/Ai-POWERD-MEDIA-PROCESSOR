import React from 'react';

export default function Features() {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0c1b', color: '#fff', fontFamily: 'Inter, Segoe UI, Arial, sans-serif', padding: '80px 0 0 0' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 48px' }}>
        <h1 style={{ fontSize: '2.6rem', fontWeight: 900, marginBottom: 18, color: '#4f7cff' }}>Explore Our Features</h1>
        <p style={{ fontSize: '1.18rem', color: '#e0e2f5', fontWeight: 500, marginBottom: 40 }}>
          Discover the advanced AI-powered tools that make ColloAI Media Processor unique. Each feature is designed to empower your media workflow with speed, quality, and intelligence.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32 }}>
          <div style={{ background: '#15172b', borderRadius: 18, padding: '32px 28px', minWidth: 260, flex: 1 }}>
            <h2 style={{ color: '#4f7cff', fontWeight: 700, fontSize: '1.2rem', marginBottom: 10 }}>AI-Powered Audio</h2>
            <ul style={{ color: '#b0b3c7', fontSize: '1.05rem', lineHeight: 1.7, paddingLeft: 18 }}>
              <li>Noise suppression for crystal-clear calls</li>
              <li>Automatic gain control</li>
              <li>Voice focus for speaker clarity</li>
            </ul>
          </div>
          <div style={{ background: '#15172b', borderRadius: 18, padding: '32px 28px', minWidth: 260, flex: 1 }}>
            <h2 style={{ color: '#4f7cff', fontWeight: 700, fontSize: '1.2rem', marginBottom: 10 }}>Real-Time Video Effects</h2>
            <ul style={{ color: '#b0b3c7', fontSize: '1.05rem', lineHeight: 1.7, paddingLeft: 18 }}>
              <li>Background blur and replacement</li>
              <li>Color correction and low-light boost</li>
              <li>Live preview and instant adjustments</li>
            </ul>
          </div>
          <div style={{ background: '#15172b', borderRadius: 18, padding: '32px 28px', minWidth: 260, flex: 1 }}>
            <h2 style={{ color: '#4f7cff', fontWeight: 700, fontSize: '1.2rem', marginBottom: 10 }}>Smart Recording & Analytics</h2>
            <ul style={{ color: '#b0b3c7', fontSize: '1.05rem', lineHeight: 1.7, paddingLeft: 18 }}>
              <li>One-click recording with all enhancements</li>
              <li>Live stats and performance analytics</li>
              <li>Export and share with ease</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 