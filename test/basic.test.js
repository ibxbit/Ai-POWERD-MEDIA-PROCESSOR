/**
 * Basic tests for AI Media Processor
 */

import { MediaProcessor, isSupported, getCapabilities } from '../src/index.js';

describe('AI Media Processor', () => {
  test('should export MediaProcessor class', () => {
    expect(MediaProcessor).toBeDefined();
    expect(typeof MediaProcessor).toBe('function');
  });

  test('should export utility functions', () => {
    expect(isSupported).toBeDefined();
    expect(typeof isSupported).toBe('function');
    
    expect(getCapabilities).toBeDefined();
    expect(typeof getCapabilities).toBe('function');
  });

  test('should create MediaProcessor instance', () => {
    const processor = new MediaProcessor();
    expect(processor).toBeInstanceOf(MediaProcessor);
  });

  test('should check browser support', () => {
    const support = isSupported();
    expect(support).toHaveProperty('supported');
    expect(support).toHaveProperty('details');
    expect(typeof support.supported).toBe('boolean');
  });

  test('should get browser capabilities', () => {
    const capabilities = getCapabilities();
    expect(capabilities).toHaveProperty('audio');
    expect(capabilities).toHaveProperty('video');
    expect(capabilities).toHaveProperty('performance');
  });

  test('should handle configuration', () => {
    const config = {
      audio: {
        noiseSuppression: { enabled: true }
      },
      video: {
        colorCorrection: { enabled: true }
      }
    };
    
    const processor = new MediaProcessor(config);
    const processorConfig = processor.getConfig();
    
    expect(processorConfig.audio.noiseSuppression.enabled).toBe(true);
    expect(processorConfig.video.colorCorrection.enabled).toBe(true);
  });

  test('should emit events', (done) => {
    const processor = new MediaProcessor();
    
    processor.on('initialized', () => {
      done();
    });
  });

  test('should handle destruction', async () => {
    const processor = new MediaProcessor();
    await processor.destroy();
    
    expect(processor.isDestroyed).toBe(true);
  });
}); 