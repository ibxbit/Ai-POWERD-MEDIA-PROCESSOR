/**
 * Simple EventEmitter implementation
 * Used for handling events in MediaProcessor
 */

class EventEmitter {
  constructor() {
    this.events = {};
  }

  /**
   * Add event listener
   */
  on(event, listener) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
    return this;
  }

  /**
   * Add one-time event listener
   */
  once(event, listener) {
    const onceWrapper = (...args) => {
      this.off(event, onceWrapper);
      listener.apply(this, args);
    };
    return this.on(event, onceWrapper);
  }

  /**
   * Remove event listener
   */
  off(event, listener) {
    if (!this.events[event]) return this;
    if (!listener) {
      delete this.events[event];
      return this;
    }
    const index = this.events[event].indexOf(listener);
    if (index > -1) {
      this.events[event].splice(index, 1);
    }
    if (this.events[event].length === 0) {
      delete this.events[event];
    }
    return this;
  }

  /**
   * Emit event
   */
  emit(event, ...args) {
    if (!this.events[event]) return false;
    this.events[event].forEach(listener => {
      try {
        listener.apply(this, args);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
    return true;
  }

  /**
   * Remove all listeners for an event
   */
  removeAllListeners(event) {
    if (event) {
      delete this.events[event];
    } else {
      this.events = {};
    }
    return this;
  }

  /**
   * Get listener count for an event
   */
  listenerCount(event) {
    return this.events[event] ? this.events[event].length : 0;
  }

  /**
   * Get all event names
   */
  eventNames() {
    return Object.keys(this.events);
  }
}

/**
 * Utility functions for MediaProcessor
 */

/**
 * Check if the browser supports required APIs
 */
function isSupported() {
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
function getCapabilities() {
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
function createAudioContext(options = {}) {
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
function createVideoContext(canvas, options = {}) {
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
 * Convert dB to linear gain
 */
function dbToGain(db) {
  return Math.pow(10, db / 20);
}

/**
 * Convert linear gain to dB
 */
function gainToDb(gain) {
  return 20 * Math.log10(gain);
}

/**
 * Clamp value between min and max
 */
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
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
    return WebAssembly.validate(new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, 0x01, 0x05, 0x01, 0x60, 0x00, 0x01, 0x7b, 0x03, 0x02, 0x01, 0x00, 0x0a, 0x0a, 0x01, 0x08, 0x00, 0xfd, 0x0f, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]));
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
 * Constants for MediaProcessor
 */

/**
 * Processing modes
 */
const PROCESSING_MODES = {
  REALTIME: 'realtime',
  QUALITY: 'quality',
  BALANCED: 'balanced'
};

/**
 * Audio quality presets
 */
const AUDIO_QUALITY_PRESETS = {
  LOW: {
    sampleRate: 22050,
    bufferSize: 512,
    noiseSuppression: {
      intensity: 'low'
    },
    agc: {
      targetLevel: -15,
      compressionRatio: 2
    }
  },
  MEDIUM: {
    sampleRate: 44100,
    bufferSize: 1024,
    noiseSuppression: {
      intensity: 'medium'
    },
    agc: {
      targetLevel: -20,
      compressionRatio: 3
    }
  },
  HIGH: {
    sampleRate: 48000,
    bufferSize: 2048,
    noiseSuppression: {
      intensity: 'high'
    },
    agc: {
      targetLevel: -25,
      compressionRatio: 4
    }
  }
};

/**
 * Video quality presets
 */
const VIDEO_QUALITY_PRESETS = {
  LOW: {
    width: 640,
    height: 480,
    fps: 15,
    backgroundBlur: {
      intensity: 10
    },
    colorCorrection: {
      brightness: 1.0,
      contrast: 1.0
    }
  },
  MEDIUM: {
    width: 1280,
    height: 720,
    fps: 30,
    backgroundBlur: {
      intensity: 15
    },
    colorCorrection: {
      brightness: 1.1,
      contrast: 1.1
    }
  },
  HIGH: {
    width: 1920,
    height: 1080,
    fps: 60,
    backgroundBlur: {
      intensity: 20
    },
    colorCorrection: {
      brightness: 1.2,
      contrast: 1.2
    }
  }
};

/**
 * Audio processing constants
 */
const AUDIO_CONSTANTS = {
  DEFAULT_SAMPLE_RATE: 48000,
  DEFAULT_BUFFER_SIZE: 1024,
  MIN_BUFFER_SIZE: 256,
  MAX_BUFFER_SIZE: 4096,
  VOICE_FREQUENCY_RANGE: [85, 255],
  // Hz
  NOISE_FREQUENCY_RANGE: [20, 20000],
  // Hz
  AGC_MIN_GAIN: 0.1,
  AGC_MAX_GAIN: 10.0,
  AGC_DEFAULT_TARGET: -20,
  // dB
  AGC_DEFAULT_RATIO: 3
};

/**
 * Video processing constants
 */
const VIDEO_CONSTANTS = {
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
const SHADER_CONSTANTS = {
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
 * NoiseSuppressor class
 * Implements spectral noise suppression for real-time audio processing
 */

class NoiseSuppressor extends EventEmitter {
  constructor(audioContext, config) {
    super();
    this.audioContext = audioContext;
    this.config = {
      intensity: 'medium',
      model: 'spectral',
      ...config
    };

    // Processing nodes
    this.analyser = null;
    this.scriptProcessor = null;
    this.gainNode = null;

    // State
    this.isInitialized = false;
    this.noiseProfile = null;
    this.frameCount = 0;

    // Intensity settings
    this.intensitySettings = {
      low: {
        threshold: 0.3,
        reduction: 0.5
      },
      medium: {
        threshold: 0.2,
        reduction: 0.7
      },
      high: {
        threshold: 0.1,
        reduction: 0.9
      }
    };
  }

  /**
   * Initialize the noise suppressor
   */
  async initialize() {
    try {
      // Create analyzer node
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.8;

      // Create gain node for output
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = 1.0;

      // Create script processor for spectral processing
      this.scriptProcessor = this.audioContext.createScriptProcessor(AUDIO_CONSTANTS.DEFAULT_BUFFER_SIZE, 1,
      // input channels
      1 // output channels
      );

      // Set up processing
      this.scriptProcessor.onaudioprocess = event => {
        this.processAudio(event);
      };

      // Connect nodes
      this.analyser.connect(this.scriptProcessor);
      this.scriptProcessor.connect(this.gainNode);
      this.isInitialized = true;
      this.emit('initialized');
    } catch (error) {
      this.emit('error', new Error(`Failed to initialize NoiseSuppressor: ${error.message}`));
      throw error;
    }
  }

  /**
   * Process audio data
   */
  processAudio(event) {
    const inputBuffer = event.inputBuffer;
    const outputBuffer = event.outputBuffer;
    const inputData = inputBuffer.getChannelData(0);
    const outputData = outputBuffer.getChannelData(0);

    // Get frequency data from analyzer
    const frequencyData = new Float32Array(this.analyser.frequencyBinCount);
    this.analyser.getFloatFrequencyData(frequencyData);

    // Convert to linear scale
    const linearData = frequencyData.map(db => Math.pow(10, db / 20));

    // Apply noise suppression
    const processedData = this.applyNoiseSuppression(linearData);

    // Convert back to time domain (simplified - in practice you'd use IFFT)
    // For now, we'll apply a simple gain reduction based on noise detection
    const noiseReduction = this.calculateNoiseReduction(processedData);
    for (let i = 0; i < inputData.length; i++) {
      outputData[i] = inputData[i] * noiseReduction;
    }
    this.frameCount++;
    this.emit('processed', {
      frame: this.frameCount,
      reduction: noiseReduction
    });
  }

  /**
   * Apply noise suppression to frequency data
   */
  applyNoiseSuppression(frequencyData) {
    const settings = this.intensitySettings[this.config.intensity];
    const processed = new Float32Array(frequencyData.length);

    // Simple spectral subtraction
    for (let i = 0; i < frequencyData.length; i++) {
      const magnitude = frequencyData[i];

      // Estimate noise level (simplified)
      const noiseLevel = this.estimateNoiseLevel(frequencyData, i);

      // Apply spectral subtraction
      const signalLevel = Math.max(0, magnitude - noiseLevel * settings.reduction);

      // Apply threshold
      processed[i] = signalLevel > settings.threshold ? signalLevel : 0;
    }
    return processed;
  }

  /**
   * Estimate noise level for a frequency bin
   */
  estimateNoiseLevel(frequencyData, binIndex) {
    // Simple noise estimation using local minimum
    const windowSize = 5;
    const start = Math.max(0, binIndex - windowSize);
    const end = Math.min(frequencyData.length, binIndex + windowSize);
    let min = Infinity;
    for (let i = start; i < end; i++) {
      if (frequencyData[i] < min) {
        min = frequencyData[i];
      }
    }
    return min;
  }

  /**
   * Calculate overall noise reduction factor
   */
  calculateNoiseReduction(processedData) {
    const settings = this.intensitySettings[this.config.intensity];

    // Calculate signal-to-noise ratio
    const signalEnergy = processedData.reduce((sum, val) => sum + val * val, 0);
    const totalEnergy = processedData.length;
    const snr = signalEnergy / totalEnergy;

    // Apply reduction based on SNR
    const reduction = Math.max(0.1, Math.min(1.0, snr * settings.reduction));
    return reduction;
  }

  /**
   * Learn noise profile from current audio
   */
  learnNoiseProfile(duration = 2000) {
    return new Promise(resolve => {
      const startTime = Date.now();
      const samples = [];
      const collectSample = () => {
        if (Date.now() - startTime < duration) {
          const frequencyData = new Float32Array(this.analyser.frequencyBinCount);
          this.analyser.getFloatFrequencyData(frequencyData);
          samples.push([...frequencyData]);
          requestAnimationFrame(collectSample);
        } else {
          // Calculate average noise profile
          this.noiseProfile = new Float32Array(this.analyser.frequencyBinCount);
          for (let i = 0; i < this.analyser.frequencyBinCount; i++) {
            let sum = 0;
            for (let j = 0; j < samples.length; j++) {
              sum += samples[j][i];
            }
            this.noiseProfile[i] = sum / samples.length;
          }
          this.emit('noiseProfile:learned', {
            profile: this.noiseProfile
          });
          resolve(this.noiseProfile);
        }
      };
      collectSample();
    });
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig) {
    this.config = {
      ...this.config,
      ...newConfig
    };
    this.emit('config:updated', {
      config: this.config
    });
  }

  /**
   * Set noise suppression intensity
   */
  setIntensity(intensity) {
    if (!this.intensitySettings[intensity]) {
      throw new Error(`Invalid intensity: ${intensity}. Must be 'low', 'medium', or 'high'`);
    }
    this.config.intensity = intensity;
    this.emit('intensity:changed', {
      intensity
    });
  }

  /**
   * Get current statistics
   */
  getStats() {
    return {
      frameCount: this.frameCount,
      intensity: this.config.intensity,
      hasNoiseProfile: !!this.noiseProfile
    };
  }

  /**
   * Connect to another audio node
   */
  connect(destination) {
    if (!this.isInitialized) {
      throw new Error('NoiseSuppressor not initialized');
    }
    this.gainNode.connect(destination);
    return destination;
  }

  /**
   * Disconnect from all destinations
   */
  disconnect() {
    if (this.gainNode) {
      this.gainNode.disconnect();
    }
  }

  /**
   * Clean up resources
   */
  async destroy() {
    this.isInitialized = false;
    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }
    this.noiseProfile = null;
    this.emit('destroyed');
  }
}

/**
 * AutomaticGainControl class
 * Implements dynamic gain adjustment for consistent audio levels
 */

class AutomaticGainControl extends EventEmitter {
  constructor(audioContext, config) {
    super();
    this.audioContext = audioContext;
    this.config = {
      targetLevel: AUDIO_CONSTANTS.AGC_DEFAULT_TARGET,
      compressionRatio: AUDIO_CONSTANTS.AGC_DEFAULT_RATIO,
      attackTime: 0.1,
      releaseTime: 0.5,
      ...config
    };

    // Processing nodes
    this.analyser = null;
    this.gainNode = null;
    this.scriptProcessor = null;

    // State
    this.isInitialized = false;
    this.currentGain = 1.0;
    this.targetGain = 1.0;
    this.frameCount = 0;

    // Attack/release coefficients
    this.attackCoeff = 0;
    this.releaseCoeff = 0;
  }

  /**
   * Initialize the AGC
   */
  async initialize() {
    try {
      // Create analyzer node
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 1024;
      this.analyser.smoothingTimeConstant = 0.3;

      // Create gain node
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = this.currentGain;

      // Create script processor
      this.scriptProcessor = this.audioContext.createScriptProcessor(AUDIO_CONSTANTS.DEFAULT_BUFFER_SIZE, 1,
      // input channels
      1 // output channels
      );

      // Set up processing
      this.scriptProcessor.onaudioprocess = event => {
        this.processAudio(event);
      };

      // Calculate attack/release coefficients
      this.calculateCoefficients();

      // Connect nodes
      this.analyser.connect(this.scriptProcessor);
      this.scriptProcessor.connect(this.gainNode);
      this.isInitialized = true;
      this.emit('initialized');
    } catch (error) {
      this.emit('error', new Error(`Failed to initialize AGC: ${error.message}`));
      throw error;
    }
  }

  /**
   * Calculate attack and release coefficients
   */
  calculateCoefficients() {
    const sampleRate = this.audioContext.sampleRate;
    const bufferSize = AUDIO_CONSTANTS.DEFAULT_BUFFER_SIZE;

    // Convert time constants to coefficients
    this.attackCoeff = Math.exp(-bufferSize / (sampleRate * this.config.attackTime));
    this.releaseCoeff = Math.exp(-bufferSize / (sampleRate * this.config.releaseTime));
  }

  /**
   * Process audio data
   */
  processAudio(event) {
    const inputBuffer = event.inputBuffer;
    const outputBuffer = event.outputBuffer;
    const inputData = inputBuffer.getChannelData(0);
    const outputData = outputBuffer.getChannelData(0);

    // Calculate RMS level of input
    let sum = 0;
    for (let i = 0; i < inputData.length; i++) {
      sum += inputData[i] * inputData[i];
    }
    const rms = Math.sqrt(sum / inputData.length);
    const inputLevel = gainToDb(rms);

    // Calculate target gain based on input level
    const newTargetGain = this.calculateTargetGain(inputLevel);

    // Apply attack/release smoothing
    this.smoothGain(newTargetGain);

    // Apply gain to output
    for (let i = 0; i < inputData.length; i++) {
      outputData[i] = inputData[i] * this.currentGain;
    }
    this.frameCount++;
    this.emit('processed', {
      frame: this.frameCount,
      inputLevel,
      currentGain: this.currentGain,
      targetGain: this.targetGain
    });
  }

  /**
   * Calculate target gain based on input level
   */
  calculateTargetGain(inputLevel) {
    const targetLevel = this.config.targetLevel;
    const ratio = this.config.compressionRatio;

    // Calculate how much gain we need to reach target level
    const levelDifference = targetLevel - inputLevel;

    // Apply compression ratio
    let gainAdjustment;
    if (levelDifference > 0) {
      // Input is too quiet, apply full gain
      gainAdjustment = levelDifference;
    } else {
      // Input is too loud, apply compression
      gainAdjustment = levelDifference / ratio;
    }

    // Convert to linear gain
    const targetGain = dbToGain(gainAdjustment);

    // Clamp to reasonable limits
    return clamp(targetGain, AUDIO_CONSTANTS.AGC_MIN_GAIN, AUDIO_CONSTANTS.AGC_MAX_GAIN);
  }

  /**
   * Smooth gain changes using attack/release
   */
  smoothGain(newTargetGain) {
    this.targetGain = newTargetGain;

    // Apply attack or release based on direction
    if (newTargetGain > this.currentGain) {
      // Attack phase
      this.currentGain = this.currentGain * this.attackCoeff + newTargetGain * (1 - this.attackCoeff);
    } else {
      // Release phase
      this.currentGain = this.currentGain * this.releaseCoeff + newTargetGain * (1 - this.releaseCoeff);
    }

    // Update gain node
    this.gainNode.gain.setValueAtTime(this.currentGain, this.audioContext.currentTime);
  }

  /**
   * Set target level in dB
   */
  setTargetLevel(level) {
    this.config.targetLevel = clamp(level, -60, 0);
    this.emit('targetLevel:changed', {
      level: this.config.targetLevel
    });
  }

  /**
   * Set compression ratio
   */
  setCompressionRatio(ratio) {
    this.config.compressionRatio = clamp(ratio, 1, 20);
    this.emit('compressionRatio:changed', {
      ratio: this.config.compressionRatio
    });
  }

  /**
   * Set attack time in seconds
   */
  setAttackTime(time) {
    this.config.attackTime = clamp(time, 0.001, 1.0);
    this.calculateCoefficients();
    this.emit('attackTime:changed', {
      time: this.config.attackTime
    });
  }

  /**
   * Set release time in seconds
   */
  setReleaseTime(time) {
    this.config.releaseTime = clamp(time, 0.001, 5.0);
    this.calculateCoefficients();
    this.emit('releaseTime:changed', {
      time: this.config.releaseTime
    });
  }

  /**
   * Get current gain value
   */
  getCurrentGain() {
    return this.currentGain;
  }

  /**
   * Get current gain in dB
   */
  getCurrentGainDb() {
    return gainToDb(this.currentGain);
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig) {
    this.config = {
      ...this.config,
      ...newConfig
    };
    this.calculateCoefficients();
    this.emit('config:updated', {
      config: this.config
    });
  }

  /**
   * Get current statistics
   */
  getStats() {
    return {
      frameCount: this.frameCount,
      currentGain: this.currentGain,
      currentGainDb: gainToDb(this.currentGain),
      targetLevel: this.config.targetLevel,
      compressionRatio: this.config.compressionRatio,
      attackTime: this.config.attackTime,
      releaseTime: this.config.releaseTime
    };
  }

  /**
   * Connect to another audio node
   */
  connect(destination) {
    if (!this.isInitialized) {
      throw new Error('AGC not initialized');
    }
    this.gainNode.connect(destination);
    return destination;
  }

  /**
   * Disconnect from all destinations
   */
  disconnect() {
    if (this.gainNode) {
      this.gainNode.disconnect();
    }
  }

  /**
   * Clean up resources
   */
  async destroy() {
    this.isInitialized = false;
    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }
    this.emit('destroyed');
  }
}

/**
 * VoiceFocus class
 * Implements frequency-based voice enhancement and background noise reduction
 */

class VoiceFocus extends EventEmitter {
  constructor(audioContext, config) {
    super();
    this.audioContext = audioContext;
    this.config = {
      sensitivity: 0.8,
      frequencyRange: AUDIO_CONSTANTS.VOICE_FREQUENCY_RANGE,
      ...config
    };

    // Processing nodes
    this.analyser = null;
    this.scriptProcessor = null;
    this.gainNode = null;

    // Filters for voice frequency range
    this.lowPassFilter = null;
    this.highPassFilter = null;
    this.voiceBandFilter = null;

    // State
    this.isInitialized = false;
    this.frameCount = 0;
    this.voiceDetected = false;
    this.voiceConfidence = 0;

    // Voice detection parameters
    this.voiceThreshold = 0.3;
    this.smoothingFactor = 0.9;
  }

  /**
   * Initialize the voice focus processor
   */
  async initialize() {
    try {
      // Create analyzer node
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.8;

      // Create filters for voice frequency range
      this.createFilters();

      // Create gain node for output
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = 1.0;

      // Create script processor
      this.scriptProcessor = this.audioContext.createScriptProcessor(AUDIO_CONSTANTS.DEFAULT_BUFFER_SIZE, 1,
      // input channels
      1 // output channels
      );

      // Set up processing
      this.scriptProcessor.onaudioprocess = event => {
        this.processAudio(event);
      };

      // Connect nodes
      this.analyser.connect(this.scriptProcessor);
      this.scriptProcessor.connect(this.gainNode);
      this.isInitialized = true;
      this.emit('initialized');
    } catch (error) {
      this.emit('error', new Error(`Failed to initialize VoiceFocus: ${error.message}`));
      throw error;
    }
  }

  /**
   * Create filters for voice frequency processing
   */
  createFilters() {
    const [lowFreq, highFreq] = this.config.frequencyRange;

    // High-pass filter to remove low-frequency noise
    this.highPassFilter = this.audioContext.createBiquadFilter();
    this.highPassFilter.type = 'highpass';
    this.highPassFilter.frequency.value = lowFreq * 0.8; // Slightly below voice range
    this.highPassFilter.Q.value = 1.0;

    // Low-pass filter to remove high-frequency noise
    this.lowPassFilter = this.audioContext.createBiquadFilter();
    this.lowPassFilter.type = 'lowpass';
    this.lowPassFilter.frequency.value = highFreq * 1.2; // Slightly above voice range
    this.lowPassFilter.Q.value = 1.0;

    // Band-pass filter for voice enhancement
    this.voiceBandFilter = this.audioContext.createBiquadFilter();
    this.voiceBandFilter.type = 'peaking';
    this.voiceBandFilter.frequency.value = (lowFreq + highFreq) / 2;
    this.voiceBandFilter.Q.value = 2.0;
    this.voiceBandFilter.gain.value = 3.0; // Boost voice frequencies
  }

  /**
   * Process audio data
   */
  processAudio(event) {
    const inputBuffer = event.inputBuffer;
    const outputBuffer = event.outputBuffer;
    const inputData = inputBuffer.getChannelData(0);
    const outputData = outputBuffer.getChannelData(0);

    // Get frequency data
    const frequencyData = new Float32Array(this.analyser.frequencyBinCount);
    this.analyser.getFloatFrequencyData(frequencyData);

    // Detect voice activity
    const voiceActivity = this.detectVoiceActivity(frequencyData);

    // Apply voice enhancement
    const enhancementFactor = this.calculateEnhancementFactor(voiceActivity);

    // Apply processing to output
    for (let i = 0; i < inputData.length; i++) {
      // Apply frequency filtering and enhancement
      let processed = inputData[i];

      // Apply voice band enhancement
      processed *= enhancementFactor;

      // Apply sensitivity-based gain
      const sensitivityGain = 1.0 + this.config.sensitivity * voiceActivity;
      processed *= sensitivityGain;
      outputData[i] = clamp(processed, -1, 1);
    }
    this.frameCount++;
    this.emit('processed', {
      frame: this.frameCount,
      voiceDetected: this.voiceDetected,
      voiceConfidence: this.voiceConfidence,
      enhancementFactor
    });
  }

  /**
   * Detect voice activity in frequency domain
   */
  detectVoiceActivity(frequencyData) {
    const [lowFreq, highFreq] = this.config.frequencyRange;
    const sampleRate = this.audioContext.sampleRate;
    const binSize = sampleRate / (this.analyser.fftSize * 2);

    // Calculate energy in voice frequency range
    let voiceEnergy = 0;
    let totalEnergy = 0;
    for (let i = 0; i < frequencyData.length; i++) {
      const frequency = i * binSize;
      const magnitude = Math.pow(10, frequencyData[i] / 20);
      if (frequency >= lowFreq && frequency <= highFreq) {
        voiceEnergy += magnitude * magnitude;
      }
      totalEnergy += magnitude * magnitude;
    }

    // Calculate voice-to-total energy ratio
    const voiceRatio = voiceEnergy / totalEnergy;

    // Update voice detection state with smoothing
    this.voiceConfidence = this.voiceConfidence * this.smoothingFactor + voiceRatio * (1 - this.smoothingFactor);
    this.voiceDetected = this.voiceConfidence > this.voiceThreshold;
    return this.voiceConfidence;
  }

  /**
   * Calculate enhancement factor based on voice activity
   */
  calculateEnhancementFactor(voiceActivity) {
    // Base enhancement when voice is detected
    const baseEnhancement = 1.2;

    // Dynamic enhancement based on voice activity
    const dynamicEnhancement = 1.0 + voiceActivity * 0.5;

    // Combine enhancements
    const totalEnhancement = this.voiceDetected ? baseEnhancement * dynamicEnhancement : 1.0;
    return clamp(totalEnhancement, 0.5, 2.0);
  }

  /**
   * Set voice detection sensitivity
   */
  setSensitivity(sensitivity) {
    this.config.sensitivity = clamp(sensitivity, 0, 1);
    this.emit('sensitivity:changed', {
      sensitivity: this.config.sensitivity
    });
  }

  /**
   * Set voice frequency range
   */
  setFrequencyRange(lowFreq, highFreq) {
    this.config.frequencyRange = [clamp(lowFreq, 50, 500), clamp(highFreq, 200, 1000)];

    // Update filters
    this.updateFilters();
    this.emit('frequencyRange:changed', {
      frequencyRange: this.config.frequencyRange
    });
  }

  /**
   * Update filter frequencies
   */
  updateFilters() {
    const [lowFreq, highFreq] = this.config.frequencyRange;
    if (this.highPassFilter) {
      this.highPassFilter.frequency.setValueAtTime(lowFreq * 0.8, this.audioContext.currentTime);
    }
    if (this.lowPassFilter) {
      this.lowPassFilter.frequency.setValueAtTime(highFreq * 1.2, this.audioContext.currentTime);
    }
    if (this.voiceBandFilter) {
      this.voiceBandFilter.frequency.setValueAtTime((lowFreq + highFreq) / 2, this.audioContext.currentTime);
    }
  }

  /**
   * Set voice detection threshold
   */
  setVoiceThreshold(threshold) {
    this.voiceThreshold = clamp(threshold, 0, 1);
    this.emit('voiceThreshold:changed', {
      threshold: this.voiceThreshold
    });
  }

  /**
   * Get current voice detection status
   */
  isVoiceDetected() {
    return this.voiceDetected;
  }

  /**
   * Get voice confidence level
   */
  getVoiceConfidence() {
    return this.voiceConfidence;
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig) {
    this.config = {
      ...this.config,
      ...newConfig
    };
    if (newConfig.frequencyRange) {
      this.updateFilters();
    }
    this.emit('config:updated', {
      config: this.config
    });
  }

  /**
   * Get current statistics
   */
  getStats() {
    return {
      frameCount: this.frameCount,
      voiceDetected: this.voiceDetected,
      voiceConfidence: this.voiceConfidence,
      sensitivity: this.config.sensitivity,
      frequencyRange: this.config.frequencyRange,
      voiceThreshold: this.voiceThreshold
    };
  }

  /**
   * Connect to another audio node
   */
  connect(destination) {
    if (!this.isInitialized) {
      throw new Error('VoiceFocus not initialized');
    }
    this.gainNode.connect(destination);
    return destination;
  }

  /**
   * Disconnect from all destinations
   */
  disconnect() {
    if (this.gainNode) {
      this.gainNode.disconnect();
    }
  }

  /**
   * Clean up resources
   */
  async destroy() {
    this.isInitialized = false;
    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
    if (this.highPassFilter) {
      this.highPassFilter.disconnect();
      this.highPassFilter = null;
    }
    if (this.lowPassFilter) {
      this.lowPassFilter.disconnect();
      this.lowPassFilter = null;
    }
    if (this.voiceBandFilter) {
      this.voiceBandFilter.disconnect();
      this.voiceBandFilter = null;
    }
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }
    this.emit('destroyed');
  }
}

/**
 * AudioProcessor class
 * Handles real-time audio enhancement including noise suppression, AGC, and voice focus
 */

class AudioProcessor extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.audioContext = null;
    this.sourceNode = null;
    this.destinationNode = null;

    // Processing nodes
    this.noiseSuppressor = null;
    this.agc = null;
    this.voiceFocus = null;

    // State
    this.isInitialized = false;
    this.isProcessing = false;
    this.stats = {
      processedFrames: 0,
      currentLevel: -60,
      noiseLevel: -60,
      processingTime: 0
    };
  }

  /**
   * Initialize the audio processor
   */
  async initialize() {
    try {
      // Create audio context
      this.audioContext = createAudioContext({
        sampleRate: AUDIO_CONSTANTS.DEFAULT_SAMPLE_RATE,
        latencyHint: 'interactive'
      });

      // Create processing nodes based on config
      await this.createProcessingNodes();
      this.isInitialized = true;
      this.emit('initialized');
    } catch (error) {
      this.emit('error', new Error(`Failed to initialize AudioProcessor: ${error.message}`));
      throw error;
    }
  }

  /**
   * Create processing nodes based on configuration
   */
  async createProcessingNodes() {
    const nodes = [];

    // Create noise suppressor if enabled
    if (this.config.noiseSuppression?.enabled) {
      this.noiseSuppressor = new NoiseSuppressor(this.audioContext, this.config.noiseSuppression);
      await this.noiseSuppressor.initialize();
      nodes.push(this.noiseSuppressor);
    }

    // Create AGC if enabled
    if (this.config.agc?.enabled) {
      this.agc = new AutomaticGainControl(this.audioContext, this.config.agc);
      await this.agc.initialize();
      nodes.push(this.agc);
    }

    // Create voice focus if enabled
    if (this.config.voiceFocus?.enabled) {
      this.voiceFocus = new VoiceFocus(this.audioContext, this.config.voiceFocus);
      await this.voiceFocus.initialize();
      nodes.push(this.voiceFocus);
    }

    // Connect nodes in sequence
    this.connectNodes(nodes);
  }

  /**
   * Connect processing nodes in sequence
   */
  connectNodes(nodes) {
    if (nodes.length === 0) return;

    // Connect nodes in sequence
    for (let i = 0; i < nodes.length - 1; i++) {
      nodes[i].connect(nodes[i + 1]);
    }

    // Set source and destination
    this.sourceNode = nodes[0];
    this.destinationNode = nodes[nodes.length - 1];
  }

  /**
   * Process a MediaStream and return enhanced audio stream
   */
  async process(stream) {
    if (!this.isInitialized) {
      throw new Error('AudioProcessor not initialized');
    }
    if (!stream || !(stream instanceof MediaStream)) {
      throw new Error('Invalid MediaStream provided');
    }
    try {
      this.isProcessing = true;
      this.emit('processing:start');

      // Get audio tracks
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        return stream; // No audio tracks to process
      }

      // Create source from stream
      const source = this.audioContext.createMediaStreamSource(stream);

      // Connect to processing chain
      source.connect(this.sourceNode);

      // Create destination stream
      const destination = this.audioContext.createMediaStreamDestination();
      this.destinationNode.connect(destination);

      // Create new stream with processed audio
      const processedStream = new MediaStream([...stream.getVideoTracks(), ...destination.stream.getAudioTracks()]);

      // Start monitoring
      this.startMonitoring();
      this.isProcessing = false;
      this.emit('processing:complete', {
        stream: processedStream
      });
      return processedStream;
    } catch (error) {
      this.isProcessing = false;
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Start monitoring audio levels and statistics
   */
  startMonitoring() {
    if (!this.audioContext) return;

    // Create analyzer for monitoring
    const analyzer = this.audioContext.createAnalyser();
    analyzer.fftSize = 2048;
    analyzer.smoothingTimeConstant = 0.8;
    this.destinationNode.connect(analyzer);
    const dataArray = new Uint8Array(analyzer.frequencyBinCount);
    const updateStats = () => {
      if (!this.isProcessing) return;
      analyzer.getByteFrequencyData(dataArray);

      // Calculate RMS level
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sum / dataArray.length);
      this.stats.currentLevel = gainToDb(rms / 255);

      // Estimate noise level (simplified)
      const sorted = [...dataArray].sort((a, b) => a - b);
      const noiseRms = Math.sqrt(sorted.slice(0, Math.floor(sorted.length * 0.1)).reduce((sum, val) => sum + val * val, 0) / Math.floor(sorted.length * 0.1));
      this.stats.noiseLevel = gainToDb(noiseRms / 255);
      this.stats.processedFrames++;
      this.emit('stats:updated', this.stats);
      requestAnimationFrame(updateStats);
    };
    updateStats();
  }

  /**
   * Update configuration
   */
  async updateConfig(newConfig) {
    this.config = {
      ...this.config,
      ...newConfig
    };

    // Reinitialize if needed
    if (this.isInitialized) {
      await this.destroy();
      await this.initialize();
    }
    this.emit('config:updated', {
      config: this.config
    });
  }

  /**
   * Get current statistics
   */
  getStats() {
    return {
      ...this.stats
    };
  }

  /**
   * Get current audio level in dB
   */
  getCurrentLevel() {
    return this.stats.currentLevel;
  }

  /**
   * Get noise floor level in dB
   */
  getNoiseLevel() {
    return this.stats.noiseLevel;
  }

  /**
   * Get signal-to-noise ratio
   */
  getSNR() {
    return this.stats.currentLevel - this.stats.noiseLevel;
  }

  /**
   * Enable/disable specific features
   */
  async setFeature(feature, enabled) {
    const featureMap = {
      noiseSuppression: 'noiseSuppressor',
      agc: 'agc',
      voiceFocus: 'voiceFocus'
    };
    const nodeName = featureMap[feature];
    if (!nodeName) {
      throw new Error(`Unknown feature: ${feature}`);
    }
    if (enabled && !this[nodeName]) {
      // Create and initialize the node
      await this.createNode(feature);
    } else if (!enabled && this[nodeName]) {
      // Remove the node
      await this.removeNode(feature);
    }
    this.config[feature].enabled = enabled;
  }

  /**
   * Create a specific processing node
   */
  async createNode(feature) {
    switch (feature) {
      case 'noiseSuppression':
        this.noiseSuppressor = new NoiseSuppressor(this.audioContext, this.config.noiseSuppression);
        await this.noiseSuppressor.initialize();
        break;
      case 'agc':
        this.agc = new AutomaticGainControl(this.audioContext, this.config.agc);
        await this.agc.initialize();
        break;
      case 'voiceFocus':
        this.voiceFocus = new VoiceFocus(this.audioContext, this.config.voiceFocus);
        await this.voiceFocus.initialize();
        break;
    }

    // Reconnect nodes
    await this.reconnectNodes();
  }

  /**
   * Remove a specific processing node
   */
  async removeNode(feature) {
    switch (feature) {
      case 'noiseSuppression':
        if (this.noiseSuppressor) {
          await this.noiseSuppressor.destroy();
          this.noiseSuppressor = null;
        }
        break;
      case 'agc':
        if (this.agc) {
          await this.agc.destroy();
          this.agc = null;
        }
        break;
      case 'voiceFocus':
        if (this.voiceFocus) {
          await this.voiceFocus.destroy();
          this.voiceFocus = null;
        }
        break;
    }

    // Reconnect nodes
    await this.reconnectNodes();
  }

  /**
   * Reconnect all nodes after changes
   */
  async reconnectNodes() {
    const nodes = [];
    if (this.noiseSuppressor) nodes.push(this.noiseSuppressor);
    if (this.agc) nodes.push(this.agc);
    if (this.voiceFocus) nodes.push(this.voiceFocus);
    this.connectNodes(nodes);
  }

  /**
   * Clean up resources
   */
  async destroy() {
    this.isProcessing = false;
    this.isInitialized = false;

    // Destroy processing nodes
    if (this.noiseSuppressor) {
      await this.noiseSuppressor.destroy();
      this.noiseSuppressor = null;
    }
    if (this.agc) {
      await this.agc.destroy();
      this.agc = null;
    }
    if (this.voiceFocus) {
      await this.voiceFocus.destroy();
      this.voiceFocus = null;
    }

    // Close audio context
    if (this.audioContext && this.audioContext.state !== 'closed') {
      await this.audioContext.close();
      this.audioContext = null;
    }
    this.emit('destroyed');
  }
}

/**
 * ColorCorrection class
 * Implements real-time color adjustment using WebGL shaders
 */

class ColorCorrection extends EventEmitter {
  constructor(gl, config) {
    super();
    this.gl = gl;
    this.config = {
      brightness: 1.0,
      contrast: 1.0,
      saturation: 1.0,
      gamma: 1.0,
      ...config
    };

    // WebGL resources
    this.program = null;
    this.texture = null;
    this.framebuffer = null;
    this.vertexBuffer = null;
    this.texCoordBuffer = null;

    // State
    this.isInitialized = false;
  }

  /**
   * Initialize the color correction processor
   */
  async initialize() {
    try {
      // Create shader program
      this.program = this.createShaderProgram();

      // Create texture
      this.texture = this.gl.createTexture();

      // Create framebuffer
      this.framebuffer = this.gl.createFramebuffer();

      // Create vertex buffers
      this.createBuffers();
      this.isInitialized = true;
      this.emit('initialized');
    } catch (error) {
      this.emit('error', new Error(`Failed to initialize ColorCorrection: ${error.message}`));
      throw error;
    }
  }

  /**
   * Create shader program
   */
  createShaderProgram() {
    const vertexShader = this.createShader(this.gl.VERTEX_SHADER, SHADER_CONSTANTS.VERTEX_SHADER);
    const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, SHADER_CONSTANTS.FRAGMENT_SHADER_COLOR_CORRECTION);
    const program = this.gl.createProgram();
    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);
    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      throw new Error('Failed to link shader program: ' + this.gl.getProgramInfoLog(program));
    }
    return program;
  }

  /**
   * Create shader
   */
  createShader(type, source) {
    const shader = this.gl.createShader(type);
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      throw new Error('Failed to compile shader: ' + this.gl.getShaderInfoLog(shader));
    }
    return shader;
  }

  /**
   * Create vertex buffers
   */
  createBuffers() {
    // Vertex positions (full-screen quad)
    const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    this.vertexBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);

    // Texture coordinates
    const texCoords = new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]);
    this.texCoordBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.texCoordBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, texCoords, this.gl.STATIC_DRAW);
  }

  /**
   * Process ImageData using WebGL
   */
  async process(imageData) {
    if (!this.isInitialized) {
      throw new Error('ColorCorrection not initialized');
    }

    // Create texture from ImageData
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, imageData);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

    // Set up framebuffer
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer);
    this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.texture, 0);

    // Use shader program
    this.gl.useProgram(this.program);

    // Set uniforms
    this.setUniforms();

    // Set up attributes
    this.setupAttributes();

    // Draw
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);

    // Read back pixels
    const pixels = new Uint8ClampedArray(imageData.data.length);
    this.gl.readPixels(0, 0, imageData.width, imageData.height, this.gl.RGBA, this.gl.UNSIGNED_BYTE, pixels);

    // Create new ImageData
    return new ImageData(pixels, imageData.width, imageData.height);
  }

  /**
   * Process ImageData using canvas (fallback)
   */
  processCanvas(imageData) {
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d');

    // Put original image data
    ctx.putImageData(imageData, 0, 0);

    // Apply color correction using canvas filters
    ctx.filter = `brightness(${this.config.brightness}) contrast(${this.config.contrast}) saturate(${this.config.saturation})`;

    // Draw with filter
    ctx.drawImage(canvas, 0, 0);

    // Get processed data
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  /**
   * Set shader uniforms
   */
  setUniforms() {
    const brightnessLocation = this.gl.getUniformLocation(this.program, 'u_brightness');
    const contrastLocation = this.gl.getUniformLocation(this.program, 'u_contrast');
    const saturationLocation = this.gl.getUniformLocation(this.program, 'u_saturation');
    const gammaLocation = this.gl.getUniformLocation(this.program, 'u_gamma');
    this.gl.uniform1f(brightnessLocation, this.config.brightness);
    this.gl.uniform1f(contrastLocation, this.config.contrast);
    this.gl.uniform1f(saturationLocation, this.config.saturation);
    this.gl.uniform1f(gammaLocation, this.config.gamma);
  }

  /**
   * Set up vertex attributes
   */
  setupAttributes() {
    // Position attribute
    const positionLocation = this.gl.getAttribLocation(this.program, 'a_position');
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
    this.gl.enableVertexAttribArray(positionLocation);
    this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);

    // Texture coordinate attribute
    const texCoordLocation = this.gl.getAttribLocation(this.program, 'a_texCoord');
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.texCoordBuffer);
    this.gl.enableVertexAttribArray(texCoordLocation);
    this.gl.vertexAttribPointer(texCoordLocation, 2, this.gl.FLOAT, false, 0, 0);
  }

  /**
   * Set brightness
   */
  setBrightness(brightness) {
    this.config.brightness = clamp(brightness, VIDEO_CONSTANTS.BRIGHTNESS_MIN, VIDEO_CONSTANTS.BRIGHTNESS_MAX);
    this.emit('brightness:changed', {
      brightness: this.config.brightness
    });
  }

  /**
   * Set contrast
   */
  setContrast(contrast) {
    this.config.contrast = clamp(contrast, VIDEO_CONSTANTS.CONTRAST_MIN, VIDEO_CONSTANTS.CONTRAST_MAX);
    this.emit('contrast:changed', {
      contrast: this.config.contrast
    });
  }

  /**
   * Set saturation
   */
  setSaturation(saturation) {
    this.config.saturation = clamp(saturation, VIDEO_CONSTANTS.SATURATION_MIN, VIDEO_CONSTANTS.SATURATION_MAX);
    this.emit('saturation:changed', {
      saturation: this.config.saturation
    });
  }

  /**
   * Set gamma
   */
  setGamma(gamma) {
    this.config.gamma = clamp(gamma, 0.1, 3.0);
    this.emit('gamma:changed', {
      gamma: this.config.gamma
    });
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig) {
    this.config = {
      ...this.config,
      ...newConfig
    };
    this.emit('config:updated', {
      config: this.config
    });
  }

  /**
   * Get current statistics
   */
  getStats() {
    return {
      brightness: this.config.brightness,
      contrast: this.config.contrast,
      saturation: this.config.saturation,
      gamma: this.config.gamma
    };
  }

  /**
   * Clean up resources
   */
  async destroy() {
    this.isInitialized = false;
    if (this.program) {
      this.gl.deleteProgram(this.program);
      this.program = null;
    }
    if (this.texture) {
      this.gl.deleteTexture(this.texture);
      this.texture = null;
    }
    if (this.framebuffer) {
      this.gl.deleteFramebuffer(this.framebuffer);
      this.framebuffer = null;
    }
    if (this.vertexBuffer) {
      this.gl.deleteBuffer(this.vertexBuffer);
      this.vertexBuffer = null;
    }
    if (this.texCoordBuffer) {
      this.gl.deleteBuffer(this.texCoordBuffer);
      this.texCoordBuffer = null;
    }
    this.emit('destroyed');
  }
}

/**
 * BackgroundBlur class
 * Implements background blurring (placeholder for AI-based segmentation)
 */

class BackgroundBlur extends EventEmitter {
  constructor(gl, config) {
    super();
    this.gl = gl;
    this.config = {
      intensity: 15,
      model: 'simple',
      // 'simple', 'bodypix', 'mediapipe'
      ...config
    };
    this.isInitialized = false;
  }
  async initialize() {
    this.isInitialized = true;
    this.emit('initialized');
  }
  async process(imageData) {
    return this.processCanvas(imageData);
  }
  processCanvas(imageData) {
    // Simple implementation: blur the entire image
    // In a real implementation, you would use AI models like BodyPix or MediaPipe
    // to segment the person and only blur the background

    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d');

    // Put original image data
    ctx.putImageData(imageData, 0, 0);

    // Apply blur filter
    ctx.filter = `blur(${this.config.intensity}px)`;
    ctx.drawImage(canvas, 0, 0);

    // Get processed data
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }
  setIntensity(intensity) {
    this.config.intensity = clamp(intensity, VIDEO_CONSTANTS.BLUR_MIN_INTENSITY, VIDEO_CONSTANTS.BLUR_MAX_INTENSITY);
    this.emit('intensity:changed', {
      intensity: this.config.intensity
    });
  }
  updateConfig(newConfig) {
    this.config = {
      ...this.config,
      ...newConfig
    };
    this.emit('config:updated', {
      config: this.config
    });
  }
  getStats() {
    return {
      ...this.config
    };
  }
  async destroy() {
    this.isInitialized = false;
    this.emit('destroyed');
  }
}

/**
 * LowLightCompensation class
 * Enhances visibility in poor lighting conditions
 */

class LowLightCompensation extends EventEmitter {
  constructor(gl, config) {
    super();
    this.gl = gl;
    this.config = {
      threshold: 0.3,
      boost: 1.5,
      preserveColors: true,
      ...config
    };
    this.isInitialized = false;
  }
  async initialize() {
    this.isInitialized = true;
    this.emit('initialized');
  }
  async process(imageData) {
    return this.processCanvas(imageData);
  }
  processCanvas(imageData) {
    const data = imageData.data;
    const threshold = this.config.threshold * 255;
    const boost = this.config.boost;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Calculate luminance
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
      if (luminance < threshold) {
        // Apply boost to dark pixels
        const boostFactor = 1 + (boost - 1) * (1 - luminance / threshold);
        if (this.config.preserveColors) {
          data[i] = clamp(r * boostFactor, 0, 255);
          data[i + 1] = clamp(g * boostFactor, 0, 255);
          data[i + 2] = clamp(b * boostFactor, 0, 255);
        } else {
          const enhanced = clamp(luminance * boostFactor, 0, 255);
          data[i] = enhanced;
          data[i + 1] = enhanced;
          data[i + 2] = enhanced;
        }
      }
    }
    return imageData;
  }
  updateConfig(newConfig) {
    this.config = {
      ...this.config,
      ...newConfig
    };
    this.emit('config:updated', {
      config: this.config
    });
  }
  getStats() {
    return {
      ...this.config
    };
  }
  async destroy() {
    this.isInitialized = false;
    this.emit('destroyed');
  }
}

/**
 * VideoProcessor class
 * Handles real-time video enhancement including color correction, background blur, and low-light compensation
 */

class VideoProcessor extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.canvas = null;
    this.gl = null;
    this.ctx = null;

    // Processing modules
    this.colorCorrection = null;
    this.backgroundBlur = null;
    this.lowLightCompensation = null;

    // State
    this.isInitialized = false;
    this.isProcessing = false;
    this.frameCount = 0;
    this.stats = {
      processedFrames: 0,
      currentFPS: 0,
      processingTime: 0,
      lastFrameTime: 0
    };
  }

  /**
   * Initialize the video processor
   */
  async initialize() {
    console.log('[VideoProcessor] initialize() called');
    try {
      // Lowered resolution for performance
      const LOW_RES_WIDTH = 160;
      const LOW_RES_HEIGHT = 120;

      // Create WebGL canvas for video processing
      console.log('[VideoProcessor] Creating WebGL canvas');
      this.webglCanvas = document.createElement('canvas');
      this.webglCanvas.width = LOW_RES_WIDTH;
      this.webglCanvas.height = LOW_RES_HEIGHT;
      // Create WebGL context
      console.log('[VideoProcessor] Creating WebGL context');
      this.gl = createVideoContext(this.webglCanvas);
      if (!this.gl) {
        throw new Error('Failed to get WebGL context for video processing');
      }

      // Create 2D canvas for fallback and frame processing
      console.log('[VideoProcessor] Creating 2D canvas');
      this.canvas = document.createElement('canvas');
      this.canvas.width = LOW_RES_WIDTH;
      this.canvas.height = LOW_RES_HEIGHT;
      // Create 2D context
      console.log('[VideoProcessor] Creating 2D context');
      this.ctx = this.canvas.getContext('2d');
      if (!this.ctx) {
        throw new Error('Failed to get 2D context for video processing canvas');
      }

      // Create processing modules based on config
      console.log('[VideoProcessor] Creating processing modules', this.config);
      await this.createProcessingModules();
      console.log('[VideoProcessor] Processing modules created');
      this.isInitialized = true;
      this.emit('initialized');
      console.log('[VideoProcessor] Initialization complete');
    } catch (error) {
      console.error('[VideoProcessor] Failed to initialize:', error);
      this.emit('error', new Error(`Failed to initialize VideoProcessor: ${error.message}`));
      throw error;
    }
  }

  /**
   * Create processing modules based on configuration
   */
  async createProcessingModules() {
    // Create color correction if enabled
    if (this.config.colorCorrection?.enabled) {
      console.log('[VideoProcessor] Initializing ColorCorrection', this.config.colorCorrection);
      this.colorCorrection = new ColorCorrection(this.gl, this.config.colorCorrection);
      await this.colorCorrection.initialize();
      console.log('[VideoProcessor] ColorCorrection initialized');
    }

    // Create low-light compensation if enabled
    if (this.config.lowLightCompensation?.enabled) {
      console.log('[VideoProcessor] Initializing LowLightCompensation', this.config.lowLightCompensation);
      this.lowLightCompensation = new LowLightCompensation(this.gl, this.config.lowLightCompensation);
      await this.lowLightCompensation.initialize();
      console.log('[VideoProcessor] LowLightCompensation initialized');
    }

    // Create background blur if enabled
    if (this.config.backgroundBlur?.enabled) {
      console.log('[VideoProcessor] Initializing BackgroundBlur', this.config.backgroundBlur);
      this.backgroundBlur = new BackgroundBlur(this.gl, this.config.backgroundBlur);
      await this.backgroundBlur.initialize();
      console.log('[VideoProcessor] BackgroundBlur initialized');
    }
  }

  /**
   * Process a MediaStream and return enhanced video stream
   */
  async process(stream) {
    console.log('[VideoProcessor] process() called');
    if (!this.isInitialized) {
      console.log('[VideoProcessor] returning: not initialized');
      throw new Error('VideoProcessor not initialized');
    }
    if (!stream || !(stream instanceof MediaStream)) {
      console.log('[VideoProcessor] returning: invalid MediaStream');
      throw new Error('Invalid MediaStream provided');
    }
    try {
      this.isProcessing = true;
      this.emit('processing:start');
      // Get video tracks
      const videoTracks = stream.getVideoTracks();
      console.log('[VideoProcessor] videoTracks:', videoTracks);
      if (videoTracks.length === 0) {
        this.emit('processing:complete', {
          stream
        });
        console.log('[VideoProcessor] processing:complete emitted (no video tracks)', stream);
        console.log('[VideoProcessor] returning: no video tracks');
        return stream; // No video tracks to process
      }

      // Create video element to capture frames
      const video = document.createElement('video');
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;

      // Wait for video to be ready
      await new Promise(resolve => {
        video.onloadedmetadata = () => {
          console.log('[VideoProcessor] video.onloadedmetadata fired');
          resolve();
        };
        video.play();
      });
      console.log('[VideoProcessor] video element ready, videoWidth:', video.videoWidth, 'videoHeight:', video.videoHeight);

      // Set canvas size to match video
      this.canvas.width = video.videoWidth;
      this.canvas.height = video.videoHeight;
      console.log('[VideoProcessor] canvas size set:', this.canvas.width, this.canvas.height);

      // Create MediaStreamTrackProcessor if supported
      if (window.MediaStreamTrackProcessor) {
        console.log('[VideoProcessor] using MediaStreamTrackProcessor');
        return this.processWithTrackProcessor(stream);
      } else {
        console.log('[VideoProcessor] using processWithCanvas');
        return this.processWithCanvas(stream, video);
      }
    } catch (error) {
      this.isProcessing = false;
      this.emit('error', error);
      console.log('[VideoProcessor] error thrown:', error);
      throw error;
    }
  }

  /**
   * Process video using MediaStreamTrackProcessor (modern browsers)
   */
  async processWithTrackProcessor(stream) {
    const videoTrack = stream.getVideoTracks()[0];
    const processor = new MediaStreamTrackProcessor({
      track: videoTrack
    });
    const generator = new MediaStreamTrackGenerator({
      kind: 'video'
    });

    // Process frames
    const reader = processor.readable.getReader();
    const writer = generator.writable.getWriter();
    const processFrame = async () => {
      try {
        const {
          value: frame,
          done
        } = await reader.read();
        if (done) return;

        // Process the frame
        const processedFrame = await this.processVideoFrame(frame);

        // Write processed frame
        await writer.write(processedFrame);
        this.frameCount++;
        this.updateStats();

        // Continue processing
        processFrame();
      } catch (error) {
        this.emit('error', error);
      }
    };
    processFrame();

    // Create new stream with processed video
    const processedStream = new MediaStream([generator, ...stream.getAudioTracks()]);
    console.log('[VideoProcessor] Processed stream created:', processedStream);
    this.isProcessing = false;
    this.emit('processing:complete', {
      stream: processedStream
    });
    console.log('[VideoProcessor] processing:complete emitted', processedStream);
    return processedStream;
  }

  /**
   * Process video using canvas (fallback for older browsers)
   */
  async processWithCanvas(stream, video) {
    console.log('[VideoProcessor] processWithCanvas called');
    // Create canvas stream
    const canvasStream = this.canvas.captureStream(VIDEO_CONSTANTS.DEFAULT_FPS);

    // Start frame processing
    this.startFrameProcessing(video);

    // Create new stream with processed video
    const processedStream = new MediaStream([...canvasStream.getVideoTracks(), ...stream.getAudioTracks()]);

    // Debug: Log that processed stream is created
    console.log('[VideoProcessor] Processed stream created:', processedStream);

    // Force: Set the video element's srcObject if available
    if (window.demoVideoElement) {
      console.log('[VideoProcessor] Setting video element srcObject to processed stream');
      window.demoVideoElement.srcObject = processedStream;
    }
    this.isProcessing = false;
    this.emit('processing:complete', {
      stream: processedStream
    });
    console.log('[VideoProcessor] processing:complete emitted', processedStream);
    return processedStream;
  }

  /**
   * Start frame processing loop (process only when previous frame is done)
   */
  startFrameProcessing(video) {
    console.log('[VideoProcessor] startFrameProcessing called');
    const processFrame = () => {
      if (!this.isProcessing) return;
      const startTime = performance.now();
      this.processCanvasFrame(video);
      this.frameCount++;
      this.updateStats(startTime);
      requestAnimationFrame(processFrame);
    };
    requestAnimationFrame(processFrame);
  }

  /**
   * Process a video frame
   */
  async processVideoFrame(frame) {
    // Convert VideoFrame to ImageData for processing
    const imageData = await this.frameToImageData(frame);

    // Apply processing modules
    let processedData = imageData;
    if (this.lowLightCompensation) {
      processedData = await this.lowLightCompensation.process(processedData);
    }
    if (this.colorCorrection) {
      processedData = await this.colorCorrection.process(processedData);
    }
    if (this.backgroundBlur) {
      processedData = await this.backgroundBlur.process(processedData);
    }

    // Convert back to VideoFrame
    return await this.imageDataToFrame(processedData, frame);
  }

  /**
   * Process canvas frame
   */
  processCanvasFrame(video) {
    // Use fast canvas filter if available
    const brightness = this.config.colorCorrection?.brightness || 1.0;
    const contrast = this.config.colorCorrection?.contrast || 1.0;
    if (this.ctx.filter !== undefined) {
      this.ctx.filter = `brightness(${brightness}) contrast(${contrast})`;
      this.ctx.drawImage(video, 0, 0, this.canvas.width, this.canvas.height);
      this.ctx.filter = 'none';
    } else {
      // Fallback: just draw the frame, no per-pixel processing
      this.ctx.drawImage(video, 0, 0, this.canvas.width, this.canvas.height);
    }
    // For advanced effects, use WebGL shaders or OffscreenCanvas in a worker.
  }

  /**
   * Convert VideoFrame to ImageData
   */
  async frameToImageData(frame) {
    const canvas = document.createElement('canvas');
    canvas.width = frame.displayWidth;
    canvas.height = frame.displayHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(frame, 0, 0);
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  /**
   * Convert ImageData to VideoFrame
   */
  async imageDataToFrame(imageData, originalFrame) {
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d');
    ctx.putImageData(imageData, 0, 0);

    // Create new VideoFrame from canvas
    return new VideoFrame(canvas, {
      timestamp: originalFrame.timestamp,
      duration: originalFrame.duration
    });
  }

  /**
   * Update processing statistics
   */
  updateStats(startTime = null) {
    const now = performance.now();
    if (startTime) {
      this.stats.processingTime = now - startTime;
    }

    // Calculate FPS
    if (this.stats.lastFrameTime > 0) {
      const frameTime = now - this.stats.lastFrameTime;
      this.stats.currentFPS = 1000 / frameTime;
    }
    this.stats.lastFrameTime = now;
    this.stats.processedFrames = this.frameCount;
    this.emit('stats:updated', this.stats);
  }

  /**
   * Update configuration
   */
  async updateConfig(newConfig) {
    this.config = {
      ...this.config,
      ...newConfig
    };

    // Reinitialize if needed
    if (this.isInitialized) {
      await this.destroy();
      await this.initialize();
    }
    this.emit('config:updated', {
      config: this.config
    });
  }

  /**
   * Get current statistics
   */
  getStats() {
    return {
      ...this.stats
    };
  }

  /**
   * Enable/disable specific features
   */
  async setFeature(feature, enabled) {
    const featureMap = {
      colorCorrection: 'colorCorrection',
      lowLightCompensation: 'lowLightCompensation',
      backgroundBlur: 'backgroundBlur'
    };
    const moduleName = featureMap[feature];
    if (!moduleName) {
      throw new Error(`Unknown feature: ${feature}`);
    }
    if (enabled && !this[moduleName]) {
      // Create and initialize the module
      await this.createModule(feature);
    } else if (!enabled && this[moduleName]) {
      // Remove the module
      await this.removeModule(feature);
    }
    this.config[feature].enabled = enabled;
  }

  /**
   * Create a specific processing module
   */
  async createModule(feature) {
    switch (feature) {
      case 'colorCorrection':
        this.colorCorrection = new ColorCorrection(this.gl, this.config.colorCorrection);
        await this.colorCorrection.initialize();
        break;
      case 'lowLightCompensation':
        this.lowLightCompensation = new LowLightCompensation(this.gl, this.config.lowLightCompensation);
        await this.lowLightCompensation.initialize();
        break;
      case 'backgroundBlur':
        this.backgroundBlur = new BackgroundBlur(this.gl, this.config.backgroundBlur);
        await this.backgroundBlur.initialize();
        break;
    }
  }

  /**
   * Remove a specific processing module
   */
  async removeModule(feature) {
    switch (feature) {
      case 'colorCorrection':
        if (this.colorCorrection) {
          await this.colorCorrection.destroy();
          this.colorCorrection = null;
        }
        break;
      case 'lowLightCompensation':
        if (this.lowLightCompensation) {
          await this.lowLightCompensation.destroy();
          this.lowLightCompensation = null;
        }
        break;
      case 'backgroundBlur':
        if (this.backgroundBlur) {
          await this.backgroundBlur.destroy();
          this.backgroundBlur = null;
        }
        break;
    }
  }

  /**
   * Clean up resources
   */
  async destroy() {
    this.isProcessing = false;
    this.isInitialized = false;

    // Destroy processing modules
    if (this.colorCorrection) {
      await this.colorCorrection.destroy();
      this.colorCorrection = null;
    }
    if (this.lowLightCompensation) {
      await this.lowLightCompensation.destroy();
      this.lowLightCompensation = null;
    }
    if (this.backgroundBlur) {
      await this.backgroundBlur.destroy();
      this.backgroundBlur = null;
    }

    // Clean up canvas and contexts
    if (this.canvas) {
      this.canvas.width = 0;
      this.canvas.height = 0;
      this.canvas = null;
    }
    this.gl = null;
    this.ctx = null;
    this.emit('destroyed');
  }
}

/**
 * Main MediaProcessor class
 * Orchestrates audio and video enhancement processing
 */

class MediaProcessor extends EventEmitter {
  constructor(config = {}) {
    super();

    // Validate and set default configuration
    this.config = this.mergeConfig(config);
    console.log('MediaProcessor config:', this.config);

    // Initialize processors
    this.audioProcessor = null;
    this.videoProcessor = null;

    // State management
    this.isProcessing = false;
    this.isDestroyed = false;

    // Initialize processors based on config
    this.initializeProcessors();
  }

  /**
   * Merge user config with defaults
   */
  mergeConfig(userConfig) {
    const defaultConfig = {
      audio: {
        noiseSuppression: {
          enabled: false,
          intensity: 'medium',
          // 'low', 'medium', 'high'
          model: 'rnnoise' // 'rnnoise', 'spectral'
        },
        agc: {
          enabled: false,
          targetLevel: -20,
          // dB
          compressionRatio: 3,
          attackTime: 0.1,
          // seconds
          releaseTime: 0.5 // seconds
        },
        voiceFocus: {
          enabled: false,
          sensitivity: 0.8,
          // 0-1
          frequencyRange: [85, 255] // Hz
        }
      },
      video: {
        colorCorrection: {
          enabled: false,
          brightness: 1.0,
          contrast: 1.0,
          saturation: 1.0,
          gamma: 1.0
        },
        lowLightCompensation: {
          enabled: false,
          threshold: 0.3,
          // 0-1
          boost: 1.5,
          preserveColors: true
        },
        backgroundBlur: {
          enabled: false,
          intensity: 15,
          // blur radius
          model: 'bodypix' // 'bodypix', 'mediapipe'
        },
        backgroundReplace: {
          enabled: false,
          image: null,
          // URL or ImageData
          model: 'bodypix'
        }
      },
      performance: {
        targetFPS: 30,
        quality: 'balanced',
        // 'low', 'balanced', 'high'
        useWebGL: true,
        useWebWorkers: false
      }
    };
    return this.deepMerge(defaultConfig, userConfig);
  }

  /**
   * Initialize audio and video processors
   */
  async initializeProcessors() {
    try {
      // Initialize audio processor if audio features are enabled
      if (this.hasAudioFeatures()) {
        this.audioProcessor = new AudioProcessor(this.config.audio);
        await this.audioProcessor.initialize();
      }

      // Debug log for video features
      console.log('hasVideoFeatures:', this.hasVideoFeatures());
      console.log('video config:', this.config.video);

      // Initialize video processor if video features are enabled
      if (this.hasVideoFeatures()) {
        this.videoProcessor = new VideoProcessor(this.config.video);
        await this.videoProcessor.initialize();
      }
      this.emit('initialized');
    } catch (error) {
      this.emit('error', new Error(`Failed to initialize processors: ${error.message}`));
    }
  }

  /**
   * Process a MediaStream and return enhanced stream
   */
  async process(stream) {
    console.log('[MediaProcessor] process() called');
    if (this.isDestroyed) {
      console.log('[MediaProcessor] returning: destroyed');
      throw new Error('MediaProcessor has been destroyed');
    }
    if (!stream || !(stream instanceof MediaStream)) {
      console.log('[MediaProcessor] returning: invalid MediaStream');
      throw new Error('Invalid MediaStream provided');
    }
    try {
      this.isProcessing = true;
      this.emit('processing:start');
      let processedStream = stream;
      // Process audio if enabled
      if (this.audioProcessor && this.hasAudioFeatures()) {
        const audioTracks = stream.getAudioTracks();
        console.log('[MediaProcessor] audioTracks:', audioTracks);
        if (audioTracks.length > 0) {
          processedStream = await this.audioProcessor.process(processedStream);
          console.log('[MediaProcessor] after audioProcessor.process');
        }
      }
      // Process video if enabled
      if (this.videoProcessor && this.hasVideoFeatures()) {
        const videoTracks = stream.getVideoTracks();
        console.log('[MediaProcessor] videoTracks:', videoTracks);
        if (videoTracks.length > 0) {
          processedStream = await this.videoProcessor.process(processedStream);
          console.log('[MediaProcessor] after videoProcessor.process');
        }
      }
      this.isProcessing = false;
      this.emit('processing:complete', {
        stream: processedStream
      });
      console.log('[MediaProcessor] Emitting processing:complete', processedStream);
      console.log('[MediaProcessor] returning: processedStream');
      return processedStream;
    } catch (error) {
      this.isProcessing = false;
      this.emit('error', error);
      console.log('[MediaProcessor] error thrown:', error);
      throw error;
    }
  }

  /**
   * Update configuration
   */
  async updateConfig(newConfig) {
    if (this.isDestroyed) {
      throw new Error('MediaProcessor has been destroyed');
    }
    const oldConfig = this.config;
    this.config = this.mergeConfig(newConfig);

    // Reinitialize processors if needed
    const needsReinit = this.configChanged(oldConfig, this.config);
    if (needsReinit) {
      await this.initializeProcessors();
    }
    this.emit('config:updated', {
      config: this.config
    });
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return JSON.parse(JSON.stringify(this.config)); // Deep copy
  }

  /**
   * Get processing statistics
   */
  getStats() {
    const stats = {
      isProcessing: this.isProcessing,
      audio: this.audioProcessor ? this.audioProcessor.getStats() : null,
      video: this.videoProcessor ? this.videoProcessor.getStats() : null
    };
    return stats;
  }

  /**
   * Check if any audio features are enabled
   */
  hasAudioFeatures() {
    const audio = this.config.audio;
    return audio.noiseSuppression.enabled || audio.agc.enabled || audio.voiceFocus.enabled;
  }

  /**
   * Check if any video features are enabled
   */
  hasVideoFeatures() {
    const video = this.config.video;
    return video.colorCorrection.enabled || video.lowLightCompensation.enabled || video.backgroundBlur.enabled || video.backgroundReplace.enabled;
  }

  /**
   * Check if configuration has changed significantly
   */
  configChanged(oldConfig, newConfig) {
    // Simple deep comparison - in production, you might want a more sophisticated approach
    return JSON.stringify(oldConfig) !== JSON.stringify(newConfig);
  }

  /**
   * Deep merge objects
   */
  deepMerge(target, source) {
    const result = {
      ...target
    };
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    return result;
  }

  /**
   * Clean up resources
   */
  async destroy() {
    if (this.isDestroyed) return;
    this.isDestroyed = true;
    this.isProcessing = false;

    // Clean up processors
    if (this.audioProcessor) {
      await this.audioProcessor.destroy();
      this.audioProcessor = null;
    }
    if (this.videoProcessor) {
      await this.videoProcessor.destroy();
      this.videoProcessor = null;
    }
    this.emit('destroyed');
    this.removeAllListeners();
  }
}

export { AUDIO_QUALITY_PRESETS, AudioProcessor, MediaProcessor, PROCESSING_MODES, VIDEO_QUALITY_PRESETS, VideoProcessor, createAudioContext, createVideoContext, getCapabilities, isSupported };
//# sourceMappingURL=index.esm.js.map
