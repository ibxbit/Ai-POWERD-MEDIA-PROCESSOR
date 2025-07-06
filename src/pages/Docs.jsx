import React from 'react';

export default function Docs() {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0c1b', color: '#fff', fontFamily: 'Sora, Inter, Segoe UI, Arial, sans-serif', padding: '80px 0 0 0' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 48px' }}>
        <h1 style={{ fontSize: '2.3rem', fontWeight: 900, marginBottom: 18, color: '#4f7cff' }}>Documentation</h1>
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 10 }}>Getting Started</h2>
          <p>ColloAI Media Processor is a JavaScript library for real-time AI-powered video and audio enhancement in web applications.</p>
        </section>
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 10 }}>Installation</h2>
          <pre style={{ background: '#15172b', borderRadius: 10, padding: 16, color: '#fff', fontSize: '1rem', overflowX: 'auto' }}>
            <code>npm install colloai-media-processor</code>
          </pre>
        </section>
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 10 }}>Basic Usage</h2>
          <pre style={{ background: '#15172b', borderRadius: 10, padding: 16, color: '#fff', fontSize: '1rem', overflowX: 'auto' }}>
            <code>{`import { MediaProcessor } from 'colloai-media-processor';

const processor = new MediaProcessor();
processor.enableVideoEffects({ blur: true, colorCorrection: true });
processor.enableAudioEffects({ noiseSuppression: true });

// Attach to a video/audio stream
processor.attachToStream(mediaStream);`}</code>
          </pre>
        </section>
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 10 }}>API Reference</h2>
          <ul style={{ color: '#b0b3c7', fontSize: '1.05rem', lineHeight: 1.7, paddingLeft: 18 }}>
            <li><b>MediaProcessor</b>: Main class for managing video/audio enhancements.</li>
            <li><b>enableVideoEffects(options)</b>: Enable/disable video effects (blur, color correction, etc.).</li>
            <li><b>enableAudioEffects(options)</b>: Enable/disable audio effects (noise suppression, AGC, etc.).</li>
            <li><b>attachToStream(mediaStream)</b>: Attach processor to a MediaStream.</li>
            <li><b>detach()</b>: Remove all effects and detach from stream.</li>
          </ul>
        </section>
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 10 }}>Examples</h2>
          <pre style={{ background: '#15172b', borderRadius: 10, padding: 16, color: '#fff', fontSize: '1rem', overflowX: 'auto' }}>
            <code>{`// Enable background blur and noise suppression
const processor = new MediaProcessor();
processor.enableVideoEffects({ blur: true });
processor.enableAudioEffects({ noiseSuppression: true });
`}</code>
          </pre>
        </section>
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 10 }}>FAQ</h2>
          <ul style={{ color: '#b0b3c7', fontSize: '1.05rem', lineHeight: 1.7, paddingLeft: 18 }}>
            <li><b>Q: Can I use this in React/Vue/Angular?</b><br />A: Yes! ColloAI Media Processor works with any framework that supports JavaScript and MediaStreams.</li>
            <li><b>Q: Is it production-ready?</b><br />A: The library is actively developed. Check the GitHub for the latest status and updates.</li>
            <li><b>Q: How do I contribute?</b><br />A: Fork the repo, make your changes, and open a pull request on GitHub.</li>
          </ul>
        </section>
      </div>
    </div>
  );
} 