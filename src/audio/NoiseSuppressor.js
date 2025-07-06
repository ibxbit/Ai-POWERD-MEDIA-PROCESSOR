/**
 * NoiseSuppressor class
 * Implements spectral noise suppression for real-time audio processing
 */

import { EventEmitter } from '../core/EventEmitter';
import { AUDIO_CONSTANTS } from '../core/constants';

export class NoiseSuppressor extends EventEmitter {
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
      low: { threshold: 0.3, reduction: 0.5 },
      medium: { threshold: 0.2, reduction: 0.7 },
      high: { threshold: 0.1, reduction: 0.9 }
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
      this.scriptProcessor = this.audioContext.createScriptProcessor(
        AUDIO_CONSTANTS.DEFAULT_BUFFER_SIZE,
        1, // input channels
        1  // output channels
      );

      // Set up processing
      this.scriptProcessor.onaudioprocess = (event) => {
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
    this.emit('processed', { frame: this.frameCount, reduction: noiseReduction });
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
    return new Promise((resolve) => {
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
          this.emit('noiseProfile:learned', { profile: this.noiseProfile });
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
    this.config = { ...this.config, ...newConfig };
    this.emit('config:updated', { config: this.config });
  }

  /**
   * Set noise suppression intensity
   */
  setIntensity(intensity) {
    if (!this.intensitySettings[intensity]) {
      throw new Error(`Invalid intensity: ${intensity}. Must be 'low', 'medium', or 'high'`);
    }
    
    this.config.intensity = intensity;
    this.emit('intensity:changed', { intensity });
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