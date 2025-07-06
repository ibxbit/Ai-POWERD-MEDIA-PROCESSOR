import React from 'react';

export default function About() {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0c1b', color: '#fff', fontFamily: 'Inter, Segoe UI, Arial, sans-serif', padding: '80px 0 0 0' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 48px' }}>
        <h1 style={{ fontSize: '2.3rem', fontWeight: 900, marginBottom: 18, color: '#4f7cff' }}>About ColloAI Media Processor</h1>
        <p style={{ color: '#b0b3c7', fontSize: '1.08rem', fontWeight: 500, lineHeight: 1.7, marginBottom: 32 }}>
          ColloAI Media Processor is an AI-powered platform for real-time video and audio enhancement. Our mission is to empower creators, professionals, and organizations with seamless, high-quality media processing tools.<br /><br />
          <b>Key Technologies:</b> Deep learning, neural audio/video processing, real-time analytics, and intuitive UI/UX.<br /><br />
          <b>Vision:</b> Making next-gen media enhancement accessible to everyone, everywhere.
        </p>
      </div>
    </div>
  );
} 