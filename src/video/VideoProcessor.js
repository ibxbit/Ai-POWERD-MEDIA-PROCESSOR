/**
 * VideoProcessor class
 * Handles real-time video enhancement including color correction, background blur, and low-light compensation
 */

import { EventEmitter } from '../core/EventEmitter';
import { createVideoContext, clamp } from '../core/utils';
import { VIDEO_CONSTANTS } from '../core/constants';
import { ColorCorrection } from './ColorCorrection';
import { BackgroundBlur } from './BackgroundBlur';
import { LowLightCompensation } from './LowLightCompensation';

export class VideoProcessor extends EventEmitter {
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
        this.emit('processing:complete', { stream });
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
      await new Promise((resolve) => {
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
    const processor = new MediaStreamTrackProcessor({ track: videoTrack });
    const generator = new MediaStreamTrackGenerator({ kind: 'video' });

    // Process frames
    const reader = processor.readable.getReader();
    const writer = generator.writable.getWriter();

    const processFrame = async () => {
      try {
        const { value: frame, done } = await reader.read();
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
    const processedStream = new MediaStream([
      generator,
      ...stream.getAudioTracks()
    ]);

    console.log('[VideoProcessor] Processed stream created:', processedStream);

    this.isProcessing = false;
    this.emit('processing:complete', { stream: processedStream });
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
    const processedStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...stream.getAudioTracks()
    ]);

    // Debug: Log that processed stream is created
    console.log('[VideoProcessor] Processed stream created:', processedStream);

    // Force: Set the video element's srcObject if available
    if (window.demoVideoElement) {
      console.log('[VideoProcessor] Setting video element srcObject to processed stream');
      window.demoVideoElement.srcObject = processedStream;
    }

    this.isProcessing = false;
    this.emit('processing:complete', { stream: processedStream });
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