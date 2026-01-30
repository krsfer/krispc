/**
 * React hook for AI pattern generation with error handling and caching
 */
import { useState, useCallback, useRef, useMemo } from 'react';
import type { 
  PatternGenerationRequest, 
  AIResponse, 
  GeneratedPattern,
  PatternTheme,
  PatternMood 
} from '@/types/ai';

interface GenerationState {
  isGenerating: boolean;
  patterns: GeneratedPattern[];
  error: string | null;
  isRateLimited: boolean;
  nextRetryAt?: Date;
  tokensUsed: number;
  lastGeneratedAt?: Date;
}

interface GenerationOptions {
  theme?: PatternTheme;
  mood?: PatternMood;
  colors?: string[];
  size?: number;
  customPrompt?: string;
  maxPatterns?: number;
  language?: 'en' | 'fr';
}

export function useAIPatternGeneration() {
  const [state, setState] = useState<GenerationState>({
    isGenerating: false,
    patterns: [],
    error: null,
    isRateLimited: false,
    tokensUsed: 0
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const cacheRef = useRef<Map<string, { patterns: GeneratedPattern[]; timestamp: number }>>(new Map());

  /**
   * Generate patterns with AI
   */
  const generatePatterns = useCallback(async (options: GenerationOptions = {}) => {
    // Create cache key
    const cacheKey = JSON.stringify(options);
    
    // Check cache (5 minute TTL)
    const cached = cacheRef.current.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
      setState(prev => ({
        ...prev,
        patterns: cached.patterns,
        error: null,
        lastGeneratedAt: new Date(cached.timestamp)
      }));
      return cached.patterns;
    }

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    setState(prev => ({
      ...prev,
      isGenerating: true,
      error: null,
      isRateLimited: false
    }));

    try {
      const response = await fetch('/api/ai/generate-pattern', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(options),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 429) {
          setState(prev => ({
            ...prev,
            isGenerating: false,
            isRateLimited: true,
            error: 'Rate limit exceeded. Please wait before generating more patterns.',
            nextRetryAt: errorData.nextRetryAt ? new Date(errorData.nextRetryAt) : new Date(Date.now() + 60000)
          }));
          return [];
        }

        throw new Error(errorData.error || 'Pattern generation failed');
      }

      const result: AIResponse & { metadata?: any } = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Pattern generation failed');
      }

      const patterns = result.patterns || [];
      
      // Cache successful results
      if (patterns.length > 0) {
        cacheRef.current.set(cacheKey, {
          patterns,
          timestamp: Date.now()
        });
      }

      setState(prev => ({
        ...prev,
        isGenerating: false,
        patterns,
        error: null,
        tokensUsed: prev.tokensUsed + (result.metadata?.tokensUsed || 0),
        lastGeneratedAt: new Date()
      }));

      return patterns;

    } catch (error: any) {
      if (error.name === 'AbortError') {
        return [];
      }

      setState(prev => ({
        ...prev,
        isGenerating: false,
        error: error.message || 'Failed to generate patterns',
        patterns: []
      }));

      return [];
    }
  }, []);

  /**
   * Generate patterns by theme
   */
  const generateByTheme = useCallback((theme: PatternTheme, additionalOptions?: Omit<GenerationOptions, 'theme'>) => {
    return generatePatterns({ theme, ...additionalOptions });
  }, [generatePatterns]);

  /**
   * Generate patterns by mood
   */
  const generateByMood = useCallback((mood: PatternMood, additionalOptions?: Omit<GenerationOptions, 'mood'>) => {
    return generatePatterns({ mood, ...additionalOptions });
  }, [generatePatterns]);

  /**
   * Generate with custom prompt
   */
  const generateWithPrompt = useCallback((customPrompt: string, additionalOptions?: Omit<GenerationOptions, 'customPrompt'>) => {
    return generatePatterns({ customPrompt, ...additionalOptions });
  }, [generatePatterns]);

  /**
   * Cancel ongoing generation
   */
  const cancelGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setState(prev => ({
      ...prev,
      isGenerating: false,
      error: null
    }));
  }, []);

  /**
   * Clear patterns and errors
   */
  const clearPatterns = useCallback(() => {
    setState(prev => ({
      ...prev,
      patterns: [],
      error: null,
      isRateLimited: false,
      nextRetryAt: undefined
    }));
  }, []);

  /**
   * Clear cache
   */
  const clearCache = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  /**
   * Get rate limit info
   */
  const { isRateLimited, nextRetryAt, isGenerating } = state;

  const rateLimitInfo = useMemo(() => {
    if (!isRateLimited || !nextRetryAt) {
      return { isRateLimited: false, canRetryIn: 0 };
    }

    const canRetryIn = Math.max(0, nextRetryAt.getTime() - Date.now());
    
    return {
      isRateLimited: canRetryIn > 0,
      canRetryIn: Math.ceil(canRetryIn / 1000), // seconds
      nextRetryAt
    };
  }, [isRateLimited, nextRetryAt]);

  /**
   * Check if we can generate more patterns
   */
  const canGenerate = useMemo(() => {
    if (isGenerating) return false;
    if (!isRateLimited) return true;
    if (!nextRetryAt) return true;
    
    return Date.now() >= nextRetryAt.getTime();
  }, [isGenerating, isRateLimited, nextRetryAt]);

  return {
    // State
    isGenerating: state.isGenerating,
    patterns: state.patterns,
    error: state.error,
    isRateLimited: state.isRateLimited,
    tokensUsed: state.tokensUsed,
    lastGeneratedAt: state.lastGeneratedAt,
    
    // Actions
    generatePatterns,
    generateByTheme,
    generateByMood,
    generateWithPrompt,
    cancelGeneration,
    clearPatterns,
    clearCache,
    
    // Helpers
    canGenerate,
    rateLimitInfo
  };
}