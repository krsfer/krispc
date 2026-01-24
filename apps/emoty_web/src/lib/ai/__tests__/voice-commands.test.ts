/**
 * @jest-environment jsdom
 */

import { VoiceCommandService } from '../voice-commands';
import type { VoiceCommandError } from '@/types/ai';

// Mock SpeechRecognition
class MockSpeechRecognition implements Partial<SpeechRecognition> {
  continuous = false;
  interimResults = false;
  maxAlternatives = 1;
  lang = 'en-US';
  
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null = null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null = null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null = null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null = null;

  start = jest.fn();
  stop = jest.fn();
  abort = jest.fn();

  // Helper methods for testing
  simulateResult(transcript: string, confidence: number = 0.9) {
    if (this.onresult) {
      const mockEvent = {
        results: [
          [
            {
              transcript,
              confidence
            }
          ]
        ]
      } as any;
      mockEvent.results.length = 1;
      this.onresult(mockEvent);
    }
  }

  simulateStart() {
    if (this.onstart) {
      this.onstart({} as Event);
    }
  }

  simulateEnd() {
    if (this.onend) {
      this.onend({} as Event);
    }
  }

  simulateError(error: string) {
    if (this.onerror) {
      this.onerror({ error } as SpeechRecognitionErrorEvent);
    }
  }
}

// Mock navigator
Object.defineProperty(window, 'SpeechRecognition', {
  value: MockSpeechRecognition,
  writable: true
});

describe('VoiceCommandService', () => {
  let service: VoiceCommandService;
  let mockRecognition: MockSpeechRecognition;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new VoiceCommandService();
    mockRecognition = (service as any).recognition as MockSpeechRecognition;
  });

  describe('initialization', () => {
    it('should initialize with speech recognition support', () => {
      expect(service.isSpeechRecognitionSupported()).toBe(true);
      expect(mockRecognition).toBeInstanceOf(MockSpeechRecognition);
    });

    it('should handle missing speech recognition gracefully', () => {
      // Temporarily remove SpeechRecognition
      const originalSR = window.SpeechRecognition;
      delete (window as any).SpeechRecognition;
      
      const newService = new VoiceCommandService();
      expect(newService.isSpeechRecognitionSupported()).toBe(false);
      
      // Restore
      window.SpeechRecognition = originalSR;
    });
  });

  describe('command parsing', () => {
    it('should parse generate pattern commands', () => {
      const commands = [
        'generate a pattern',
        'create a nature pattern', 
        'make something happy'
      ];

      commands.forEach(command => {
        const commandListener = jest.fn();
        service.onCommand(commandListener);
        
        service.startListening();
        mockRecognition.simulateResult(command);
        
        expect(commandListener).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'generate_pattern',
            rawText: command
          })
        );
      });
    });

    it('should parse theme change commands', () => {
      const commandListener = jest.fn();
      service.onCommand(commandListener);
      
      service.startListening();
      mockRecognition.simulateResult('change theme to nature');
      
      expect(commandListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'change_theme',
          parameters: { theme: 'nature' }
        })
      );
    });

    it('should parse mood change commands', () => {
      const commandListener = jest.fn();
      service.onCommand(commandListener);
      
      service.startListening();
      mockRecognition.simulateResult('set mood to happy');
      
      expect(commandListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'change_mood',
          parameters: { mood: 'happy' }
        })
      );
    });

    it('should parse size change commands', () => {
      const commandListener = jest.fn();
      service.onCommand(commandListener);
      
      service.startListening();
      mockRecognition.simulateResult('make it size 8');
      
      expect(commandListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'change_size',
          parameters: { size: 8 }
        })
      );
    });

    it('should parse French commands', () => {
      service.setLanguage('fr');
      
      const commandListener = jest.fn();
      service.onCommand(commandListener);
      
      service.startListening();
      mockRecognition.simulateResult('créer un motif nature');
      
      expect(commandListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'generate_pattern',
          parameters: { theme: 'nature' }
        })
      );
    });

    it('should handle unrecognized commands', () => {
      const errorListener = jest.fn();
      service.onError(errorListener);
      
      service.startListening();
      mockRecognition.simulateResult('completely unrecognized command');
      
      expect(errorListener).toHaveBeenCalledWith(
        expect.any(Error)
      );
    });
  });

  describe('voice recognition lifecycle', () => {
    it('should start and stop listening', () => {
      expect(service.getStatus().isListening).toBe(false);
      
      service.startListening();
      mockRecognition.simulateStart();
      expect(service.getStatus().isListening).toBe(true);
      expect(mockRecognition.start).toHaveBeenCalled();
      
      service.stopListening();
      mockRecognition.simulateEnd();
      expect(service.getStatus().isListening).toBe(false);
      expect(mockRecognition.stop).toHaveBeenCalled();
    });

    it('should handle recognition errors', () => {
      const errorListener = jest.fn();
      service.onError(errorListener);
      
      service.startListening();
      mockRecognition.simulateError('not-allowed');
      
      expect(errorListener).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'PERMISSION_DENIED'
        })
      );
    });

    it('should notify status change listeners', () => {
      const statusListener = jest.fn();
      service.onStatusChange(statusListener);
      
      service.startListening();
      mockRecognition.simulateStart();
      expect(statusListener).toHaveBeenCalledWith(true);
      
      service.stopListening();
      mockRecognition.simulateEnd();
      expect(statusListener).toHaveBeenCalledWith(false);
    });
  });

  describe('language support', () => {
    it('should switch languages', () => {
      service.setLanguage('fr');
      expect(service.getStatus().language).toBe('fr');
      expect(mockRecognition.lang).toBe('fr-FR');
      
      service.setLanguage('en');
      expect(service.getStatus().language).toBe('en');
      expect(mockRecognition.lang).toBe('en-US');
    });

    it('should extract themes in different languages', () => {
      // Test English
      service.setLanguage('en');
      const commandListener = jest.fn();
      service.onCommand(commandListener);
      
      service.startListening();
      mockRecognition.simulateResult('create a forest pattern');
      
      expect(commandListener).toHaveBeenCalledWith(
        expect.objectContaining({
          parameters: { theme: 'nature' }
        })
      );
      
      commandListener.mockClear();
      
      // Test French
      service.setLanguage('fr');
      service.startListening();
      mockRecognition.simulateResult('créer un motif forêt');
      
      expect(commandListener).toHaveBeenCalledWith(
        expect.objectContaining({
          parameters: { theme: 'nature' }
        })
      );
    });
  });

  describe('event listeners', () => {
    it('should add and remove command listeners', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      
      const unsubscribe1 = service.onCommand(listener1);
      const unsubscribe2 = service.onCommand(listener2);
      
      service.startListening();
      mockRecognition.simulateResult('help');
      
      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
      
      // Unsubscribe first listener
      unsubscribe1();
      listener1.mockClear();
      listener2.mockClear();
      
      service.startListening();
      mockRecognition.simulateResult('help');
      
      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
      
      unsubscribe2();
    });

    it('should handle listener errors gracefully', () => {
      const faultyListener = jest.fn(() => {
        throw new Error('Listener error');
      });
      
      service.onCommand(faultyListener);
      
      // Should not throw
      expect(() => {
        service.startListening();
        mockRecognition.simulateResult('help');
      }).not.toThrow();
    });
  });

  describe('configuration', () => {
    it('should apply configuration options', () => {
      service.startListening({
        language: 'fr',
        continuous: true,
        interimResults: true,
        maxAlternatives: 5
      });
      
      expect(mockRecognition.lang).toBe('fr-FR');
      expect(mockRecognition.continuous).toBe(true);
      expect(mockRecognition.interimResults).toBe(true);
      expect(mockRecognition.maxAlternatives).toBe(5);
    });
  });

  describe('resource cleanup', () => {
    it('should clean up resources on dispose', () => {
      const listener = jest.fn();
      service.onCommand(listener);
      
      service.dispose();
      
      // Should not call listener after disposal
      service.startListening();
      mockRecognition.simulateResult('help');
      
      expect(listener).not.toHaveBeenCalled();
    });
  });
});