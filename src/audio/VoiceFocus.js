/**
 * VoiceFocus class
 * Implements frequency-based voice enhancement and background noise reduction
 */

import { EventEmitter } from '../core/EventEmitter';
import { dbToGain, gainToDb, clamp } from '../core/utils';
import { AUDIO_CONSTANTS } from '../core/constants';

export class VoiceFocus extends EventEmitter {
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
      const sensitivityGain = 1.0 + (this.config.sensitivity * voiceActivity);
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
    
    // Calculate frequency bins for voice range
    const lowBin = Math.floor(lowFreq / binSize);
    const highBin = Math.floor(highFreq / binSize);
    
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
    this.voiceConfidence = this.voiceConfidence * this.smoothingFactor + 
                          voiceRatio * (1 - this.smoothingFactor);
    
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
    const dynamicEnhancement = 1.0 + (voiceActivity * 0.5);
    
    // Combine enhancements
    const totalEnhancement = this.voiceDetected ? 
      baseEnhancement * dynamicEnhancement : 1.0;
    
    return clamp(totalEnhancement, 0.5, 2.0);
  }

  /**
   * Set voice detection sensitivity
   */
  setSensitivity(sensitivity) {
    this.config.sensitivity = clamp(sensitivity, 0, 1);
    this.emit('sensitivity:changed', { sensitivity: this.config.sensitivity });
  }

  /**
   * Set voice frequency range
   */
  setFrequencyRange(lowFreq, highFreq) {
    this.config.frequencyRange = [
      clamp(lowFreq, 50, 500),
      clamp(highFreq, 200, 1000)
    ];
    
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
      this.highPassFilter.frequency.setValueAtTime(
        lowFreq * 0.8, 
        this.audioContext.currentTime
      );
    }
    
    if (this.lowPassFilter) {
      this.lowPassFilter.frequency.setValueAtTime(
        highFreq * 1.2, 
        this.audioContext.currentTime
      );
    }
    
    if (this.voiceBandFilter) {
      this.voiceBandFilter.frequency.setValueAtTime(
        (lowFreq + highFreq) / 2, 
        this.audioContext.currentTime
      );
    }
  }

  /**
   * Set voice detection threshold
   */
  setVoiceThreshold(threshold) {
    this.voiceThreshold = clamp(threshold, 0, 1);
    this.emit('voiceThreshold:changed', { threshold: this.voiceThreshold });
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
    this.config = { ...this.config, ...newConfig };
    
    if (newConfig.frequencyRange) {
      this.updateFilters();
    }
    
    this.emit('config:updated', { config: this.config });
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