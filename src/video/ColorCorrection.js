/**
 * ColorCorrection class
 * Implements real-time color adjustment using WebGL shaders
 */

import { EventEmitter } from '../core/EventEmitter';
import { clamp } from '../core/utils';
import { SHADER_CONSTANTS, VIDEO_CONSTANTS } from '../core/constants';

export class ColorCorrection extends EventEmitter {
  constructor(gl, config) {
    super();
    
    this.gl = gl;
    this.config = {
      brightness: 1.0,
      contrast: 1.0,
      saturation: 1.0,
      gamma: 1.0,
      ...config
    };
    
    // WebGL resources
    this.program = null;
    this.texture = null;
    this.framebuffer = null;
    this.vertexBuffer = null;
    this.texCoordBuffer = null;
    
    // State
    this.isInitialized = false;
  }

  /**
   * Initialize the color correction processor
   */
  async initialize() {
    try {
      // Create shader program
      this.program = this.createShaderProgram();
      
      // Create texture
      this.texture = this.gl.createTexture();
      
      // Create framebuffer
      this.framebuffer = this.gl.createFramebuffer();
      
      // Create vertex buffers
      this.createBuffers();
      
      this.isInitialized = true;
      this.emit('initialized');
    } catch (error) {
      this.emit('error', new Error(`Failed to initialize ColorCorrection: ${error.message}`));
      throw error;
    }
  }

  /**
   * Create shader program
   */
  createShaderProgram() {
    const vertexShader = this.createShader(this.gl.VERTEX_SHADER, SHADER_CONSTANTS.VERTEX_SHADER);
    const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, SHADER_CONSTANTS.FRAGMENT_SHADER_COLOR_CORRECTION);
    
    const program = this.gl.createProgram();
    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);
    
    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      throw new Error('Failed to link shader program: ' + this.gl.getProgramInfoLog(program));
    }
    
    return program;
  }

  /**
   * Create shader
   */
  createShader(type, source) {
    const shader = this.gl.createShader(type);
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      throw new Error('Failed to compile shader: ' + this.gl.getShaderInfoLog(shader));
    }
    
    return shader;
  }

  /**
   * Create vertex buffers
   */
  createBuffers() {
    // Vertex positions (full-screen quad)
    const vertices = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
       1,  1
    ]);
    
    this.vertexBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);
    
    // Texture coordinates
    const texCoords = new Float32Array([
      0, 0,
      1, 0,
      0, 1,
      1, 1
    ]);
    
    this.texCoordBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.texCoordBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, texCoords, this.gl.STATIC_DRAW);
  }

  /**
   * Process ImageData using WebGL
   */
  async process(imageData) {
    if (!this.isInitialized) {
      throw new Error('ColorCorrection not initialized');
    }

    // Create texture from ImageData
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, imageData);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

    // Set up framebuffer
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer);
    this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.texture, 0);

    // Use shader program
    this.gl.useProgram(this.program);

    // Set uniforms
    this.setUniforms();

    // Set up attributes
    this.setupAttributes();

    // Draw
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);

    // Read back pixels
    const pixels = new Uint8ClampedArray(imageData.data.length);
    this.gl.readPixels(0, 0, imageData.width, imageData.height, this.gl.RGBA, this.gl.UNSIGNED_BYTE, pixels);

    // Create new ImageData
    return new ImageData(pixels, imageData.width, imageData.height);
  }

  /**
   * Process ImageData using canvas (fallback)
   */
  processCanvas(imageData) {
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d');
    
    // Put original image data
    ctx.putImageData(imageData, 0, 0);
    
    // Apply color correction using canvas filters
    ctx.filter = `brightness(${this.config.brightness}) contrast(${this.config.contrast}) saturate(${this.config.saturation})`;
    
    // Draw with filter
    ctx.drawImage(canvas, 0, 0);
    
    // Get processed data
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  /**
   * Set shader uniforms
   */
  setUniforms() {
    const brightnessLocation = this.gl.getUniformLocation(this.program, 'u_brightness');
    const contrastLocation = this.gl.getUniformLocation(this.program, 'u_contrast');
    const saturationLocation = this.gl.getUniformLocation(this.program, 'u_saturation');
    const gammaLocation = this.gl.getUniformLocation(this.program, 'u_gamma');

    this.gl.uniform1f(brightnessLocation, this.config.brightness);
    this.gl.uniform1f(contrastLocation, this.config.contrast);
    this.gl.uniform1f(saturationLocation, this.config.saturation);
    this.gl.uniform1f(gammaLocation, this.config.gamma);
  }

  /**
   * Set up vertex attributes
   */
  setupAttributes() {
    // Position attribute
    const positionLocation = this.gl.getAttribLocation(this.program, 'a_position');
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
    this.gl.enableVertexAttribArray(positionLocation);
    this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);

    // Texture coordinate attribute
    const texCoordLocation = this.gl.getAttribLocation(this.program, 'a_texCoord');
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.texCoordBuffer);
    this.gl.enableVertexAttribArray(texCoordLocation);
    this.gl.vertexAttribPointer(texCoordLocation, 2, this.gl.FLOAT, false, 0, 0);
  }

  /**
   * Set brightness
   */
  setBrightness(brightness) {
    this.config.brightness = clamp(brightness, VIDEO_CONSTANTS.BRIGHTNESS_MIN, VIDEO_CONSTANTS.BRIGHTNESS_MAX);
    this.emit('brightness:changed', { brightness: this.config.brightness });
  }

  /**
   * Set contrast
   */
  setContrast(contrast) {
    this.config.contrast = clamp(contrast, VIDEO_CONSTANTS.CONTRAST_MIN, VIDEO_CONSTANTS.CONTRAST_MAX);
    this.emit('contrast:changed', { contrast: this.config.contrast });
  }

  /**
   * Set saturation
   */
  setSaturation(saturation) {
    this.config.saturation = clamp(saturation, VIDEO_CONSTANTS.SATURATION_MIN, VIDEO_CONSTANTS.SATURATION_MAX);
    this.emit('saturation:changed', { saturation: this.config.saturation });
  }

  /**
   * Set gamma
   */
  setGamma(gamma) {
    this.config.gamma = clamp(gamma, 0.1, 3.0);
    this.emit('gamma:changed', { gamma: this.config.gamma });
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.emit('config:updated', { config: this.config });
  }

  /**
   * Get current statistics
   */
  getStats() {
    return {
      brightness: this.config.brightness,
      contrast: this.config.contrast,
      saturation: this.config.saturation,
      gamma: this.config.gamma
    };
  }

  /**
   * Clean up resources
   */
  async destroy() {
    this.isInitialized = false;

    if (this.program) {
      this.gl.deleteProgram(this.program);
      this.program = null;
    }

    if (this.texture) {
      this.gl.deleteTexture(this.texture);
      this.texture = null;
    }

    if (this.framebuffer) {
      this.gl.deleteFramebuffer(this.framebuffer);
      this.framebuffer = null;
    }

    if (this.vertexBuffer) {
      this.gl.deleteBuffer(this.vertexBuffer);
      this.vertexBuffer = null;
    }

    if (this.texCoordBuffer) {
      this.gl.deleteBuffer(this.texCoordBuffer);
      this.texCoordBuffer = null;
    }

    this.emit('destroyed');
  }
} 