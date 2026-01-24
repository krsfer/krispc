/**
 * Multitouch gesture system for enhanced accessibility
 * Supports 2-4 finger gestures with temporal recognition
 */

export interface TouchPoint {
  x: number;
  y: number;
  identifier: number;
}

export interface MultitouchGesture {
  type: 'two-finger' | 'three-finger' | 'four-finger';
  startTime: number;
  touches: TouchPoint[];
  duration?: number;
  isLongPress?: boolean;
}

export type GestureAction = 
  | 'UNDO_LAST'
  | 'CLEAR_PATTERN'
  | 'TOGGLE_VOICE_MODE'
  | 'OPEN_ACCESSIBILITY_MENU'
  | 'EMERGENCY_RESET'
  | 'OPEN_ACCESSIBILITY_SETTINGS'
  | 'TOGGLE_HIGH_CONTRAST'
  | 'TOGGLE_LARGE_TEXT'
  | 'TOGGLE_MOTOR_ASSISTANCE';

export interface GestureConfig {
  longPressThreshold: number; // milliseconds
  maxGestureDistance: number; // pixels
  enabled: boolean;
  hapticFeedback: boolean;
  audioFeedback: boolean;
}

interface GestureCallbacks {
  onGestureStart?: (gesture: MultitouchGesture) => void;
  onGestureEnd?: (gesture: MultitouchGesture, action: GestureAction | null) => void;
  onGestureAction?: (action: GestureAction, gesture: MultitouchGesture) => void;
  onAccessibilityChange?: (feature: string, enabled: boolean) => void;
}

export class MultitouchGestureService {
  private activeGesture: MultitouchGesture | null = null;
  private touchStartRef: TouchList | null = null;
  private gestureTimeoutRef: NodeJS.Timeout | null = null;
  private config: GestureConfig;
  private callbacks: GestureCallbacks = {};
  private isEnabled = true;

  constructor(config: Partial<GestureConfig> = {}) {
    this.config = {
      longPressThreshold: 800, // 800ms for long press
      maxGestureDistance: 50, // 50px maximum movement
      enabled: true,
      hapticFeedback: true,
      audioFeedback: false,
      ...config
    };
  }

  /**
   * Initialize gesture listeners on an element
   */
  initialize(element: HTMLElement, callbacks: GestureCallbacks = {}): void {
    this.callbacks = callbacks;
    
    if (!this.config.enabled) return;

    // Add touch event listeners
    element.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    element.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
    element.addEventListener('touchcancel', this.handleTouchCancel.bind(this), { passive: false });
    element.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });

    // Prevent default context menu on long press
    element.addEventListener('contextmenu', (e) => {
      if (this.activeGesture) {
        e.preventDefault();
      }
    });
  }

  /**
   * Handle touch start event
   */
  private handleTouchStart(event: TouchEvent): void {
    const touchCount = event.touches.length;
    
    // Only handle multi-touch gestures
    if (touchCount < 2) {
      this.cleanupActiveGesture();
      return;
    }

    // Clear any existing gesture timeout
    if (this.gestureTimeoutRef) {
      clearTimeout(this.gestureTimeoutRef);
      this.gestureTimeoutRef = null;
    }

    // Prevent default behavior for multi-touch
    event.preventDefault();
    
    this.touchStartRef = event.touches;
    
    const gesture: MultitouchGesture = {
      type: this.getGestureType(touchCount),
      startTime: Date.now(),
      touches: Array.from(event.touches).map(touch => ({
        x: touch.clientX,
        y: touch.clientY,
        identifier: touch.identifier
      }))
    };
    
    this.activeGesture = gesture;
    this.callbacks.onGestureStart?.(gesture);

    // Provide haptic feedback if supported
    if (this.config.hapticFeedback && 'vibrate' in navigator) {
      navigator.vibrate(50); // Short vibration
    }

    // Set up long press detection
    this.gestureTimeoutRef = setTimeout(() => {
      if (this.activeGesture) {
        this.activeGesture.isLongPress = true;
        this.activeGesture.duration = Date.now() - this.activeGesture.startTime;
        
        // Additional haptic feedback for long press
        if (this.config.hapticFeedback && 'vibrate' in navigator) {
          navigator.vibrate([100, 50, 100]); // Long press vibration pattern
        }
      }
    }, this.config.longPressThreshold);
  }

  /**
   * Handle touch end event
   */
  private handleTouchEnd(event: TouchEvent): void {
    if (!this.activeGesture || !this.touchStartRef) {
      return;
    }

    // Calculate gesture duration
    const duration = Date.now() - this.activeGesture.startTime;
    this.activeGesture.duration = duration;

    // Determine if this was a long press
    const isLongPress = duration >= this.config.longPressThreshold || this.activeGesture.isLongPress;
    this.activeGesture.isLongPress = isLongPress;

    // Check if touches moved too much (invalidate gesture)
    const isValidGesture = this.validateGestureMovement(event);
    
    if (isValidGesture) {
      // Determine gesture action
      const action = this.determineGestureAction(this.activeGesture);
      
      if (action) {
        this.executeGestureAction(action, this.activeGesture);
        this.callbacks.onGestureAction?.(action, this.activeGesture);
      }
    }

    this.callbacks.onGestureEnd?.(this.activeGesture, isValidGesture ? this.determineGestureAction(this.activeGesture) : null);
    this.cleanupActiveGesture();
  }

  /**
   * Handle touch cancel event
   */
  private handleTouchCancel(event: TouchEvent): void {
    this.cleanupActiveGesture();
  }

  /**
   * Handle touch move event (for validation)
   */
  private handleTouchMove(event: TouchEvent): void {
    if (!this.activeGesture) return;
    
    // Update touch positions for movement validation
    this.activeGesture.touches = Array.from(event.touches).map(touch => ({
      x: touch.clientX,
      y: touch.clientY,
      identifier: touch.identifier
    }));
  }

  /**
   * Validate that touches haven't moved too far
   */
  private validateGestureMovement(event: TouchEvent): boolean {
    if (!this.activeGesture || !this.touchStartRef) return false;

    const maxDistance = this.config.maxGestureDistance;
    
    // Check each touch point for excessive movement
    for (let i = 0; i < Math.min(this.touchStartRef.length, event.changedTouches.length); i++) {
      const startTouch = this.touchStartRef[i];
      const endTouch = event.changedTouches[i];
      
      const distance = Math.sqrt(
        Math.pow(endTouch.clientX - startTouch.clientX, 2) +
        Math.pow(endTouch.clientY - startTouch.clientY, 2)
      );
      
      if (distance > maxDistance) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Get gesture type based on touch count
   */
  private getGestureType(touchCount: number): MultitouchGesture['type'] {
    if (touchCount === 2) return 'two-finger';
    if (touchCount === 3) return 'three-finger';
    return 'four-finger';
  }

  /**
   * Determine the action for a completed gesture
   */
  private determineGestureAction(gesture: MultitouchGesture): GestureAction | null {
    const { type, isLongPress } = gesture;
    
    switch (type) {
      case 'two-finger':
        return isLongPress ? 'CLEAR_PATTERN' : 'UNDO_LAST';
      
      case 'three-finger':
        return isLongPress ? 'OPEN_ACCESSIBILITY_MENU' : 'TOGGLE_VOICE_MODE';
      
      case 'four-finger':
        return isLongPress ? 'OPEN_ACCESSIBILITY_SETTINGS' : 'EMERGENCY_RESET';
      
      default:
        return null;
    }
  }

  /**
   * Execute the determined gesture action
   */
  private executeGestureAction(action: GestureAction, gesture: MultitouchGesture): void {
    // Provide feedback
    if (this.config.hapticFeedback && 'vibrate' in navigator) {
      // Different vibration patterns for different actions
      switch (action) {
        case 'UNDO_LAST':
          navigator.vibrate(100);
          break;
        case 'CLEAR_PATTERN':
          navigator.vibrate([200, 100, 200]);
          break;
        case 'TOGGLE_VOICE_MODE':
          navigator.vibrate([50, 50, 50]);
          break;
        case 'OPEN_ACCESSIBILITY_MENU':
          navigator.vibrate([100, 50, 100, 50, 100]);
          break;
        case 'EMERGENCY_RESET':
          navigator.vibrate([300, 100, 300]);
          break;
        default:
          navigator.vibrate(150);
      }
    }

    // Audio feedback if enabled
    if (this.config.audioFeedback) {
      this.playActionSound(action);
    }

    // Announce action for screen readers
    this.announceActionForScreenReader(action);
  }

  /**
   * Play audio feedback for action
   */
  private playActionSound(action: GestureAction): void {
    // Create audio context for feedback tones
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Different frequencies for different actions
      const frequency = this.getActionFrequency(action);
      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
      console.warn('Could not play action sound:', error);
    }
  }

  /**
   * Get frequency for action feedback
   */
  private getActionFrequency(action: GestureAction): number {
    const frequencies: Record<GestureAction, number> = {
      'UNDO_LAST': 440,
      'CLEAR_PATTERN': 330,
      'TOGGLE_VOICE_MODE': 550,
      'OPEN_ACCESSIBILITY_MENU': 660,
      'EMERGENCY_RESET': 220,
      'OPEN_ACCESSIBILITY_SETTINGS': 770,
      'TOGGLE_HIGH_CONTRAST': 880,
      'TOGGLE_LARGE_TEXT': 990,
      'TOGGLE_MOTOR_ASSISTANCE': 1100
    };
    
    return frequencies[action] || 440;
  }

  /**
   * Announce action for screen readers
   */
  private announceActionForScreenReader(action: GestureAction): void {
    const announcements: Record<GestureAction, string> = {
      'UNDO_LAST': 'Undo last action',
      'CLEAR_PATTERN': 'Clear pattern',
      'TOGGLE_VOICE_MODE': 'Toggle voice mode',
      'OPEN_ACCESSIBILITY_MENU': 'Open accessibility menu',
      'EMERGENCY_RESET': 'Emergency reset',
      'OPEN_ACCESSIBILITY_SETTINGS': 'Open accessibility settings',
      'TOGGLE_HIGH_CONTRAST': 'Toggle high contrast mode',
      'TOGGLE_LARGE_TEXT': 'Toggle large text mode',
      'TOGGLE_MOTOR_ASSISTANCE': 'Toggle motor assistance'
    };

    const message = announcements[action];
    if (message) {
      this.announceToScreenReader(message);
    }
  }

  /**
   * Announce message to screen reader
   */
  private announceToScreenReader(message: string): void {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'assertive');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }

  /**
   * Clean up active gesture state
   */
  private cleanupActiveGesture(): void {
    if (this.gestureTimeoutRef) {
      clearTimeout(this.gestureTimeoutRef);
      this.gestureTimeoutRef = null;
    }
    
    this.activeGesture = null;
    this.touchStartRef = null;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<GestureConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Enable/disable gesture recognition
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    this.config.enabled = enabled;
    
    if (!enabled) {
      this.cleanupActiveGesture();
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): GestureConfig {
    return { ...this.config };
  }

  /**
   * Get supported gestures and their actions
   */
  getSupportedGestures(): Array<{ gesture: string; action: string; description: string }> {
    return [
      {
        gesture: 'Two-finger tap',
        action: 'UNDO_LAST',
        description: 'Undo the last action'
      },
      {
        gesture: 'Two-finger long press',
        action: 'CLEAR_PATTERN',
        description: 'Clear the entire pattern'
      },
      {
        gesture: 'Three-finger tap',
        action: 'TOGGLE_VOICE_MODE',
        description: 'Toggle voice command mode'
      },
      {
        gesture: 'Three-finger long press',
        action: 'OPEN_ACCESSIBILITY_MENU',
        description: 'Open accessibility quick menu'
      },
      {
        gesture: 'Four-finger tap',
        action: 'EMERGENCY_RESET',
        description: 'Emergency reset to default state'
      },
      {
        gesture: 'Four-finger long press',
        action: 'OPEN_ACCESSIBILITY_SETTINGS',
        description: 'Open accessibility settings'
      }
    ];
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    this.cleanupActiveGesture();
    this.callbacks = {};
    this.setEnabled(false);
  }
}