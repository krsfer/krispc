/**
 * @jest-environment jsdom
 */

import { renderHook, act } from '@testing-library/react';
import { useAIPatternGeneration } from '../useAIPatternGeneration';

// Mock fetch
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('useAIPatternGeneration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('pattern generation', () => {
    it('should generate patterns successfully', async () => {
      const mockResponse = {
        success: true,
        patterns: [
          {
            name: 'Nature Pattern',
            sequence: ['🌲', '🌿', '🍃'],
            description: 'A forest scene',
            difficulty: 'intermediate',
            tags: ['nature'],
            metadata: { aiGenerated: true }
          }
        ],
        metadata: { tokensUsed: 100 }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const { result } = renderHook(() => useAIPatternGeneration());

      expect(result.current.isGenerating).toBe(false);
      expect(result.current.patterns).toEqual([]);

      let patterns: any;
      await act(async () => {
        patterns = await result.current.generatePatterns({ theme: 'nature' });
      });

      expect(patterns).toEqual(mockResponse.patterns);
      expect(result.current.isGenerating).toBe(false);
      expect(result.current.patterns).toEqual(mockResponse.patterns);
      expect(result.current.tokensUsed).toBe(100);
      expect(result.current.error).toBeNull();
    });

    it('should handle generation errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useAIPatternGeneration());

      await act(async () => {
        await result.current.generatePatterns({ theme: 'nature' });
      });

      expect(result.current.isGenerating).toBe(false);
      expect(result.current.patterns).toEqual([]);
      expect(result.current.error).toContain('Network error');
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Invalid request' })
      } as Response);

      const { result } = renderHook(() => useAIPatternGeneration());

      await act(async () => {
        await result.current.generatePatterns({ theme: 'nature' });
      });

      expect(result.current.error).toContain('Invalid request');
    });

    it('should handle rate limiting', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({ 
          error: 'Rate limited',
          nextRetryAt: new Date(Date.now() + 60000).toISOString()
        })
      } as Response);

      const { result } = renderHook(() => useAIPatternGeneration());

      await act(async () => {
        await result.current.generatePatterns({ theme: 'nature' });
      });

      expect(result.current.isRateLimited).toBe(true);
      expect(result.current.error).toContain('Rate limit exceeded');
      expect(result.current.rateLimitInfo.isRateLimited).toBe(true);
    });
  });

  describe('caching', () => {
    it('should cache successful results', async () => {
      const mockResponse = {
        success: true,
        patterns: [{ name: 'Test Pattern' }],
        metadata: { tokensUsed: 50 }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const { result } = renderHook(() => useAIPatternGeneration());

      // First call should make API request
      await act(async () => {
        await result.current.generatePatterns({ theme: 'nature' });
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second call with same options should use cache
      await act(async () => {
        await result.current.generatePatterns({ theme: 'nature' });
      });

      expect(mockFetch).toHaveBeenCalledTimes(1); // No additional call
      expect(result.current.patterns).toEqual(mockResponse.patterns);
    });

    it('should cache with different keys for different options', async () => {
      const mockResponse1 = {
        success: true,
        patterns: [{ name: 'Nature Pattern' }]
      };
      
      const mockResponse2 = {
        success: true,
        patterns: [{ name: 'Happy Pattern' }]
      };

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => mockResponse1 } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => mockResponse2 } as Response);

      const { result } = renderHook(() => useAIPatternGeneration());

      await act(async () => {
        await result.current.generatePatterns({ theme: 'nature' });
      });

      await act(async () => {
        await result.current.generatePatterns({ mood: 'happy' });
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should clear cache', async () => {
      const mockResponse = {
        success: true,
        patterns: [{ name: 'Test Pattern' }]
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const { result } = renderHook(() => useAIPatternGeneration());

      await act(async () => {
        await result.current.generatePatterns({ theme: 'nature' });
      });

      act(() => {
        result.current.clearCache();
      });

      // Should make new API call after cache clear
      await act(async () => {
        await result.current.generatePatterns({ theme: 'nature' });
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('request cancellation', () => {
    it('should cancel ongoing requests', async () => {
      const mockAbortController = {
        abort: jest.fn(),
        signal: {} as AbortSignal
      };
      
      jest.spyOn(window, 'AbortController').mockImplementation(() => mockAbortController as any);

      const { result } = renderHook(() => useAIPatternGeneration());

      // Start a request
      act(() => {
        result.current.generatePatterns({ theme: 'nature' });
      });

      expect(result.current.isGenerating).toBe(true);

      // Cancel it
      act(() => {
        result.current.cancelGeneration();
      });

      expect(mockAbortController.abort).toHaveBeenCalled();
      expect(result.current.isGenerating).toBe(false);
    });
  });

  describe('helper methods', () => {
    it('should generate by theme', async () => {
      const mockResponse = {
        success: true,
        patterns: [{ name: 'Nature Pattern' }]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const { result } = renderHook(() => useAIPatternGeneration());

      await act(async () => {
        await result.current.generateByTheme('nature', { size: 6 });
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/ai/generate-pattern',
        expect.objectContaining({
          body: JSON.stringify({ theme: 'nature', size: 6 })
        })
      );
    });

    it('should generate by mood', async () => {
      const mockResponse = {
        success: true,
        patterns: [{ name: 'Happy Pattern' }]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const { result } = renderHook(() => useAIPatternGeneration());

      await act(async () => {
        await result.current.generateByMood('happy', { maxPatterns: 3 });
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/ai/generate-pattern',
        expect.objectContaining({
          body: JSON.stringify({ mood: 'happy', maxPatterns: 3 })
        })
      );
    });

    it('should generate with custom prompt', async () => {
      const mockResponse = {
        success: true,
        patterns: [{ name: 'Custom Pattern' }]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const { result } = renderHook(() => useAIPatternGeneration());

      await act(async () => {
        await result.current.generateWithPrompt('make something unique', { language: 'fr' });
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/ai/generate-pattern',
        expect.objectContaining({
          body: JSON.stringify({ 
            customPrompt: 'make something unique', 
            language: 'fr' 
          })
        })
      );
    });
  });

  describe('state management', () => {
    it('should clear patterns and errors', () => {
      const { result } = renderHook(() => useAIPatternGeneration());

      // Set some state
      act(() => {
        (result.current as any).setState({
          patterns: [{ name: 'Test' }],
          error: 'Some error',
          isRateLimited: true
        });
      });

      act(() => {
        result.current.clearPatterns();
      });

      expect(result.current.patterns).toEqual([]);
      expect(result.current.error).toBeNull();
      expect(result.current.isRateLimited).toBe(false);
    });

    it('should track token usage across requests', async () => {
      const responses = [
        { success: true, patterns: [], metadata: { tokensUsed: 50 } },
        { success: true, patterns: [], metadata: { tokensUsed: 75 } }
      ];

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => responses[0] } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => responses[1] } as Response);

      const { result } = renderHook(() => useAIPatternGeneration());

      await act(async () => {
        await result.current.generatePatterns({ theme: 'nature' });
      });

      expect(result.current.tokensUsed).toBe(50);

      await act(async () => {
        await result.current.generatePatterns({ theme: 'animals' });
      });

      expect(result.current.tokensUsed).toBe(125);
    });

    it('should provide rate limit information', () => {
      const { result } = renderHook(() => useAIPatternGeneration());

      // Initially should allow generation
      expect(result.current.canGenerate).toBe(true);
      expect(result.current.rateLimitInfo.isRateLimited).toBe(false);

      // Simulate rate limit state
      act(() => {
        (result.current as any).setState({
          isRateLimited: true,
          nextRetryAt: new Date(Date.now() + 30000)
        });
      });

      expect(result.current.canGenerate).toBe(false);
      expect(result.current.rateLimitInfo.isRateLimited).toBe(true);
      expect(result.current.rateLimitInfo.canRetryIn).toBeGreaterThan(20);
    });
  });
});