/**
 * AutomaticGainControl class
 * Implements dynamic gain adjustment for consistent audio levels
 */

import { EventEmitter } from '../core/EventEmitter';
import { dbToGain, gainToDb, clamp } from '../core/utils';
import { AUDIO_CONSTANTS } from '../core/constants';

export class AutomaticGainControl extends EventEmitter {
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
      this.scriptProcessor = this.audioContext.createScriptProcessor(
        AUDIO_CONSTANTS.DEFAULT_BUFFER_SIZE,
        1, // input channels
        1  // output channels
      );

      // Set up processing
      this.scriptProcessor.onaudioprocess = (event) => {
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
      this.currentGain = this.currentGain * this.attackCoeff + 
                        newTargetGain * (1 - this.attackCoeff);
    } else {
      // Release phase
      this.currentGain = this.currentGain * this.releaseCoeff + 
                        newTargetGain * (1 - this.releaseCoeff);
    }
    
    // Update gain node
    this.gainNode.gain.setValueAtTime(this.currentGain, this.audioContext.currentTime);
  }

  /**
   * Set target level in dB
   */
  setTargetLevel(level) {
    this.config.targetLevel = clamp(level, -60, 0);
    this.emit('targetLevel:changed', { level: this.config.targetLevel });
  }

  /**
   * Set compression ratio
   */
  setCompressionRatio(ratio) {
    this.config.compressionRatio = clamp(ratio, 1, 20);
    this.emit('compressionRatio:changed', { ratio: this.config.compressionRatio });
  }

  /**
   * Set attack time in seconds
   */
  setAttackTime(time) {
    this.config.attackTime = clamp(time, 0.001, 1.0);
    this.calculateCoefficients();
    this.emit('attackTime:changed', { time: this.config.attackTime });
  }

  /**
   * Set release time in seconds
   */
  setReleaseTime(time) {
    this.config.releaseTime = clamp(time, 0.001, 5.0);
    this.calculateCoefficients();
    this.emit('releaseTime:changed', { time: this.config.releaseTime });
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
    this.config = { ...this.config, ...newConfig };
    this.calculateCoefficients();
    this.emit('config:updated', { config: this.config });
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