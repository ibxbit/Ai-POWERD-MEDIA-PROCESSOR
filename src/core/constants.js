/**
 * Constants for MediaProcessor
 */

/**
 * Processing modes
 */
export const PROCESSING_MODES = {
  REALTIME: 'realtime',
  QUALITY: 'quality',
  BALANCED: 'balanced'
};

/**
 * Audio quality presets
 */
export const AUDIO_QUALITY_PRESETS = {
  LOW: {
    sampleRate: 22050,
    bufferSize: 512,
    noiseSuppression: { intensity: 'low' },
    agc: { targetLevel: -15, compressionRatio: 2 }
  },
  MEDIUM: {
    sampleRate: 44100,
    bufferSize: 1024,
    noiseSuppression: { intensity: 'medium' },
    agc: { targetLevel: -20, compressionRatio: 3 }
  },
  HIGH: {
    sampleRate: 48000,
    bufferSize: 2048,
    noiseSuppression: { intensity: 'high' },
    agc: { targetLevel: -25, compressionRatio: 4 }
  }
};

/**
 * Video quality presets
 */
export const VIDEO_QUALITY_PRESETS = {
  LOW: {
    width: 640,
    height: 480,
    fps: 15,
    backgroundBlur: { intensity: 10 },
    colorCorrection: { brightness: 1.0, contrast: 1.0 }
  },
  MEDIUM: {
    width: 1280,
    height: 720,
    fps: 30,
    backgroundBlur: { intensity: 15 },
    colorCorrection: { brightness: 1.1, contrast: 1.1 }
  },
  HIGH: {
    width: 1920,
    height: 1080,
    fps: 60,
    backgroundBlur: { intensity: 20 },
    colorCorrection: { brightness: 1.2, contrast: 1.2 }
  }
};

/**
 * Audio processing constants
 */
export const AUDIO_CONSTANTS = {
  DEFAULT_SAMPLE_RATE: 48000,
  DEFAULT_BUFFER_SIZE: 1024,
  MIN_BUFFER_SIZE: 256,
  MAX_BUFFER_SIZE: 4096,
  VOICE_FREQUENCY_RANGE: [85, 255], // Hz
  NOISE_FREQUENCY_RANGE: [20, 20000], // Hz
  AGC_MIN_GAIN: 0.1,
  AGC_MAX_GAIN: 10.0,
  AGC_DEFAULT_TARGET: -20, // dB
  AGC_DEFAULT_RATIO: 3
};

/**
 * Video processing constants
 */
export const VIDEO_CONSTANTS = {
  DEFAULT_WIDTH: 1280,
  DEFAULT_HEIGHT: 720,
  DEFAULT_FPS: 30,
  MIN_WIDTH: 320,
  MAX_WIDTH: 3840,
  MIN_HEIGHT: 240,
  MAX_HEIGHT: 2160,
  MIN_FPS: 1,
  MAX_FPS: 120,
  BLUR_MIN_INTENSITY: 1,
  BLUR_MAX_INTENSITY: 50,
  BRIGHTNESS_MIN: 0.1,
  BRIGHTNESS_MAX: 3.0,
  CONTRAST_MIN: 0.1,
  CONTRAST_MAX: 3.0,
  SATURATION_MIN: 0.0,
  SATURATION_MAX: 3.0
};

/**
 * WebGL shader constants
 */
export const SHADER_CONSTANTS = {
  VERTEX_SHADER: `
    attribute vec2 a_position;
    attribute vec2 a_texCoord;
    varying vec2 v_texCoord;
    
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
      v_texCoord = a_texCoord;
    }
  `,
  
  FRAGMENT_SHADER_BASE: `
    precision mediump float;
    uniform sampler2D u_texture;
    varying vec2 v_texCoord;
    
    void main() {
      gl_FragColor = texture2D(u_texture, v_texCoord);
    }
  `,
  
  FRAGMENT_SHADER_COLOR_CORRECTION: `
    precision mediump float;
    uniform sampler2D u_texture;
    uniform float u_brightness;
    uniform float u_contrast;
    uniform float u_saturation;
    uniform float u_gamma;
    varying vec2 v_texCoord;
    
    vec3 adjustBrightness(vec3 color, float brightness) {
      return color * brightness;
    }
    
    vec3 adjustContrast(vec3 color, float contrast) {
      return (color - 0.5) * contrast + 0.5;
    }
    
    vec3 adjustSaturation(vec3 color, float saturation) {
      float gray = dot(color, vec3(0.299, 0.587, 0.114));
      return mix(vec3(gray), color, saturation);
    }
    
    vec3 adjustGamma(vec3 color, float gamma) {
      return pow(color, vec3(1.0 / gamma));
    }
    
    void main() {
      vec4 texColor = texture2D(u_texture, v_texCoord);
      vec3 color = texColor.rgb;
      
      color = adjustBrightness(color, u_brightness);
      color = adjustContrast(color, u_contrast);
      color = adjustSaturation(color, u_saturation);
      color = adjustGamma(color, u_gamma);
      
      gl_FragColor = vec4(color, texColor.a);
    }
  `
};

/**
 * Error messages
 */
export const ERROR_MESSAGES = {
  BROWSER_NOT_SUPPORTED: 'Browser does not support required APIs',
  AUDIO_CONTEXT_FAILED: 'Failed to create audio context',
  VIDEO_CONTEXT_FAILED: 'Failed to create video context',
  MEDIA_STREAM_INVALID: 'Invalid MediaStream provided',
  PROCESSOR_DESTROYED: 'MediaProcessor has been destroyed',
  CONFIG_INVALID: 'Invalid configuration provided',
  MODEL_LOAD_FAILED: 'Failed to load AI model',
  PROCESSING_FAILED: 'Processing failed',
  PERMISSION_DENIED: 'Camera/microphone permission denied'
};

/**
 * Event names
 */
export const EVENTS = {
  INITIALIZED: 'initialized',
  PROCESSING_START: 'processing:start',
  PROCESSING_COMPLETE: 'processing:complete',
  PROCESSING_ERROR: 'processing:error',
  CONFIG_UPDATED: 'config:updated',
  DESTROYED: 'destroyed',
  AUDIO_PROCESSED: 'audio:processed',
  VIDEO_PROCESSED: 'video:processed',
  MODEL_LOADED: 'model:loaded',
  MODEL_ERROR: 'model:error'
}; 