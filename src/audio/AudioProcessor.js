/**
 * AudioProcessor class
 * Handles real-time audio enhancement including noise suppression, AGC, and voice focus
 */

import { EventEmitter } from '../core/EventEmitter';
import { createAudioContext, dbToGain, gainToDb, clamp } from '../core/utils';
import { AUDIO_CONSTANTS } from '../core/constants';
import { NoiseSuppressor } from './NoiseSuppressor';
import { AutomaticGainControl } from './AutomaticGainControl';
import { VoiceFocus } from './VoiceFocus';

export class AudioProcessor extends EventEmitter {
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
      const processedStream = new MediaStream([
        ...stream.getVideoTracks(),
        ...destination.stream.getAudioTracks()
      ]);

      // Start monitoring
      this.startMonitoring();

      this.isProcessing = false;
      this.emit('processing:complete', { stream: processedStream });

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
    this.config = { ...this.config, ...newConfig };

    // Reinitialize if needed
    if (this.isInitialized) {
      await this.destroy();
      await this.initialize();
    }

    this.emit('config:updated', { config: this.config });
  }

  /**
   * Get current statistics
   */
  getStats() {
    return { ...this.stats };
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