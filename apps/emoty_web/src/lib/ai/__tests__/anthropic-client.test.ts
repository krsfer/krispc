/**
 * @jest-environment jsdom
 */

import { AnthropicClient } from '../anthropic-client';
import type { PatternGenerationRequest } from '@/types/ai';

// Mock fetch
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('AnthropicClient', () => {
  let client: AnthropicClient;
  
  const mockRequest: PatternGenerationRequest = {
    userId: 'user123',
    userLevel: 'intermediate',
    language: 'en',
    theme: 'nature',
    mood: 'happy',
    size: 6,
    maxPatterns: 2
  };

  beforeEach(() => {
    jest.clearAllMocks();
    client = new AnthropicClient('test-api-key');
  });

  describe('generatePattern', () => {
    it('should generate patterns successfully', async () => {
      const mockResponse = {
        content: [{
          type: 'text',
          text: JSON.stringify({
            patterns: [
              {
                name: 'Forest Harmony',
                sequence: ['🌲', '🌿', '🍃', '🌱'],
                description: 'A peaceful forest scene',
                difficulty: 'intermediate',
                tags: ['nature', 'trees', 'green']
              }
            ]
          })
        }],
        id: 'msg_123',
        model: 'claude-3-haiku-20240307',
        role: 'assistant',
        stop_reason: 'end_turn',
        usage: {
          input_tokens: 100,
          output_tokens: 150
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await client.generatePattern(mockRequest);

      expect(result.success).toBe(true);
      expect(result.patterns).toHaveLength(1);
      expect(result.patterns![0].name).toBe('Forest Harmony');
      expect(result.patterns![0].sequence).toEqual(['🌲', '🌿', '🍃', '🌱']);
      expect(result.usage?.totalTokens).toBe(250);
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: { message: 'Internal server error' } })
      } as Response);

      const result = await client.generatePattern(mockRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Internal server error');
      expect(result.fallback).toBeDefined();
      expect(result.fallback!.length).toBeGreaterThan(0);
    });

    it('should enforce rate limiting', async () => {
      // First request should succeed
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ type: 'text', text: '{"patterns": []}' }],
          usage: { input_tokens: 10, output_tokens: 10 }
        })
      } as Response);

      await client.generatePattern(mockRequest);

      // Second request should be rate limited
      const result = await client.generatePattern(mockRequest);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Rate limit exceeded');
    });

    it('should provide fallback patterns when AI fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await client.generatePattern(mockRequest);

      expect(result.success).toBe(false);
      expect(result.fallback).toBeDefined();
      expect(result.fallback!.length).toBeGreaterThan(0);
      expect(result.fallback![0].metadata.fallback).toBe(true);
    });

    it('should test API connectivity', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true
      } as Response);

      const isConnected = await client.testConnection();
      expect(isConnected).toBe(true);
    });

    it('should handle malformed JSON responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ type: 'text', text: 'invalid json' }],
          usage: { input_tokens: 10, output_tokens: 10 }
        })
      } as Response);

      const result = await client.generatePattern(mockRequest);

      expect(result.success).toBe(true);
      expect(result.patterns).toHaveLength(0);
    });

    it('should build appropriate system prompts', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ type: 'text', text: '{"patterns": []}' }],
          usage: { input_tokens: 10, output_tokens: 10 }
        })
      } as Response);

      await client.generatePattern({
        ...mockRequest,
        userLevel: 'expert',
        language: 'fr'
      });

      const callArgs = mockFetch.mock.calls[0][1] as RequestInit;
      const requestBody = JSON.parse(callArgs.body as string);
      
      expect(requestBody.system).toContain('Create highly complex patterns');
      expect(requestBody.system).toContain('Respond in French');
    });
  });

  describe('rate limiting', () => {
    it('should track rate limits per user', () => {
      const status1 = client.getRateLimitStatus('user1');
      const status2 = client.getRateLimitStatus('user2');

      expect(status1.canRequest).toBe(true);
      expect(status2.canRequest).toBe(true);
    });

    it('should prevent requests when rate limited', async () => {
      // Mock successful first request
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ type: 'text', text: '{"patterns": []}' }],
          usage: { input_tokens: 10, output_tokens: 10 }
        })
      } as Response);

      // First request
      await client.generatePattern(mockRequest);

      // Check rate limit status
      const status = client.getRateLimitStatus('user123');
      expect(status.canRequest).toBe(false);
      expect(status.nextRequestAt).toBeInstanceOf(Date);
    });
  });
});