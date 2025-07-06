/**
 * Main MediaProcessor class
 * Orchestrates audio and video enhancement processing
 */

import { AudioProcessor } from '../audio/AudioProcessor';
import { VideoProcessor } from '../video/VideoProcessor';
import { EventEmitter } from './EventEmitter';
import { validateConfig } from './utils';

export class MediaProcessor extends EventEmitter {
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
          intensity: 'medium', // 'low', 'medium', 'high'
          model: 'rnnoise' // 'rnnoise', 'spectral'
        },
        agc: {
          enabled: false,
          targetLevel: -20, // dB
          compressionRatio: 3,
          attackTime: 0.1, // seconds
          releaseTime: 0.5 // seconds
        },
        voiceFocus: {
          enabled: false,
          sensitivity: 0.8, // 0-1
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
          threshold: 0.3, // 0-1
          boost: 1.5,
          preserveColors: true
        },
        backgroundBlur: {
          enabled: false,
          intensity: 15, // blur radius
          model: 'bodypix' // 'bodypix', 'mediapipe'
        },
        backgroundReplace: {
          enabled: false,
          image: null, // URL or ImageData
          model: 'bodypix'
        }
      },
      performance: {
        targetFPS: 30,
        quality: 'balanced', // 'low', 'balanced', 'high'
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
      this.emit('processing:complete', { stream: processedStream });
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

    this.emit('config:updated', { config: this.config });
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
    return audio.noiseSuppression.enabled || 
           audio.agc.enabled || 
           audio.voiceFocus.enabled;
  }

  /**
   * Check if any video features are enabled
   */
  hasVideoFeatures() {
    const video = this.config.video;
    return video.colorCorrection.enabled || 
           video.lowLightCompensation.enabled || 
           video.backgroundBlur.enabled || 
           video.backgroundReplace.enabled;
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
    const result = { ...target };
    
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