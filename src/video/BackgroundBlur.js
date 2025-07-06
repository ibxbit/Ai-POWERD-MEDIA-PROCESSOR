/**
 * BackgroundBlur class
 * Implements background blurring (placeholder for AI-based segmentation)
 */

import { EventEmitter } from '../core/EventEmitter';
import { clamp } from '../core/utils';
import { VIDEO_CONSTANTS } from '../core/constants';

export class BackgroundBlur extends EventEmitter {
  constructor(gl, config) {
    super();
    
    this.gl = gl;
    this.config = {
      intensity: 15,
      model: 'simple', // 'simple', 'bodypix', 'mediapipe'
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
    this.emit('intensity:changed', { intensity: this.config.intensity });
  }

  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.emit('config:updated', { config: this.config });
  }

  getStats() {
    return { ...this.config };
  }

  async destroy() {
    this.isInitialized = false;
    this.emit('destroyed');
  }
} 