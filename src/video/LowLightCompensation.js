/**
 * LowLightCompensation class
 * Enhances visibility in poor lighting conditions
 */

import { EventEmitter } from '../core/EventEmitter';
import { clamp } from '../core/utils';

export class LowLightCompensation extends EventEmitter {
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