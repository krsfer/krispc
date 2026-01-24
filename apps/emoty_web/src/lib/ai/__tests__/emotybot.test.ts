/**
 * @jest-environment jsdom
 */

import { EmotyBotService } from '../emotybot';
import { patternGenerator } from '../pattern-generator';
import type { GeneratedPattern } from '@/types/ai';

// Mock pattern generator
jest.mock('../pattern-generator');
const mockPatternGenerator = patternGenerator as jest.Mocked<typeof patternGenerator>;

describe('EmotyBotService', () => {
  let emotyBot: EmotyBotService;
  const userId = 'user123';
  
  const mockPatterns: GeneratedPattern[] = [
    {
      name: 'Forest Scene',
      sequence: ['🌲', '🌿', '🍃', '🌱'],
      description: 'A peaceful forest',
      difficulty: 'intermediate',
      tags: ['nature', 'trees'],
      metadata: {
        aiGenerated: false,
        generatedBy: 'local'
      }
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    emotyBot = new EmotyBotService();
    
    // Mock successful pattern generation
    mockPatternGenerator.generatePatterns.mockResolvedValue({
      success: true,
      patterns: mockPatterns,
      generatedAt: new Date(),
      usage: {
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150
      }
    });
  });

  describe('session management', () => {
    it('should start a new session', async () => {
      const session = await emotyBot.startSession(userId, 'intermediate', 'en');
      
      expect(session.userId).toBe(userId);
      expect(session.context.userLevel).toBe('intermediate');
      expect(session.language).toBe('en');
      expect(session.messages).toHaveLength(1);
      expect(session.messages[0].role).toBe('assistant');
      expect(session.messages[0].content).toContain('EmotyBot');
    });

    it('should start French session with French greeting', async () => {
      const session = await emotyBot.startSession(userId, 'beginner', 'fr');
      
      expect(session.language).toBe('fr');
      expect(session.messages[0].content).toContain('EmotyBot');
    });

    it('should retrieve and end sessions', async () => {
      const session = await emotyBot.startSession(userId, 'intermediate');
      
      const retrieved = emotyBot.getSession(session.id);
      expect(retrieved).toEqual(session);
      
      emotyBot.endSession(session.id);
      expect(emotyBot.getSession(session.id)).toBeUndefined();
    });
  });

  describe('message handling', () => {
    let sessionId: string;

    beforeEach(async () => {
      const session = await emotyBot.startSession(userId, 'intermediate', 'en');
      sessionId = session.id;
    });

    it('should handle greeting messages', async () => {
      const response = await emotyBot.sendMessage(sessionId, 'Hello!');
      
      expect(response.role).toBe('assistant');
      expect(response.content).toContain('EmotyBot');
      expect(response.language).toBe('en');
    });

    it('should handle help requests', async () => {
      const response = await emotyBot.sendMessage(sessionId, 'Help me');
      
      expect(response.content.toLowerCase()).toContain('help');
      expect(response.content).toContain('pattern');
    });

    it('should handle pattern requests', async () => {
      const response = await emotyBot.sendMessage(sessionId, 'Create a nature pattern');
      
      expect(mockPatternGenerator.generatePatterns).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          userLevel: 'intermediate',
          theme: 'nature'
        })
      );
      
      expect(response.patterns).toEqual(mockPatterns);
      expect(response.content).toContain('patterns');
    });

    it('should handle voice commands', async () => {
      const response = await emotyBot.sendMessage(sessionId, 'Generate happy patterns', true);
      
      expect(response.voiceCommand).toBe(false); // Bot response is not voice
      
      const session = emotyBot.getSession(sessionId);
      const userMessage = session!.messages.find(m => m.role === 'user');
      expect(userMessage!.voiceCommand).toBe(true);
    });

    it('should extract themes and moods from messages', async () => {
      await emotyBot.sendMessage(sessionId, 'Create something happy with animals');
      
      expect(mockPatternGenerator.generatePatterns).toHaveBeenCalledWith(
        expect.objectContaining({
          theme: 'animals',
          mood: 'happy'
        })
      );
    });

    it('should extract pattern size from messages', async () => {
      await emotyBot.sendMessage(sessionId, 'Make a 8x8 pattern');
      
      expect(mockPatternGenerator.generatePatterns).toHaveBeenCalledWith(
        expect.objectContaining({
          size: 8
        })
      );
    });

    it('should handle pattern generation errors gracefully', async () => {
      mockPatternGenerator.generatePatterns.mockResolvedValueOnce({
        success: false,
        error: 'API Error',
        fallback: [],
        generatedAt: new Date()
      });
      
      const response = await emotyBot.sendMessage(sessionId, 'Create a pattern');
      
      expect(response.content).toContain('trouble');
      expect(response.patterns).toEqual([]);
    });

    it('should handle positive feedback', async () => {
      // First generate a pattern
      await emotyBot.sendMessage(sessionId, 'Create a nature pattern');
      
      // Then give positive feedback
      const response = await emotyBot.sendMessage(sessionId, 'I love this pattern!');
      
      expect(response.content.toLowerCase()).toContain('glad');
    });

    it('should handle negative feedback', async () => {
      // First generate a pattern
      await emotyBot.sendMessage(sessionId, 'Create a nature pattern');
      
      // Then give negative feedback
      const response = await emotyBot.sendMessage(sessionId, 'I don\'t like this');
      
      expect(response.content.toLowerCase()).toContain('different');
    });

    it('should update session statistics', async () => {
      await emotyBot.sendMessage(sessionId, 'Create a pattern');
      
      const session = emotyBot.getSession(sessionId);
      expect(session!.context.stats.messagesCount).toBe(1);
      expect(session!.context.stats.patternsGenerated).toBe(mockPatterns.length);
      expect(session!.context.stats.tokensUsed).toBe(150);
    });
  });

  describe('context analysis', () => {
    let sessionId: string;

    beforeEach(async () => {
      const session = await emotyBot.startSession(userId, 'intermediate', 'en');
      sessionId = session.id;
    });

    it('should identify pattern requests', async () => {
      const requests = [
        'Create a pattern',
        'Generate something',
        'Make a design',
        'I want patterns'
      ];

      for (const request of requests) {
        await emotyBot.sendMessage(sessionId, request);
        expect(mockPatternGenerator.generatePatterns).toHaveBeenCalled();
        mockPatternGenerator.generatePatterns.mockClear();
      }
    });

    it('should track conversation preferences', async () => {
      await emotyBot.sendMessage(sessionId, 'Create nature patterns');
      await emotyBot.sendMessage(sessionId, 'Make something happy');
      
      const session = emotyBot.getSession(sessionId);
      expect(session!.context.preferences.themes).toContain('nature');
      expect(session!.context.preferences.moods).toContain('happy');
    });

    it('should handle follow-up conversations', async () => {
      // Initial pattern request
      await emotyBot.sendMessage(sessionId, 'Create nature patterns');
      
      // Follow-up request
      const response = await emotyBot.sendMessage(sessionId, 'Make them bigger');
      
      expect(mockPatternGenerator.generatePatterns).toHaveBeenCalledTimes(2);
    });
  });

  describe('multilingual support', () => {
    it('should handle French conversations', async () => {
      const session = await emotyBot.startSession(userId, 'intermediate', 'fr');
      
      const response = await emotyBot.sendMessage(session.id, 'Créer un motif nature');
      
      expect(mockPatternGenerator.generatePatterns).toHaveBeenCalledWith(
        expect.objectContaining({
          language: 'fr',
          theme: 'nature'
        })
      );
      
      expect(response.language).toBe('fr');
    });

    it('should extract French themes and moods', async () => {
      const session = await emotyBot.startSession(userId, 'intermediate', 'fr');
      
      await emotyBot.sendMessage(session.id, 'Faire quelque chose de joyeux avec des animaux');
      
      expect(mockPatternGenerator.generatePatterns).toHaveBeenCalledWith(
        expect.objectContaining({
          theme: 'animals',
          mood: 'happy'
        })
      );
    });
  });

  describe('session cleanup', () => {
    it('should clean up old sessions', async () => {
      const session1 = await emotyBot.startSession('user1', 'intermediate');
      const session2 = await emotyBot.startSession('user2', 'intermediate');
      
      // Mock old timestamp
      session1.lastActivity = new Date(Date.now() - 40 * 60 * 1000); // 40 minutes ago
      
      emotyBot.cleanupOldSessions();
      
      expect(emotyBot.getSession(session1.id)).toBeUndefined();
      expect(emotyBot.getSession(session2.id)).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle missing sessions gracefully', async () => {
      await expect(emotyBot.sendMessage('nonexistent', 'Hello'))
        .rejects.toThrow('Session not found');
    });

    it('should handle pattern generation failures', async () => {
      mockPatternGenerator.generatePatterns.mockRejectedValueOnce(
        new Error('Network error')
      );
      
      const session = await emotyBot.startSession(userId, 'intermediate');
      const response = await emotyBot.sendMessage(session.id, 'Create a pattern');
      
      expect(response.content).toContain('trouble');
      expect(response.patterns).toBeUndefined();
    });
  });

  describe('conversation flow', () => {
    let sessionId: string;

    beforeEach(async () => {
      const session = await emotyBot.startSession(userId, 'intermediate', 'en');
      sessionId = session.id;
    });

    it('should maintain conversation context', async () => {
      // User asks for nature pattern
      await emotyBot.sendMessage(sessionId, 'Create nature patterns');
      
      // Bot responds with patterns and follow-up
      const response = await emotyBot.sendMessage(sessionId, 'Make them more colorful');
      
      // Should still use nature theme but modify mood
      expect(mockPatternGenerator.generatePatterns).toHaveBeenLastCalledWith(
        expect.objectContaining({
          customPrompt: expect.stringContaining('colorful')
        })
      );
    });

    it('should provide appropriate responses to casual conversation', async () => {
      const response = await emotyBot.sendMessage(sessionId, 'How are you?');
      
      expect(response.content).toContain('pattern');
      expect(mockPatternGenerator.generatePatterns).not.toHaveBeenCalled();
    });
  });
});