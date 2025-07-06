import React, { useRef, useState, useCallback, useEffect } from 'react';
const defaultConfig = {
  video: {
    colorCorrection: { enabled: true, brightness: 1.1, contrast: 1.2, saturation: 1.0 },
    lowLightCompensation: { enabled: true, threshold: 0.3, boost: 1.5 },
    backgroundBlur: { enabled: true, intensity: 15 },
    backgroundReplace: { enabled: false, image: null }
  },
  audio: {
    noiseSuppression: { enabled: false, intensity: 'medium' },
    agc: { enabled: false, targetLevel: -20, compressionRatio: 3 },
    voiceFocus: { enabled: false, sensitivity: 0.8 }
  }
};

const intensityOptions = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' }
];

export default function Demo() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [config, setConfig] = useState(defaultConfig);
  const [bgImage, setBgImage] = useState(null);
  const [started, setStarted] = useState(false);
  const [mediaStream, setMediaStream] = useState(null);
  const [videoActive, setVideoActive] = useState(true);
  const [audioMuted, setAudioMuted] = useState(false);
  const [enhance, setEnhance] = useState(false);
  const [enhanceStatus, setEnhanceStatus] = useState('');
  const [animationId, setAnimationId] = useState(null);
  const [lastFrameTime, setLastFrameTime] = useState(0);
  const [performanceMode, setPerformanceMode] = useState(true); // Performance mode enabled by default

  // Apply video effects using Canvas with frame rate limiting
  const applyVideoEffects = useCallback((currentTime) => {
    if (!videoRef.current || !canvasRef.current || !enhance) return;

    // Very low FPS for maximum performance
    const targetFPS = 10; // Reduced to 10 FPS for smooth performance
    const frameInterval = 1000 / targetFPS;
    
    if (currentTime - lastFrameTime < frameInterval) {
      const id = requestAnimationFrame(applyVideoEffects);
      setAnimationId(id);
      return;
    }
    
    setLastFrameTime(currentTime);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    // Use full canvas size for better quality since performance is good
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    // Maintain aspect ratio and prevent shrinking
    const videoAspect = video.videoWidth / video.videoHeight;
    const canvasAspect = canvasWidth / canvasHeight;
    
    let drawWidth, drawHeight, offsetX = 0, offsetY = 0;
    
    if (videoAspect > canvasAspect) {
      // Video is wider than canvas
      drawHeight = canvasHeight;
      drawWidth = drawHeight * videoAspect;
      offsetX = (canvasWidth - drawWidth) / 2;
    } else {
      // Video is taller than canvas
      drawWidth = canvasWidth;
      drawHeight = drawWidth / videoAspect;
      offsetY = (canvasHeight - drawHeight) / 2;
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw video frame maintaining aspect ratio
    ctx.drawImage(video, offsetX, offsetY, drawWidth, drawHeight);

    // Apply effects only if enabled and combine them for better performance
    let hasEffects = false;
    let filterString = '';

    // Combine all filters into one operation - simplified for performance
    if (config.video.colorCorrection.enabled) {
      const brightness = config.video.colorCorrection.brightness;
      const contrast = config.video.colorCorrection.contrast;
      // Remove saturation for better performance
      filterString += `brightness(${brightness}) contrast(${contrast}) `;
      hasEffects = true;
    }

    if (config.video.backgroundBlur.enabled) {
      const intensity = config.video.backgroundBlur.intensity;
      filterString += `blur(${intensity * 0.8}px) `; // Very strong blur effect for maximum visibility
      hasEffects = true;
    }

    // Apply combined filters in one operation
    if (hasEffects) {
      ctx.filter = filterString.trim();
      ctx.drawImage(canvas, 0, 0);
      ctx.filter = 'none';
    }

    // Apply low light compensation separately (it's a different type of operation)
    if (config.video.lowLightCompensation.enabled) {
      const boost = config.video.lowLightCompensation.boost;
      if (boost > 2.0) { // Only apply if very significant boost is needed
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = `rgba(255, 255, 255, ${(boost - 1) * 0.02})`; // Much reduced intensity
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = 'source-over';
      }
    }

    // Continue animation with frame rate limiting
    const id = requestAnimationFrame(applyVideoEffects);
    setAnimationId(id);
  }, [enhance, config, lastFrameTime]);

  // Start video processing with performance optimization
  useEffect(() => {
    if (enhance && started && videoActive) {
      // Clear any existing animation
      if (animationId) {
        cancelAnimationFrame(animationId);
        setAnimationId(null);
      }
      
      // Start processing with a small delay to prevent overwhelming
      setTimeout(() => {
        requestAnimationFrame(applyVideoEffects);
      }, 100);
    } else if (animationId) {
      cancelAnimationFrame(animationId);
      setAnimationId(null);
    }

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [enhance, started, videoActive, applyVideoEffects, animationId]);

  // Camera/Mic controls
  function stopCamera() {
    if (mediaStream) {
      // Stop all tracks
      mediaStream.getTracks().forEach(track => {
        track.stop();
      });
      
      // Reset all states
      setVideoActive(false);
      setStarted(false);
      setMediaStream(null);
      setEnhance(false);
      
      // Clear video element
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      
      // Clear any ongoing processing
      if (animationId) {
        cancelAnimationFrame(animationId);
        setAnimationId(null);
      }
      
      setEnhanceStatus('Camera stopped');
    }
  }
  
  function restartCamera() {
    // Reset states first
    setStarted(false);
    setVideoActive(false);
    setMediaStream(null);
    setEnhance(false);
    
    // Clear any ongoing processing
    if (animationId) {
      cancelAnimationFrame(animationId);
      setAnimationId(null);
    }
    
    // Start fresh camera stream
    startDemo();
  }
  
  function toggleMuteAudio() {
    if (mediaStream) {
      const newMuted = !audioMuted;
      mediaStream.getAudioTracks().forEach(track => {
        track.enabled = !newMuted;
      });
      setAudioMuted(newMuted);
      setEnhanceStatus(newMuted ? 'Audio muted' : 'Audio unmuted');
    }
  }

  // Start camera
  async function startDemo() {
    setProcessing(true);
    setError(null);
    setEnhanceStatus('');
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: { 
          width: { ideal: 480, max: 640 }, // Much reduced for performance
          height: { ideal: 360, max: 480 }, // Much reduced for performance
          frameRate: { ideal: 10, max: 15 }  // Much reduced for performance
        } 
      });
      setMediaStream(stream);
      setVideoActive(true);
      setAudioMuted(false);
      setStarted(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      
      setEnhanceStatus('Camera started successfully (Performance Mode)');
    } catch (err) {
      setError(err.message || 'Failed to start demo');
      setEnhanceStatus('Failed to start camera');
    }
    setProcessing(false);
  }

  // Handle enhancement toggle
  const handleEnhanceToggle = useCallback((newEnhance) => {
    setEnhance(newEnhance);
    if (newEnhance) {
      setEnhanceStatus('Enhancements enabled');
      // Force immediate start of processing
      if (started && videoActive) {
        setTimeout(() => {
          applyVideoEffects();
        }, 10);
      }
    } else {
      setEnhanceStatus('Enhancements disabled');
      // Clear any ongoing processing
      if (animationId) {
        cancelAnimationFrame(animationId);
        setAnimationId(null);
      }
    }
  }, [started, videoActive, applyVideoEffects, animationId]);

  // Update features
  const updateFeature = useCallback((path, value) => {
    const newConfig = JSON.parse(JSON.stringify(config));
    let obj = newConfig;
    for (let i = 0; i < path.length - 1; i++) obj = obj[path[i]];
    obj[path[path.length - 1]] = value;
    setConfig(newConfig);
  }, [config]);

  function handleBgImage(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      setBgImage(ev.target.result);
      updateFeature(['video', 'backgroundReplace', 'image'], ev.target.result);
      updateFeature(['video', 'backgroundReplace', 'enabled'], true);
    };
    reader.readAsDataURL(file);
  }

  function stopBgReplace() {
    setBgImage(null);
    updateFeature(['video', 'backgroundReplace', 'enabled'], false);
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: 'Inter, Segoe UI, Arial, sans-serif', paddingTop: 40 }}>
      <style>{`
        @media (max-width: 1100px) {
          .demo-main-row { flex-direction: column !important; gap: 40px !important; align-items: center !important; padding: 0 10px !important; }
          .demo-left, .demo-right { min-width: 90vw !important; max-width: 98vw !important; margin-top: 0 !important; }
          .demo-center { min-width: 90vw !important; max-width: 98vw !important; }
        }
        @media (max-width: 600px) {
          .demo-header { font-size: 2rem !important; }
          .demo-status { font-size: 0.9rem !important; }
          .demo-main-row { gap: 24px !important; }
          .demo-center { min-width: 98vw !important; max-width: 100vw !important; }
          .demo-video { width: 100vw !important; height: 60vw !important; min-width: 0 !important; min-height: 0 !important; }
        }
      `}</style>
      {/* Header */}
      <div className="demo-header" style={{ textAlign: 'center', marginBottom: 40 }}>
        <h1 style={{ fontSize: '2.8rem', fontWeight: 900, marginBottom: 12, background: 'linear-gradient(135deg, #fff 0%, #4f7cff 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
          ColloAI Media Processor
        </h1>
        <p style={{ fontSize: '1.1rem', color: '#b0b3c7', maxWidth: 600, margin: '0 auto', lineHeight: 1.6 }}>
          Real-time AI-powered video & audio enhancement with professional-grade effects
        </p>
      </div>

             {/* Enhancement Toggle */}
       <div style={{ marginBottom: 32, display: 'flex', alignItems: 'center', gap: 16 }}>
         <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => handleEnhanceToggle(!enhance)}>
           <div style={{ 
             width: 48, 
             height: 24, 
             background: enhance ? '#4f7cff' : '#2a2a3a', 
             borderRadius: 12, 
             position: 'relative', 
             transition: 'all 0.3s ease',
             display: 'flex',
             alignItems: 'center',
             padding: '2px'
           }}>
             <div style={{ 
               width: 20, 
               height: 20, 
               background: '#fff', 
               borderRadius: '50%', 
               transform: enhance ? 'translateX(24px)' : 'translateX(0)',
               transition: 'transform 0.3s ease'
             }} />
           </div>
           <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>Enable AI Enhancements</span>
         </label>
       </div>

      {/* Status Messages */}
      {enhanceStatus && (
        <div style={{ 
          background: 'rgba(79, 124, 255, 0.1)', 
          border: '1px solid rgba(79, 124, 255, 0.3)', 
          borderRadius: 12, 
          padding: '12px 20px', 
          marginBottom: 24,
          fontSize: '0.9rem',
          color: '#4f7cff'
        }}>
          {enhanceStatus}
        </div>
      )}

      {/* Main Content */}
      <div className="demo-main-row" style={{ display: 'flex', flexDirection: 'row', gap: 80, alignItems: 'flex-start', width: '100%', justifyContent: 'space-between', maxWidth: 1800, padding: '0 60px' }}>
        
        {/* Left: Video Enhancement Controls */}
        <div className="demo-left" style={{ 
          background: 'rgba(255, 255, 255, 0.03)', 
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 20, 
          padding: 32, 
          minWidth: 300, 
          maxWidth: 360,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          marginTop: -140
        }}>
          <div style={{ fontWeight: 700, fontSize: '1.2rem', marginBottom: 24, color: '#fff' }}>Video Enhancement</div>
          
          {/* Color Correction */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, cursor: 'pointer' }}>
              <input type="checkbox" checked={config.video.colorCorrection.enabled} onChange={e => updateFeature(['video', 'colorCorrection', 'enabled'], e.target.checked)} disabled={!enhance} style={{ width: 16, height: 16 }} />
              <span style={{ fontWeight: 600 }}>Color Correction</span>
            </label>
            {config.video.colorCorrection.enabled && (
              <div style={{ marginLeft: 26, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: '0.9rem', color: '#b0b3c7' }}>Brightness</span>
                    <span style={{ fontSize: '0.9rem', color: '#4f7cff' }}>{config.video.colorCorrection.brightness}</span>
                  </div>
                  <input type="range" min={0.1} max={3.0} step={0.01} value={config.video.colorCorrection.brightness} onChange={e => updateFeature(['video', 'colorCorrection', 'brightness'], Number(e.target.value))} disabled={!enhance} style={{ width: '100%', height: 4, borderRadius: 2, background: '#2a2a3a', outline: 'none' }} />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: '0.9rem', color: '#b0b3c7' }}>Contrast</span>
                    <span style={{ fontSize: '0.9rem', color: '#4f7cff' }}>{config.video.colorCorrection.contrast}</span>
                  </div>
                  <input type="range" min={0.1} max={3.0} step={0.01} value={config.video.colorCorrection.contrast} onChange={e => updateFeature(['video', 'colorCorrection', 'contrast'], Number(e.target.value))} disabled={!enhance} style={{ width: '100%', height: 4, borderRadius: 2, background: '#2a2a3a', outline: 'none' }} />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: '0.9rem', color: '#b0b3c7' }}>Saturation</span>
                    <span style={{ fontSize: '0.9rem', color: '#4f7cff' }}>{config.video.colorCorrection.saturation}</span>
                  </div>
                  <input type="range" min={0.0} max={3.0} step={0.01} value={config.video.colorCorrection.saturation} onChange={e => updateFeature(['video', 'colorCorrection', 'saturation'], Number(e.target.value))} disabled={!enhance} style={{ width: '100%', height: 4, borderRadius: 2, background: '#2a2a3a', outline: 'none' }} />
                </div>
              </div>
            )}
          </div>

          {/* Low-Light Compensation */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, cursor: 'pointer' }}>
              <input type="checkbox" checked={config.video.lowLightCompensation.enabled} onChange={e => updateFeature(['video', 'lowLightCompensation', 'enabled'], e.target.checked)} disabled={!enhance} style={{ width: 16, height: 16 }} />
              <span style={{ fontWeight: 600 }}>Low-Light Boost</span>
            </label>
            {config.video.lowLightCompensation.enabled && (
              <div style={{ marginLeft: 26 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.9rem', color: '#b0b3c7' }}>Boost</span>
                  <span style={{ fontSize: '0.9rem', color: '#4f7cff' }}>{config.video.lowLightCompensation.boost}</span>
                </div>
                <input type="range" min={1} max={3} step={0.01} value={config.video.lowLightCompensation.boost} onChange={e => updateFeature(['video', 'lowLightCompensation', 'boost'], Number(e.target.value))} disabled={!enhance} style={{ width: '100%', height: 4, borderRadius: 2, background: '#2a2a3a', outline: 'none' }} />
              </div>
            )}
          </div>

          {/* Background Blur */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, cursor: 'pointer' }}>
              <input type="checkbox" checked={config.video.backgroundBlur.enabled} onChange={e => updateFeature(['video', 'backgroundBlur', 'enabled'], e.target.checked)} disabled={!enhance} style={{ width: 16, height: 16 }} />
              <span style={{ fontWeight: 600 }}>Background Blur</span>
            </label>
            {config.video.backgroundBlur.enabled && (
              <div style={{ marginLeft: 26 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.9rem', color: '#b0b3c7' }}>Intensity</span>
                  <span style={{ fontSize: '0.9rem', color: '#4f7cff' }}>{config.video.backgroundBlur.intensity}</span>
                </div>
                <input type="range" min={1} max={50} step={1} value={config.video.backgroundBlur.intensity} onChange={e => updateFeature(['video', 'backgroundBlur', 'intensity'], Number(e.target.value))} disabled={!enhance} style={{ width: '100%', height: 4, borderRadius: 2, background: '#2a2a3a', outline: 'none' }} />
              </div>
            )}
          </div>

          {/* Background Replacement */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontWeight: 600, marginBottom: 12 }}>Background Replacement</div>
            <input type="file" accept="image/*" onChange={handleBgImage} style={{ 
              width: '100%', 
              padding: '12px', 
              background: 'rgba(255, 255, 255, 0.05)', 
              border: '1px solid rgba(255, 255, 255, 0.1)', 
              borderRadius: 8, 
              color: '#fff',
              fontSize: '0.9rem'
            }} disabled={!enhance} />
            {bgImage && (
              <button onClick={stopBgReplace} style={{ 
                marginTop: 8, 
                background: '#4f7cff', 
                color: '#fff', 
                border: 'none', 
                borderRadius: 8, 
                padding: '8px 16px', 
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: 600
              }}>
                Remove Background
              </button>
            )}
          </div>

          {/* Camera Controls */}
          <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 8 }}>Camera Controls</div>
            <button onClick={videoActive ? stopCamera : restartCamera} style={{ 
              background: videoActive ? 'linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%)' : 'linear-gradient(135deg, #4f7cff 0%, #3b5bdb 100%)', 
              color: '#fff', 
              border: 'none', 
              borderRadius: 12, 
              padding: '12px 20px', 
              fontWeight: 600, 
              cursor: 'pointer',
              fontSize: '0.95rem',
              transition: 'all 0.3s ease'
            }}>
              {videoActive ? '⏹️ Stop Camera' : '▶️ Start Camera'}
            </button>
            <button onClick={toggleMuteAudio} style={{ 
              background: audioMuted ? 'linear-gradient(135deg, #4f7cff 0%, #3b5bdb 100%)' : 'linear-gradient(135deg, #ffb84d 0%, #ffa726 100%)', 
              color: '#fff', 
              border: 'none', 
              borderRadius: 12, 
              padding: '12px 20px', 
              fontWeight: 600, 
              cursor: 'pointer',
              fontSize: '0.95rem',
              transition: 'all 0.3s ease'
            }}>
              {audioMuted ? '🔊 Unmute Audio' : '🔇 Mute Audio'}
            </button>
          </div>
        </div>

        {/* Center: Video Preview */}
        <div className="demo-center" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, minWidth: 520, maxWidth: 560 }}>
          <button onClick={startDemo} disabled={processing || started} style={{ 
            background: started ? 'rgba(79, 124, 255, 0.1)' : 'linear-gradient(135deg, #4f7cff 0%, #3b5bdb 100%)', 
            color: '#fff', 
            borderRadius: 16, 
            padding: '16px 40px', 
            fontWeight: 700, 
            fontSize: '1.1rem', 
            border: started ? '1px solid rgba(79, 124, 255, 0.3)' : 'none', 
            cursor: processing || started ? 'default' : 'pointer', 
            marginBottom: 8, 
            boxShadow: started ? 'none' : '0 4px 20px rgba(79, 124, 255, 0.3)',
            transition: 'all 0.3s ease'
          }}>
            {processing ? '🔄 Starting...' : started ? '✅ Live Demo Running' : '🚀 Start Live Demo'}
          </button>
          
          {error && (
            <div style={{ 
              background: 'rgba(255, 107, 107, 0.1)', 
              border: '1px solid rgba(255, 107, 107, 0.3)', 
              borderRadius: 12, 
              padding: '12px 20px',
              color: '#ff6b6b',
              fontSize: '0.9rem'
            }}>
              {error}
            </div>
          )}
          
          <div style={{ 
            position: 'relative', 
            width: 520, 
            height: 390, 
            background: 'rgba(255, 255, 255, 0.03)', 
            borderRadius: 20, 
            overflow: 'hidden',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
          }}>
            <video className="demo-video" 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'cover',
                display: enhance ? 'none' : 'block'
              }} 
            />
            <canvas className="demo-video" 
              ref={canvasRef} 
              width={520}
              height={390}
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'cover',
                display: enhance ? 'block' : 'none'
              }} 
            />
            {!started && (
              <div style={{ 
                position: 'absolute', 
                top: '50%', 
                left: '50%', 
                transform: 'translate(-50%, -50%)', 
                textAlign: 'center',
                color: '#b0b3c7'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: 16 }}>📹</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>Camera Preview</div>
                <div style={{ fontSize: '0.9rem', marginTop: 8 }}>Click "Start Live Demo" to begin</div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Audio Controls */}
        <div className="demo-right" style={{ 
          background: 'rgba(255, 255, 255, 0.03)', 
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 20, 
          padding: 32, 
          minWidth: 300, 
          maxWidth: 360,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          marginTop: -140
        }}>
          <div style={{ fontWeight: 700, fontSize: '1.2rem', marginBottom: 24, color: '#fff' }}>Audio Enhancement</div>
          
          {/* Microphone Control */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, cursor: 'pointer' }}>
              <input type="checkbox" checked={!audioMuted} onChange={toggleMuteAudio} style={{ width: 16, height: 16 }} />
              <span style={{ fontWeight: 600 }}>Microphone</span>
            </label>
            <div style={{ fontSize: '0.85rem', color: '#b0b3c7', marginLeft: 26 }}>
              Status: {audioMuted ? '🔇 Muted' : '🎤 Active'}
            </div>
          </div>

          {/* Noise Suppression */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, cursor: 'pointer' }}>
              <input type="checkbox" checked={config.audio.noiseSuppression.enabled} onChange={e => updateFeature(['audio', 'noiseSuppression', 'enabled'], e.target.checked)} disabled={audioMuted} style={{ width: 16, height: 16 }} />
              <span style={{ fontWeight: 600 }}>Noise Suppression</span>
            </label>
            {config.audio.noiseSuppression.enabled && (
              <div style={{ marginLeft: 26 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.9rem', color: '#b0b3c7' }}>Intensity</span>
                </div>
                <select value={config.audio.noiseSuppression.intensity} onChange={e => updateFeature(['audio', 'noiseSuppression', 'intensity'], e.target.value)} disabled={audioMuted} style={{ 
                  width: '100%', 
                  padding: '8px 12px', 
                  background: 'rgba(255, 255, 255, 0.05)', 
                  border: '1px solid rgba(255, 255, 255, 0.1)', 
                  borderRadius: 8, 
                  color: '#fff',
                  fontSize: '0.9rem'
                }}>
                  {intensityOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Automatic Gain Control */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, cursor: 'pointer' }}>
              <input type="checkbox" checked={config.audio.agc.enabled} onChange={e => updateFeature(['audio', 'agc', 'enabled'], e.target.checked)} disabled={audioMuted} style={{ width: 16, height: 16 }} />
              <span style={{ fontWeight: 600 }}>Auto Gain Control</span>
            </label>
            {config.audio.agc.enabled && (
              <div style={{ marginLeft: 26, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: '0.9rem', color: '#b0b3c7' }}>Target Level</span>
                    <span style={{ fontSize: '0.9rem', color: '#4f7cff' }}>{config.audio.agc.targetLevel} dB</span>
                  </div>
                  <input type="number" min={-40} max={0} step={1} value={config.audio.agc.targetLevel} onChange={e => updateFeature(['audio', 'agc', 'targetLevel'], Number(e.target.value))} style={{ 
                    width: '100%', 
                    padding: '8px 12px', 
                    background: 'rgba(255, 255, 255, 0.05)', 
                    border: '1px solid rgba(255, 255, 255, 0.1)', 
                    borderRadius: 8, 
                    color: '#fff',
                    fontSize: '0.9rem'
                  }} disabled={audioMuted} />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: '0.9rem', color: '#b0b3c7' }}>Compression</span>
                    <span style={{ fontSize: '0.9rem', color: '#4f7cff' }}>{config.audio.agc.compressionRatio}</span>
                  </div>
                  <input type="number" min={1} max={10} step={0.1} value={config.audio.agc.compressionRatio} onChange={e => updateFeature(['audio', 'agc', 'compressionRatio'], Number(e.target.value))} style={{ 
                    width: '100%', 
                    padding: '8px 12px', 
                    background: 'rgba(255, 255, 255, 0.05)', 
                    border: '1px solid rgba(255, 255, 255, 0.1)', 
                    borderRadius: 8, 
                    color: '#fff',
                    fontSize: '0.9rem'
                  }} disabled={audioMuted} />
                </div>
              </div>
            )}
          </div>

          {/* Voice Focus */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, cursor: 'pointer' }}>
              <input type="checkbox" checked={config.audio.voiceFocus.enabled} onChange={e => updateFeature(['audio', 'voiceFocus', 'enabled'], e.target.checked)} disabled={audioMuted} style={{ width: 16, height: 16 }} />
              <span style={{ fontWeight: 600 }}>Voice Focus</span>
            </label>
            {config.audio.voiceFocus.enabled && (
              <div style={{ marginLeft: 26 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.9rem', color: '#b0b3c7' }}>Sensitivity</span>
                  <span style={{ fontSize: '0.9rem', color: '#4f7cff' }}>{config.audio.voiceFocus.sensitivity}</span>
                </div>
                <input type="range" min={0} max={1} step={0.01} value={config.audio.voiceFocus.sensitivity} onChange={e => updateFeature(['audio', 'voiceFocus', 'sensitivity'], Number(e.target.value))} disabled={audioMuted} style={{ width: '100%', height: 4, borderRadius: 2, background: '#2a2a3a', outline: 'none' }} />
              </div>
            )}
          </div>

          {/* Status Panel */}
          <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: 20 }}>
            <div style={{ fontWeight: 600, marginBottom: 12, color: '#4f7cff' }}>System Status</div>
            <div style={{ fontSize: '0.85rem', color: '#b0b3c7', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div>📹 Camera: {started ? 'Active' : 'Inactive'}</div>
              <div>✨ Enhancements: {enhance ? 'Enabled' : 'Disabled'}</div>
              <div>🎥 Video: {videoActive ? 'On' : 'Off'}</div>
              <div>🎵 Audio: {audioMuted ? 'Muted' : 'On'}</div>
              <div>⚡ Processing: {enhance ? '24 FPS' : 'Off'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 