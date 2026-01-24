/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { useSession } from 'next-auth/react';
import { useUser } from '@/contexts/user-context';
import EmotyBotChat from '../EmotyBotChat';
import { emotyBot } from '@/lib/ai/emotybot';
import type { EmotyBotSession, GeneratedPattern } from '@/types/ai';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock dependencies
jest.mock('next-auth/react');
jest.mock('@/contexts/user-context');
jest.mock('@/lib/ai/emotybot');
jest.mock('@/lib/hooks/useVoiceCommands', () => ({
  useVoiceCommands: jest.fn(() => ({
    isListening: false,
    isSupported: true,
    toggleListening: jest.fn(),
    error: null
  }))
}));

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
const mockUseUser = useUser as jest.MockedFunction<typeof useUser>;
const mockEmotyBot = emotyBot as jest.Mocked<typeof emotyBot>;

const mockSession = {
  user: {
    id: 'user123',
    email: 'test@example.com',
    name: 'Test User'
  },
  expires: '2024-12-31'
};

const mockUserContext = {
  user: {
    id: 'user123',
    email: 'test@example.com',
    userLevel: 'intermediate' as const,
    reputationScore: 75,
    totalPatternsCreated: 15,
    languagePreference: 'en' as const,
    accessibilityPreferences: null
  },
  progression: null,
  availableFeatures: ['ai_pattern_generation', 'voice_commands'],
  isLoading: false,
  isAuthenticated: true,
  actions: {
    checkFeatureAccess: jest.fn(() => true),
    refreshProgression: jest.fn(),
    trackAction: jest.fn(),
    updateAccessibilityPreferences: jest.fn(),
    updateLanguagePreference: jest.fn()
  }
};

const mockBotSession: EmotyBotSession = {
  id: 'session123',
  userId: 'user123',
  messages: [
    {
      id: 'msg1',
      role: 'assistant',
      content: 'Hello! I\'m EmotyBot, ready to create patterns with you! 🎨',
      timestamp: new Date(),
      language: 'en',
      voiceCommand: false
    }
  ],
  startedAt: new Date(),
  lastActivity: new Date(),
  language: 'en',
  context: {
    userLevel: 'intermediate',
    preferences: {
      themes: [],
      moods: [],
      avoidEmojis: [],
      favoriteColors: []
    },
    stats: {
      messagesCount: 1,
      patternsGenerated: 0,
      tokensUsed: 0
    }
  }
};

const mockGeneratedPattern: GeneratedPattern = {
  name: 'Forest Pattern',
  sequence: ['🌲', '🌿', '🍃', '🌱'],
  description: 'A peaceful forest scene',
  difficulty: 'intermediate',
  tags: ['nature', 'trees', 'green'],
  metadata: {
    aiGenerated: true,
    generatedBy: 'claude'
  }
};

describe('EmotyBotChat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated',
      update: jest.fn()
    });
    
    mockUseUser.mockReturnValue(mockUserContext);
    
    mockEmotyBot.startSession.mockResolvedValue(mockBotSession);
    mockEmotyBot.getSession.mockReturnValue(mockBotSession);
    mockEmotyBot.sendMessage.mockResolvedValue({
      id: 'msg2',
      role: 'assistant',
      content: 'Here are some patterns for you!',
      timestamp: new Date(),
      language: 'en',
      voiceCommand: false,
      patterns: [mockGeneratedPattern]
    });
  });

  describe('initialization', () => {
    it('should initialize chat session on mount', async () => {
      render(<EmotyBotChat />);
      
      await waitFor(() => {
        expect(mockEmotyBot.startSession).toHaveBeenCalledWith(
          'user123',
          'intermediate',
          'en'
        );
      });
      
      expect(screen.getByText('EmotyBot')).toBeInTheDocument();
      expect(screen.getByText('Your Pattern Assistant')).toBeInTheDocument();
    });

    it('should show loading state during initialization', () => {
      mockEmotyBot.startSession.mockImplementation(() => new Promise(() => {}));
      
      render(<EmotyBotChat />);
      
      expect(screen.getByText('Initializing EmotyBot...')).toBeInTheDocument();
    });

    it('should handle initialization errors gracefully', async () => {
      mockEmotyBot.startSession.mockRejectedValue(new Error('Init failed'));
      
      render(<EmotyBotChat />);
      
      // Should not crash
      expect(screen.getByText('Initializing EmotyBot...')).toBeInTheDocument();
    });
  });

  describe('message display', () => {
    it('should display initial bot message', async () => {
      render(<EmotyBotChat />);
      
      await waitFor(() => {
        expect(screen.getByText(/Hello.*EmotyBot/)).toBeInTheDocument();
      });
    });

    it('should display message timestamps', async () => {
      render(<EmotyBotChat />);
      
      await waitFor(() => {
        expect(screen.getByText(mockBotSession.messages[0].timestamp.toLocaleTimeString())).toBeInTheDocument();
      });
    });

    it('should distinguish between user and bot messages', async () => {
      const sessionWithUserMessage = {
        ...mockBotSession,
        messages: [
          ...mockBotSession.messages,
          {
            id: 'user-msg',
            role: 'user' as const,
            content: 'Create a nature pattern',
            timestamp: new Date(),
            language: 'en' as const,
            voiceCommand: false
          }
        ]
      };
      
      mockEmotyBot.getSession.mockReturnValue(sessionWithUserMessage);
      
      render(<EmotyBotChat />);
      
      await waitFor(() => {
        expect(screen.getByText('Create a nature pattern')).toBeInTheDocument();
        expect(screen.getByText(/Hello.*EmotyBot/)).toBeInTheDocument();
      });
    });

    it('should display voice command indicator', async () => {
      const sessionWithVoiceMessage = {
        ...mockBotSession,
        messages: [
          ...mockBotSession.messages,
          {
            id: 'voice-msg',
            role: 'user' as const,
            content: 'Create patterns',
            timestamp: new Date(),
            language: 'en' as const,
            voiceCommand: true
          }
        ]
      };
      
      mockEmotyBot.getSession.mockReturnValue(sessionWithVoiceMessage);
      
      render(<EmotyBotChat />);
      
      await waitFor(() => {
        expect(screen.getByText('🎤 Voice command')).toBeInTheDocument();
      });
    });
  });

  describe('message sending', () => {
    it('should send text messages', async () => {
      render(<EmotyBotChat />);
      
      await waitFor(() => {
        expect(mockEmotyBot.startSession).toHaveBeenCalled();
      });
      
      const input = screen.getByPlaceholderText(/Type your message/);
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      fireEvent.change(input, { target: { value: 'Create a pattern' } });
      fireEvent.click(sendButton);
      
      await waitFor(() => {
        expect(mockEmotyBot.sendMessage).toHaveBeenCalledWith(
          'session123',
          'Create a pattern',
          false
        );
      });
      
      expect(input).toHaveValue('');
    });

    it('should send messages on Enter key', async () => {
      render(<EmotyBotChat />);
      
      await waitFor(() => {
        expect(mockEmotyBot.startSession).toHaveBeenCalled();
      });
      
      const input = screen.getByPlaceholderText(/Type your message/);
      
      fireEvent.change(input, { target: { value: 'Test message' } });
      fireEvent.keyPress(input, { key: 'Enter', code: 'Enter' });
      
      await waitFor(() => {
        expect(mockEmotyBot.sendMessage).toHaveBeenCalledWith(
          'session123',
          'Test message',
          false
        );
      });
    });

    it('should not send empty messages', async () => {
      render(<EmotyBotChat />);
      
      await waitFor(() => {
        expect(mockEmotyBot.startSession).toHaveBeenCalled();
      });
      
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      fireEvent.click(sendButton);
      
      expect(mockEmotyBot.sendMessage).not.toHaveBeenCalled();
    });

    it('should show loading state during message sending', async () => {
      mockEmotyBot.sendMessage.mockImplementation(() => new Promise(() => {}));
      
      render(<EmotyBotChat />);
      
      await waitFor(() => {
        expect(mockEmotyBot.startSession).toHaveBeenCalled();
      });
      
      const input = screen.getByPlaceholderText(/Type your message/);
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      fireEvent.change(input, { target: { value: 'Test' } });
      fireEvent.click(sendButton);
      
      expect(screen.getByText('...')).toBeInTheDocument();
      expect(sendButton).toBeDisabled();
    });

    it('should track message interactions', async () => {
      render(<EmotyBotChat />);
      
      await waitFor(() => {
        expect(mockEmotyBot.startSession).toHaveBeenCalled();
      });
      
      const input = screen.getByPlaceholderText(/Type your message/);
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      fireEvent.change(input, { target: { value: 'Create patterns' } });
      fireEvent.click(sendButton);
      
      await waitFor(() => {
        expect(mockUserContext.actions.trackAction).toHaveBeenCalledWith(
          'ai_chat_message',
          expect.objectContaining({
            messageLength: 'Create patterns'.length,
            hasPatterns: true,
            isVoiceCommand: false
          })
        );
      });
    });
  });

  describe('pattern display and selection', () => {
    it('should display generated patterns', async () => {
      const sessionWithPatterns = {
        ...mockBotSession,
        messages: [
          ...mockBotSession.messages,
          {
            id: 'pattern-msg',
            role: 'assistant' as const,
            content: 'Here are your patterns!',
            timestamp: new Date(),
            language: 'en' as const,
            voiceCommand: false,
            patterns: [mockGeneratedPattern]
          }
        ]
      };
      
      mockEmotyBot.getSession.mockReturnValue(sessionWithPatterns);
      
      render(<EmotyBotChat />);
      
      await waitFor(() => {
        expect(screen.getByText('Forest Pattern')).toBeInTheDocument();
        expect(screen.getByText('A peaceful forest scene')).toBeInTheDocument();
        expect(screen.getByText('nature')).toBeInTheDocument();
        expect(screen.getByText('🌲')).toBeInTheDocument();
      });
    });

    it('should handle pattern selection', async () => {
      const onPatternSelect = jest.fn();
      
      const sessionWithPatterns = {
        ...mockBotSession,
        messages: [
          ...mockBotSession.messages,
          {
            id: 'pattern-msg',
            role: 'assistant' as const,
            content: 'Here are your patterns!',
            timestamp: new Date(),
            language: 'en' as const,
            voiceCommand: false,
            patterns: [mockGeneratedPattern]
          }
        ]
      };
      
      mockEmotyBot.getSession.mockReturnValue(sessionWithPatterns);
      
      render(<EmotyBotChat onPatternSelect={onPatternSelect} />);
      
      await waitFor(() => {
        expect(screen.getByText('Use This Pattern')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Use This Pattern'));
      
      expect(onPatternSelect).toHaveBeenCalledWith(mockGeneratedPattern);
    });

    it('should display AI vs local pattern indicators', async () => {
      const localPattern = {
        ...mockGeneratedPattern,
        metadata: { aiGenerated: false, generatedBy: 'local' as const }
      };
      
      const sessionWithPatterns = {
        ...mockBotSession,
        messages: [
          ...mockBotSession.messages,
          {
            id: 'pattern-msg',
            role: 'assistant' as const,
            content: 'Here are your patterns!',
            timestamp: new Date(),
            language: 'en' as const,
            voiceCommand: false,
            patterns: [mockGeneratedPattern, localPattern]
          }
        ]
      };
      
      mockEmotyBot.getSession.mockReturnValue(sessionWithPatterns);
      
      render(<EmotyBotChat />);
      
      await waitFor(() => {
        const indicators = screen.getAllByText('🤖');
        expect(indicators).toHaveLength(1); // Only AI generated pattern
        
        const localIndicators = screen.getAllByText('✨');
        expect(localIndicators).toHaveLength(1); // Local pattern
      });
    });
  });

  describe('voice integration', () => {
    it('should show voice button when supported', () => {
      render(<EmotyBotChat />);
      
      expect(screen.getByTitle(/Start voice commands/)).toBeInTheDocument();
    });

    it('should handle voice toggle', () => {
      const { useVoiceCommands } = require('@/lib/hooks/useVoiceCommands');
      const mockToggleListening = jest.fn();
      
      useVoiceCommands.mockReturnValue({
        isListening: false,
        isSupported: true,
        toggleListening: mockToggleListening,
        error: null
      });
      
      render(<EmotyBotChat />);
      
      fireEvent.click(screen.getByTitle(/Start voice commands/));
      
      expect(mockToggleListening).toHaveBeenCalled();
    });

    it('should show listening state', () => {
      const { useVoiceCommands } = require('@/lib/hooks/useVoiceCommands');
      
      useVoiceCommands.mockReturnValue({
        isListening: true,
        isSupported: true,
        toggleListening: jest.fn(),
        error: null
      });
      
      render(<EmotyBotChat />);
      
      expect(screen.getByTitle(/Stop listening/)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Listening for voice commands/)).toBeInTheDocument();
    });

    it('should display voice errors', () => {
      const { useVoiceCommands } = require('@/lib/hooks/useVoiceCommands');
      
      useVoiceCommands.mockReturnValue({
        isListening: false,
        isSupported: true,
        toggleListening: jest.fn(),
        error: { message: 'Microphone permission denied', code: 'PERMISSION_DENIED' }
      });
      
      render(<EmotyBotChat />);
      
      expect(screen.getByText(/Voice: Microphone permission denied/)).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(<EmotyBotChat />);
      
      await waitFor(() => {
        expect(mockEmotyBot.startSession).toHaveBeenCalled();
      });
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should provide proper ARIA labels', async () => {
      render(<EmotyBotChat />);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/Start voice recognition/)).toBeInTheDocument();
        expect(screen.getByLabelText(/Send message/)).toBeInTheDocument();
      });
    });

    it('should support keyboard navigation', async () => {
      render(<EmotyBotChat />);
      
      await waitFor(() => {
        expect(mockEmotyBot.startSession).toHaveBeenCalled();
      });
      
      const input = screen.getByPlaceholderText(/Type your message/);
      input.focus();
      
      expect(document.activeElement).toBe(input);
    });
  });

  describe('error handling', () => {
    it('should handle message sending errors', async () => {
      mockEmotyBot.sendMessage.mockRejectedValue(new Error('Send failed'));
      
      render(<EmotyBotChat />);
      
      await waitFor(() => {
        expect(mockEmotyBot.startSession).toHaveBeenCalled();
      });
      
      const input = screen.getByPlaceholderText(/Type your message/);
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      fireEvent.change(input, { target: { value: 'Test' } });
      fireEvent.click(sendButton);
      
      // Should not crash and should reset loading state
      await waitFor(() => {
        expect(screen.getByText('→')).toBeInTheDocument(); // Send button text
      });
    });

    it('should cleanup session on unmount', () => {
      const { unmount } = render(<EmotyBotChat />);
      
      unmount();
      
      // Should cleanup session (tested through mock calls)
      expect(mockEmotyBot.endSession).toHaveBeenCalled();
    });
  });

  describe('customization', () => {
    it('should handle close callback', () => {
      const onClose = jest.fn();
      
      render(<EmotyBotChat onClose={onClose} />);
      
      fireEvent.click(screen.getByLabelText(/Close chat/));
      
      expect(onClose).toHaveBeenCalled();
    });

    it('should apply custom className', () => {
      const { container } = render(<EmotyBotChat className="custom-chat" />);
      
      expect(container.firstChild).toHaveClass('custom-chat');
    });
  });
});