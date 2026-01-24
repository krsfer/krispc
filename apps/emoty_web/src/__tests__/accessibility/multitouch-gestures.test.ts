/**
 * Tests for multitouch gesture system
 */
import { MultitouchGestureService, GestureAction } from '@/lib/accessibility/multitouch-gestures';

// Mock navigator.vibrate
Object.defineProperty(navigator, 'vibrate', {
  writable: true,
  value: jest.fn()
});

// Mock AudioContext
global.AudioContext = jest.fn().mockImplementation(() => ({
  createOscillator: jest.fn().mockReturnValue({
    connect: jest.fn(),
    frequency: { setValueAtTime: jest.fn() },
    start: jest.fn(),
    stop: jest.fn()
  }),
  createGain: jest.fn().mockReturnValue({
    connect: jest.fn(),
    gain: {
      setValueAtTime: jest.fn(),
      exponentialRampToValueAtTime: jest.fn()
    }
  }),
  destination: {},
  currentTime: 0
}));

describe('MultitouchGestureService', () => {
  let gestureService: MultitouchGestureService;
  let mockElement: HTMLElement;
  let mockCallbacks: any;

  beforeEach(() => {
    gestureService = new MultitouchGestureService({
      longPressThreshold: 500,
      maxGestureDistance: 30,
      enabled: true,
      hapticFeedback: true,
      audioFeedback: false
    });

    mockElement = document.createElement('div');
    document.body.appendChild(mockElement);

    mockCallbacks = {
      onGestureStart: jest.fn(),
      onGestureEnd: jest.fn(),
      onGestureAction: jest.fn(),
      onAccessibilityChange: jest.fn()
    };

    jest.clearAllMocks();
  });

  afterEach(() => {
    gestureService.dispose();
    document.body.removeChild(mockElement);
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      const config = gestureService.getConfig();
      expect(config.longPressThreshold).toBe(500);
      expect(config.maxGestureDistance).toBe(30);
      expect(config.enabled).toBe(true);
      expect(config.hapticFeedback).toBe(true);
    });

    it('should set up event listeners on element', () => {
      const addEventListenerSpy = jest.spyOn(mockElement, 'addEventListener');
      
      gestureService.initialize(mockElement, mockCallbacks);

      expect(addEventListenerSpy).toHaveBeenCalledWith('touchstart', expect.any(Function), { passive: false });
      expect(addEventListenerSpy).toHaveBeenCalledWith('touchend', expect.any(Function), { passive: false });
      expect(addEventListenerSpy).toHaveBeenCalledWith('touchcancel', expect.any(Function), { passive: false });
      expect(addEventListenerSpy).toHaveBeenCalledWith('touchmove', expect.any(Function), { passive: false });
      expect(addEventListenerSpy).toHaveBeenCalledWith('contextmenu', expect.any(Function));
    });
  });

  describe('Touch Event Handling', () => {
    beforeEach(() => {
      gestureService.initialize(mockElement, mockCallbacks);
    });

    it('should ignore single touch events', () => {
      const touchEvent = createTouchEvent('touchstart', [
        { identifier: 0, clientX: 100, clientY: 100 }
      ]);

      mockElement.dispatchEvent(touchEvent);

      expect(mockCallbacks.onGestureStart).not.toHaveBeenCalled();
    });

    it('should detect two-finger gesture', () => {
      const touchEvent = createTouchEvent('touchstart', [
        { identifier: 0, clientX: 100, clientY: 100 },
        { identifier: 1, clientX: 150, clientY: 100 }
      ]);

      mockElement.dispatchEvent(touchEvent);

      expect(mockCallbacks.onGestureStart).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'two-finger',
          touches: expect.arrayContaining([
            expect.objectContaining({ x: 100, y: 100 }),
            expect.objectContaining({ x: 150, y: 100 })
          ])
        })
      );
    });

    it('should detect three-finger gesture', () => {
      const touchEvent = createTouchEvent('touchstart', [
        { identifier: 0, clientX: 100, clientY: 100 },
        { identifier: 1, clientX: 150, clientY: 100 },
        { identifier: 2, clientX: 200, clientY: 100 }
      ]);

      mockElement.dispatchEvent(touchEvent);

      expect(mockCallbacks.onGestureStart).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'three-finger' })
      );
    });

    it('should detect four-finger gesture', () => {
      const touchEvent = createTouchEvent('touchstart', [
        { identifier: 0, clientX: 100, clientY: 100 },
        { identifier: 1, clientX: 150, clientY: 100 },
        { identifier: 2, clientX: 200, clientY: 100 },
        { identifier: 3, clientX: 250, clientY: 100 }
      ]);

      mockElement.dispatchEvent(touchEvent);

      expect(mockCallbacks.onGestureStart).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'four-finger' })
      );
    });

    it('should prevent default behavior for multi-touch', () => {
      const touchEvent = createTouchEvent('touchstart', [
        { identifier: 0, clientX: 100, clientY: 100 },
        { identifier: 1, clientX: 150, clientY: 100 }
      ]);

      const preventDefaultSpy = jest.spyOn(touchEvent, 'preventDefault');
      mockElement.dispatchEvent(touchEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });

  describe('Gesture Actions', () => {
    beforeEach(() => {
      gestureService.initialize(mockElement, mockCallbacks);
    });

    it('should execute UNDO_LAST action for two-finger tap', async () => {
      // Start gesture
      const startEvent = createTouchEvent('touchstart', [
        { identifier: 0, clientX: 100, clientY: 100 },
        { identifier: 1, clientX: 150, clientY: 100 }
      ]);
      mockElement.dispatchEvent(startEvent);

      // End gesture quickly (tap)
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const endEvent = createTouchEvent('touchend', [
        { identifier: 0, clientX: 100, clientY: 100 },
        { identifier: 1, clientX: 150, clientY: 100 }
      ]);
      mockElement.dispatchEvent(endEvent);

      expect(mockCallbacks.onGestureAction).toHaveBeenCalledWith(
        'UNDO_LAST',
        expect.objectContaining({ type: 'two-finger' })
      );
    });

    it('should execute CLEAR_PATTERN action for two-finger long press', async () => {
      // Start gesture
      const startEvent = createTouchEvent('touchstart', [
        { identifier: 0, clientX: 100, clientY: 100 },
        { identifier: 1, clientX: 150, clientY: 100 }
      ]);
      mockElement.dispatchEvent(startEvent);

      // Wait for long press threshold
      await new Promise(resolve => setTimeout(resolve, 600));
      
      const endEvent = createTouchEvent('touchend', [
        { identifier: 0, clientX: 100, clientY: 100 },
        { identifier: 1, clientX: 150, clientY: 100 }
      ]);
      mockElement.dispatchEvent(endEvent);

      expect(mockCallbacks.onGestureAction).toHaveBeenCalledWith(
        'CLEAR_PATTERN',
        expect.objectContaining({ 
          type: 'two-finger',
          isLongPress: true 
        })
      );
    });

    it('should execute TOGGLE_VOICE_MODE action for three-finger tap', async () => {
      const startEvent = createTouchEvent('touchstart', [
        { identifier: 0, clientX: 100, clientY: 100 },
        { identifier: 1, clientX: 150, clientY: 100 },
        { identifier: 2, clientX: 200, clientY: 100 }
      ]);
      mockElement.dispatchEvent(startEvent);

      await new Promise(resolve => setTimeout(resolve, 100));
      
      const endEvent = createTouchEvent('touchend', [
        { identifier: 0, clientX: 100, clientY: 100 },
        { identifier: 1, clientX: 150, clientY: 100 },
        { identifier: 2, clientX: 200, clientY: 100 }
      ]);
      mockElement.dispatchEvent(endEvent);

      expect(mockCallbacks.onGestureAction).toHaveBeenCalledWith(
        'TOGGLE_VOICE_MODE',
        expect.objectContaining({ type: 'three-finger' })
      );
    });
  });

  describe('Movement Validation', () => {
    beforeEach(() => {
      gestureService.initialize(mockElement, mockCallbacks);
    });

    it('should invalidate gesture if touches move too far', async () => {
      // Start gesture
      const startEvent = createTouchEvent('touchstart', [
        { identifier: 0, clientX: 100, clientY: 100 },
        { identifier: 1, clientX: 150, clientY: 100 }
      ]);
      mockElement.dispatchEvent(startEvent);

      // Move touches beyond threshold
      const moveEvent = createTouchEvent('touchmove', [
        { identifier: 0, clientX: 200, clientY: 200 }, // Moved 141px
        { identifier: 1, clientX: 250, clientY: 200 }
      ]);
      mockElement.dispatchEvent(moveEvent);

      // End gesture
      const endEvent = createTouchEvent('touchend', [
        { identifier: 0, clientX: 200, clientY: 200 },
        { identifier: 1, clientX: 250, clientY: 200 }
      ]);
      mockElement.dispatchEvent(endEvent);

      // Should not execute action due to excessive movement
      expect(mockCallbacks.onGestureAction).not.toHaveBeenCalled();
      expect(mockCallbacks.onGestureEnd).toHaveBeenCalledWith(
        expect.any(Object),
        null // No action due to invalid gesture
      );
    });

    it('should accept gesture if touches stay within threshold', async () => {
      gestureService.updateConfig({ maxGestureDistance: 50 });

      // Start gesture
      const startEvent = createTouchEvent('touchstart', [
        { identifier: 0, clientX: 100, clientY: 100 },
        { identifier: 1, clientX: 150, clientY: 100 }
      ]);
      mockElement.dispatchEvent(startEvent);

      // Move touches within threshold
      const moveEvent = createTouchEvent('touchmove', [
        { identifier: 0, clientX: 130, clientY: 120 }, // Moved ~36px
        { identifier: 1, clientX: 170, clientY: 120 }
      ]);
      mockElement.dispatchEvent(moveEvent);

      await new Promise(resolve => setTimeout(resolve, 100));

      // End gesture
      const endEvent = createTouchEvent('touchend', [
        { identifier: 0, clientX: 130, clientY: 120 },
        { identifier: 1, clientX: 170, clientY: 120 }
      ]);
      mockElement.dispatchEvent(endEvent);

      // Should execute action
      expect(mockCallbacks.onGestureAction).toHaveBeenCalledWith(
        'UNDO_LAST',
        expect.any(Object)
      );
    });
  });

  describe('Haptic and Audio Feedback', () => {
    beforeEach(() => {
      gestureService.initialize(mockElement, mockCallbacks);
    });

    it('should provide haptic feedback on gesture start', () => {
      const vibrateSpy = jest.spyOn(navigator, 'vibrate');

      const touchEvent = createTouchEvent('touchstart', [
        { identifier: 0, clientX: 100, clientY: 100 },
        { identifier: 1, clientX: 150, clientY: 100 }
      ]);
      mockElement.dispatchEvent(touchEvent);

      expect(vibrateSpy).toHaveBeenCalledWith(50);
    });

    it('should provide different haptic patterns for different actions', async () => {
      const vibrateSpy = jest.spyOn(navigator, 'vibrate');

      // Two-finger tap (UNDO_LAST)
      const startEvent = createTouchEvent('touchstart', [
        { identifier: 0, clientX: 100, clientY: 100 },
        { identifier: 1, clientX: 150, clientY: 100 }
      ]);
      mockElement.dispatchEvent(startEvent);

      await new Promise(resolve => setTimeout(resolve, 100));

      const endEvent = createTouchEvent('touchend', [
        { identifier: 0, clientX: 100, clientY: 100 },
        { identifier: 1, clientX: 150, clientY: 100 }
      ]);
      mockElement.dispatchEvent(endEvent);

      // Should have different vibration pattern for action
      expect(vibrateSpy).toHaveBeenCalledWith(100); // UNDO_LAST pattern
    });

    it('should not provide haptic feedback when disabled', () => {
      gestureService.updateConfig({ hapticFeedback: false });
      const vibrateSpy = jest.spyOn(navigator, 'vibrate');

      const touchEvent = createTouchEvent('touchstart', [
        { identifier: 0, clientX: 100, clientY: 100 },
        { identifier: 1, clientX: 150, clientY: 100 }
      ]);
      mockElement.dispatchEvent(touchEvent);

      expect(vibrateSpy).not.toHaveBeenCalled();
    });
  });

  describe('Screen Reader Announcements', () => {
    beforeEach(() => {
      gestureService.initialize(mockElement, mockCallbacks);
    });

    it('should create screen reader announcements for actions', async () => {
      const appendChildSpy = jest.spyOn(document.body, 'appendChild');
      const removeChildSpy = jest.spyOn(document.body, 'removeChild');

      // Execute gesture
      const startEvent = createTouchEvent('touchstart', [
        { identifier: 0, clientX: 100, clientY: 100 },
        { identifier: 1, clientX: 150, clientY: 100 }
      ]);
      mockElement.dispatchEvent(startEvent);

      await new Promise(resolve => setTimeout(resolve, 100));

      const endEvent = createTouchEvent('touchend', [
        { identifier: 0, clientX: 100, clientY: 100 },
        { identifier: 1, clientX: 150, clientY: 100 }
      ]);
      mockElement.dispatchEvent(endEvent);

      // Should create announcement element
      expect(appendChildSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          textContent: 'Undo last action',
          className: 'sr-only'
        })
      );

      // Should clean up announcement after delay
      await new Promise(resolve => setTimeout(resolve, 1100));
      expect(removeChildSpy).toHaveBeenCalled();
    });
  });

  describe('Configuration and State Management', () => {
    it('should update configuration correctly', () => {
      const newConfig = {
        longPressThreshold: 1000,
        maxGestureDistance: 100,
        hapticFeedback: false
      };

      gestureService.updateConfig(newConfig);
      const config = gestureService.getConfig();

      expect(config.longPressThreshold).toBe(1000);
      expect(config.maxGestureDistance).toBe(100);
      expect(config.hapticFeedback).toBe(false);
      expect(config.enabled).toBe(true); // Should preserve existing values
    });

    it('should enable/disable gesture recognition', () => {
      gestureService.setEnabled(false);
      expect(gestureService.getConfig().enabled).toBe(false);

      gestureService.setEnabled(true);
      expect(gestureService.getConfig().enabled).toBe(true);
    });

    it('should return supported gestures list', () => {
      const gestures = gestureService.getSupportedGestures();
      
      expect(gestures).toHaveLength(6);
      expect(gestures[0]).toEqual({
        gesture: 'Two-finger tap',
        action: 'UNDO_LAST',
        description: 'Undo the last action'
      });
    });

    it('should clean up resources on dispose', () => {
      gestureService.initialize(mockElement, mockCallbacks);
      gestureService.dispose();

      expect(gestureService.getConfig().enabled).toBe(false);
      // Further gesture events should be ignored
    });
  });

  describe('Edge Cases and Error Handling', () => {
    beforeEach(() => {
      gestureService.initialize(mockElement, mockCallbacks);
    });

    it('should handle touch cancel events', () => {
      // Start gesture
      const startEvent = createTouchEvent('touchstart', [
        { identifier: 0, clientX: 100, clientY: 100 },
        { identifier: 1, clientX: 150, clientY: 100 }
      ]);
      mockElement.dispatchEvent(startEvent);

      expect(mockCallbacks.onGestureStart).toHaveBeenCalled();

      // Cancel gesture
      const cancelEvent = createTouchEvent('touchcancel', []);
      mockElement.dispatchEvent(cancelEvent);

      // Should clean up state without executing action
      expect(mockCallbacks.onGestureAction).not.toHaveBeenCalled();
    });

    it('should handle disabled state correctly', () => {
      gestureService.setEnabled(false);

      const touchEvent = createTouchEvent('touchstart', [
        { identifier: 0, clientX: 100, clientY: 100 },
        { identifier: 1, clientX: 150, clientY: 100 }
      ]);
      mockElement.dispatchEvent(touchEvent);

      expect(mockCallbacks.onGestureStart).not.toHaveBeenCalled();
    });

    it('should handle context menu prevention', () => {
      // Start gesture to activate gesture state
      const startEvent = createTouchEvent('touchstart', [
        { identifier: 0, clientX: 100, clientY: 100 },
        { identifier: 1, clientX: 150, clientY: 100 }
      ]);
      mockElement.dispatchEvent(startEvent);

      // Create context menu event
      const contextEvent = new Event('contextmenu');
      const preventDefaultSpy = jest.spyOn(contextEvent, 'preventDefault');
      
      mockElement.dispatchEvent(contextEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });
});

// Helper function to create touch events
function createTouchEvent(type: string, touches: Array<{ identifier: number; clientX: number; clientY: number }>): TouchEvent {
  const touchList = {
    length: touches.length,
    ...touches,
    item: (index: number) => touches[index] || null,
    [Symbol.iterator]: function* () {
      for (let i = 0; i < this.length; i++) {
        yield this[i];
      }
    }
  } as TouchList;

  const event = new Event(type, { bubbles: true, cancelable: true }) as TouchEvent;
  
  // Add touch properties
  Object.defineProperty(event, 'touches', { value: touchList });
  Object.defineProperty(event, 'changedTouches', { value: touchList });
  Object.defineProperty(event, 'targetTouches', { value: touchList });

  return event;
}