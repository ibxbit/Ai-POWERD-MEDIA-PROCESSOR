/**
 * AI-Powered Media Processor
 * Main entry point for the library (ES module only)
 */

export { MediaProcessor } from './core/MediaProcessor';
export { AudioProcessor } from './audio/AudioProcessor';
export { VideoProcessor } from './video/VideoProcessor';

// Export utility functions
export { 
  createAudioContext,
  createVideoContext,
  isSupported,
  getCapabilities 
} from './core/utils.js';

// Export types and constants
export { 
  PROCESSING_MODES,
  AUDIO_QUALITY_PRESETS,
  VIDEO_QUALITY_PRESETS 
} from './core/constants.js'; 