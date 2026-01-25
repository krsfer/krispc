/**
 * React hook for voice command functionality
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { voiceCommandService } from '@/lib/ai/voice-commands';
import { VoiceCommandError } from '@/types/ai';
import type {
  ParsedVoiceCommand,
  Language,
  VoiceCommandConfig
} from '@/types/ai';

interface VoiceCommandState {
  isListening: boolean;
  isSupported: boolean;
  language: Language;
  lastCommand: ParsedVoiceCommand | null;
  error: VoiceCommandError | null;
  permissionGranted: boolean | null;
}

interface VoiceCommandHandlers {
  onGeneratePattern?: (params: any) => void;
  onChangeTheme?: (theme: string) => void;
  onChangeMood?: (mood: string) => void;
  onChangeSize?: (size: number) => void;
  onSavePattern?: (name?: string) => void;
  onExportPattern?: (format?: string) => void;
  onHelp?: () => void;
  onClearCanvas?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
}

export function useVoiceCommands(handlers: VoiceCommandHandlers = {}) {
  const [state, setState] = useState<VoiceCommandState>({
    isListening: false,
    isSupported: voiceCommandService.isSpeechRecognitionSupported(),
    language: 'en',
    lastCommand: null,
    error: null,
    permissionGranted: null
  });

  const handlersRef = useRef(handlers);
  const commandHistoryRef = useRef<ParsedVoiceCommand[]>([]);

  // Update handlers ref when handlers change
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  /**
   * Handle voice command
   */
  const handleVoiceCommand = useCallback((command: ParsedVoiceCommand) => {
    console.log('Voice command received:', command);

    // Add to history
    commandHistoryRef.current.unshift(command);
    if (commandHistoryRef.current.length > 10) {
      commandHistoryRef.current = commandHistoryRef.current.slice(0, 10);
    }

    // Update state
    setState(prev => ({
      ...prev,
      lastCommand: command,
      error: null
    }));

    // Execute command
    const currentHandlers = handlersRef.current;

    try {
      switch (command.type) {
        case 'generate_pattern':
          currentHandlers.onGeneratePattern?.(command.parameters);
          break;

        case 'change_theme':
          if (command.parameters.theme) {
            currentHandlers.onChangeTheme?.(command.parameters.theme);
          }
          break;

        case 'change_mood':
          if (command.parameters.mood) {
            currentHandlers.onChangeMood?.(command.parameters.mood);
          }
          break;

        case 'change_size':
          if (command.parameters.size) {
            currentHandlers.onChangeSize?.(command.parameters.size);
          }
          break;

        case 'save_pattern':
          currentHandlers.onSavePattern?.(command.parameters.patternName);
          break;

        case 'export_pattern':
          currentHandlers.onExportPattern?.(command.parameters.format);
          break;

        case 'help':
          currentHandlers.onHelp?.();
          break;

        case 'clear_canvas':
          currentHandlers.onClearCanvas?.();
          break;

        case 'undo':
          currentHandlers.onUndo?.();
          break;

        case 'redo':
          currentHandlers.onRedo?.();
          break;

        case 'stop_listening':
          stopListening();
          break;

        default:
          console.warn('Unhandled voice command type:', command.type);
      }
    } catch (error) {
      console.error('Error executing voice command:', error);
      setState(prev => ({
        ...prev,
        error: new VoiceCommandError(
          `Failed to execute command: ${command.type}`,
          'RECOGNITION_ERROR',
          { command, error }
        )
      }));
    }
  }, []);

  /**
   * Handle voice command error
   */
  const handleVoiceError = useCallback((error: VoiceCommandError) => {
    console.error('Voice command error:', error);

    setState(prev => ({
      ...prev,
      error,
      isListening: false
    }));
  }, []);

  /**
   * Handle status change
   */
  const handleStatusChange = useCallback((isListening: boolean) => {
    setState(prev => ({
      ...prev,
      isListening
    }));
  }, []);

  /**
   * Set up event listeners
   */
  useEffect(() => {
    if (!state.isSupported) return;

    const unsubscribeCommand = voiceCommandService.onCommand(handleVoiceCommand);
    const unsubscribeError = voiceCommandService.onError(handleVoiceError);
    const unsubscribeStatus = voiceCommandService.onStatusChange(handleStatusChange);

    return () => {
      unsubscribeCommand();
      unsubscribeError();
      unsubscribeStatus();
    };
  }, [state.isSupported, handleVoiceCommand, handleVoiceError, handleStatusChange]);

  /**
   * Start listening for voice commands
   */
  const startListening = useCallback(async (config?: Partial<VoiceCommandConfig>) => {
    if (!state.isSupported) {
      setState(prev => ({
        ...prev,
        error: new VoiceCommandError('Speech recognition not supported', 'NOT_SUPPORTED')
      }));
      return false;
    }

    try {
      // Request microphone permission first
      const permission = await requestMicrophonePermission();

      setState(prev => ({
        ...prev,
        permissionGranted: permission,
        error: null
      }));

      if (!permission) {
        setState(prev => ({
          ...prev,
          error: new VoiceCommandError('Microphone permission denied', 'PERMISSION_DENIED')
        }));
        return false;
      }

      voiceCommandService.startListening(config);
      return true;

    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error instanceof VoiceCommandError ? error :
          new VoiceCommandError('Failed to start listening', 'RECOGNITION_ERROR', error)
      }));
      return false;
    }
  }, [state.isSupported]);

  /**
   * Stop listening for voice commands
   */
  const stopListening = useCallback(() => {
    voiceCommandService.stopListening();
  }, []);

  /**
   * Toggle listening state
   */
  const toggleListening = useCallback(async (config?: Partial<VoiceCommandConfig>) => {
    if (state.isListening) {
      stopListening();
      return false;
    } else {
      return await startListening(config);
    }
  }, [state.isListening, startListening, stopListening]);

  /**
   * Set language for voice recognition
   */
  const setLanguage = useCallback((language: Language) => {
    voiceCommandService.setLanguage(language);
    setState(prev => ({
      ...prev,
      language
    }));
  }, []);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null
    }));
  }, []);

  /**
   * Clear last command
   */
  const clearLastCommand = useCallback(() => {
    setState(prev => ({
      ...prev,
      lastCommand: null
    }));
  }, []);

  /**
   * Get command history
   */
  const getCommandHistory = useCallback((): ParsedVoiceCommand[] => {
    return [...commandHistoryRef.current];
  }, []);

  /**
   * Clear command history
   */
  const clearCommandHistory = useCallback(() => {
    commandHistoryRef.current = [];
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      voiceCommandService.stopListening();
    };
  }, []);

  return {
    // State
    isListening: state.isListening,
    isSupported: state.isSupported,
    language: state.language,
    lastCommand: state.lastCommand,
    error: state.error,
    permissionGranted: state.permissionGranted,

    // Actions
    startListening,
    stopListening,
    toggleListening,
    setLanguage,
    clearError,
    clearLastCommand,

    // Helpers
    getCommandHistory,
    clearCommandHistory,

    // Status helpers
    canListen: state.isSupported && state.permissionGranted !== false,
    needsPermission: state.isSupported && state.permissionGranted === null,
    hasPermissionDenied: state.permissionGranted === false
  };
}

/**
 * Request microphone permission
 */
async function requestMicrophonePermission(): Promise<boolean> {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return false;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Stop the stream immediately as we only needed permission
    stream.getTracks().forEach(track => track.stop());
    return true;
  } catch (error) {
    console.error('Microphone permission denied:', error);
    return false;
  }
}