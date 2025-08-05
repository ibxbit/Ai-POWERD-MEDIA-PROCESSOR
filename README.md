# ColloAI Media Processor

ColloAI Media Processor is a JavaScript library for real time AI powered video and audio enhancement in web applications.

## Features
- Real time video effects: background blur, color correction, low light boost
- AI audio processing: noise suppression, automatic gain control, voice focus
- Live analytics and smart recording

## Installation
```bash
npm install colloai-media-processor
```

## Basic Usage
```js
import { MediaProcessor } from 'colloai-media-processor';

const processor = new MediaProcessor();
processor.enableVideoEffects({ blur: true, colorCorrection: true });
processor.enableAudioEffects({ noiseSuppression: true });

// Attach to a video/audio stream
processor.attachToStream(mediaStream);
```

## API Reference
- `MediaProcessor`: Main class for managing video/audio enhancements.
- `enableVideoEffects(options)`: Enable/disable video effects (blur, color correction, etc.).
- `enableAudioEffects(options)`: Enable/disable audio effects (noise suppression, AGC, etc.).
- `attachToStream(mediaStream)`: Attach processor to a MediaStream.
- `detach()`: Remove all effects and detach from stream.

## Examples
```js
// Enable background blur and noise suppression
const processor = new MediaProcessor();
processor.enableVideoEffects({ blur: true });
processor.enableAudioEffects({ noiseSuppression: true });
```

## Contributing
1. Fork the repo
2. Create your feature branch (`git checkout -b feature/YourFeature`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature/YourFeature`)
5. Open a pull request

## License
MIT

## 🚀 Features

### Audio Enhancement
- **Noise Suppression**: Filter out background noise (keyboard clicks, fan noise, room echo)
- **Automatic Gain Control (AGC)**: Dynamic microphone volume adjustment
- **Voice Focus**: Prioritize human speech over background sounds

### Video Enhancement
- **Color Correction**: Real time color adjustment and lighting compensation
- **Low Light Compensation**: Enhance visibility in poor lighting conditions
- **Background Blurring**: Professional background blur effect
- **Background Replacement**: Virtual background' support

## 🎯 Quick Start

```javascript
import { MediaProcessor } from 'ai-media-processor';

// Create processor with desired features
const processor = new MediaProcessor({
  audio: {
    noiseSuppression: true,
    agc: true,
    voiceFocus: true,
  },
  video: {
    colorCorrection: true,
    lowLightCompensation: true,
    backgroundBlur: true,
    backgroundReplace: false,
  }
});

// Get user media stream
const stream = await navigator.mediaDevices.getUserMedia({
  audio: true,
  video: true
});

// Process the stream
const enhancedStream = await processor.process(stream);

// Use enhanced stream in your application
videoElement.srcObject = enhancedStream;
```

## 🔧 Configuration Options

```javascript
const config = {
  audio: {
    noiseSuppression: {
      enabled: true,
      intensity: 'medium', // 'low', 'medium', 'high'
    },
    agc: {
      enabled: true,
      targetLevel: -20, // dB
      compressionRatio: 3,
    },
    voiceFocus: {
      enabled: true,
      sensitivity: 0.8, // 0-1
    }
  },
  video: {
    colorCorrection: {
      enabled: true,
      brightness: 1.1,
      contrast: 1.2,
      saturation: 1.0,
    },
    lowLightCompensation: {
      enabled: true,
      threshold: 0.3, // 0-1
      boost: 1.5,
    },
    backgroundBlur: {
      enabled: true,
      intensity: 15, // blur radius
    },
    backgroundReplace: {
      enabled: false,
      image: null, // URL or ImageData
    }
  }
};
```

## 📚 API Reference

### MediaProcessor Class

#### Constructor
```javascript
new MediaProcessor(config)
```

#### Methods
- `process(stream)`: Process a MediaStream and return enhanced stream
- `updateConfig(newConfig)`: Update processor configuration
- `destroy()`: Clean up resources

### Events
```javascript
processor.on('processing', (event) => {
  console.log('Processing frame:', event.timestamp);
});

processor.on('error', (error) => {
  console.error('Processing error:', error);
});
```

## 🛠️ Browser Support

- Chrome 88+
- Firefox 85+
- Safari 14+
- Edge 88+

**Note**: Some features may require specific browser APIs and may not work in all browsers.

## 📋 Requirements

- Modern browser with Web Audio API support
- Camera and microphone permissions
- Sufficient CPU/GPU for real-time processing

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- TensorFlow.js for ML capabilities
- WebRTC for media processing
- WebGL for video enhancement
- The open-source community for inspiration and tools

## 📞 Support

If you encounter any issues or have questions, please [open an issue](https://github.com/yourusername/ai-media-processor/issues) on GitHub. 
