/**
 * Simple EventEmitter implementation
 * Used for handling events in MediaProcessor
 */

export class EventEmitter {
  constructor() {
    this.events = {};
  }

  /**
   * Add event listener
   */
  on(event, listener) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
    return this;
  }

  /**
   * Add one-time event listener
   */
  once(event, listener) {
    const onceWrapper = (...args) => {
      this.off(event, onceWrapper);
      listener.apply(this, args);
    };
    return this.on(event, onceWrapper);
  }

  /**
   * Remove event listener
   */
  off(event, listener) {
    if (!this.events[event]) return this;
    
    if (!listener) {
      delete this.events[event];
      return this;
    }

    const index = this.events[event].indexOf(listener);
    if (index > -1) {
      this.events[event].splice(index, 1);
    }

    if (this.events[event].length === 0) {
      delete this.events[event];
    }

    return this;
  }

  /**
   * Emit event
   */
  emit(event, ...args) {
    if (!this.events[event]) return false;

    this.events[event].forEach(listener => {
      try {
        listener.apply(this, args);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });

    return true;
  }

  /**
   * Remove all listeners for an event
   */
  removeAllListeners(event) {
    if (event) {
      delete this.events[event];
    } else {
      this.events = {};
    }
    return this;
  }

  /**
   * Get listener count for an event
   */
  listenerCount(event) {
    return this.events[event] ? this.events[event].length : 0;
  }

  /**
   * Get all event names
   */
  eventNames() {
    return Object.keys(this.events);
  }
} 