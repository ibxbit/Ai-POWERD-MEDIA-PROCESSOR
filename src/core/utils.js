/**
 * Utility functions for MediaProcessor
 */

/**
 * Check if the browser supports required APIs
 */
export function isSupported() {
  const checks = {
    webAudio: typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined',
    getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    webGL: checkWebGLSupport(),
    canvas: typeof HTMLCanvasElement !== 'undefined',
    mediaStream: typeof MediaStream !== 'undefined',
    insertableStreams: checkInsertableStreamsSupport()
  };

  return {
    supported: Object.values(checks).every(Boolean),
    details: checks
  };
}

/**
 * Get detailed browser capabilities
 */
export function getCapabilities() {
  return {
    audio: {
      sampleRate: getMaxSampleRate(),
      channels: 2,
      processing: isSupported().details.webAudio
    },
    video: {
      maxWidth: 1920,
      maxHeight: 1080,
      maxFPS: 60,
      processing: isSupported().details.webGL
    },
    performance: {
      webWorkers: typeof Worker !== 'undefined',
      sharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
      simd: checkSIMDSupport()
    }
  };
}

/**
 * Create audio context with fallback
 */
export function createAudioContext(options = {}) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  
  if (!AudioContextClass) {
    throw new Error('Web Audio API not supported');
  }

  return new AudioContextClass({
    sampleRate: options.sampleRate || 48000,
    latencyHint: options.latencyHint || 'interactive'
  });
}

/**
 * Create video processing context
 */
export function createVideoContext(canvas, options = {}) {
  if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
    throw new Error('Valid canvas element required');
  }

  const gl = canvas.getContext('webgl2', {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    ...options
  }) || canvas.getContext('webgl', {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    ...options
  });

  if (!gl) {
    throw new Error('WebGL not supported');
  }

  return gl;
}

/**
 * Validate configuration object
 */
export function validateConfig(config) {
  const errors = [];

  // Validate audio config
  if (config.audio) {
    if (config.audio.noiseSuppression && typeof config.audio.noiseSuppression.enabled !== 'boolean') {
      errors.push('audio.noiseSuppression.enabled must be boolean');
    }
    
    if (config.audio.agc && typeof config.audio.agc.enabled !== 'boolean') {
      errors.push('audio.agc.enabled must be boolean');
    }
    
    if (config.audio.voiceFocus && typeof config.audio.voiceFocus.enabled !== 'boolean') {
      errors.push('audio.voiceFocus.enabled must be boolean');
    }
  }

  // Validate video config
  if (config.video) {
    if (config.video.colorCorrection && typeof config.video.colorCorrection.enabled !== 'boolean') {
      errors.push('video.colorCorrection.enabled must be boolean');
    }
    
    if (config.video.backgroundBlur && typeof config.video.backgroundBlur.enabled !== 'boolean') {
      errors.push('video.backgroundBlur.enabled must be boolean');
    }
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
  }

  return true;
}

/**
 * Convert dB to linear gain
 */
export function dbToGain(db) {
  return Math.pow(10, db / 20);
}

/**
 * Convert linear gain to dB
 */
export function gainToDb(gain) {
  return 20 * Math.log10(gain);
}

/**
 * Clamp value between min and max
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Linear interpolation
 */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Smooth step interpolation
 */
export function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
  return t * t * (3.0 - 2.0 * t);
}

/**
 * Check WebGL support
 */
function checkWebGLSupport() {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch (e) {
    return false;
  }
}

/**
 * Check Insertable Streams support
 */
function checkInsertableStreamsSupport() {
  return !!(window.MediaStreamTrackProcessor && window.MediaStreamTrackGenerator);
}

/**
 * Check SIMD support
 */
function checkSIMDSupport() {
  try {
    return WebAssembly.validate(new Uint8Array([
      0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
      0x01, 0x05, 0x01, 0x60, 0x00, 0x01, 0x7b, 0x03,
      0x02, 0x01, 0x00, 0x0a, 0x0a, 0x01, 0x08, 0x00,
      0xfd, 0x0f, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
    ]));
  } catch (e) {
    return false;
  }
}

/**
 * Get maximum supported sample rate
 */
function getMaxSampleRate() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return 48000;
  
  try {
    const ctx = new AudioContextClass();
    const maxRate = ctx.sampleRate;
    ctx.close();
    return maxRate;
  } catch (e) {
    return 48000;
  }
}

/**
 * Create a promise that resolves after a delay
 */
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Debounce function calls
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function calls
 */
export function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
} 