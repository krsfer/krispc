/**
 * AI-powered pattern generation service with fallbacks
 */
import { anthropicClient } from './anthropic-client';
import type { 
  PatternGenerationRequest, 
  AIResponse, 
  GeneratedPattern,
  PatternTheme,
  PatternMood,
  UserLevel
} from '@/types/ai';

export class PatternGeneratorService {
  private localPatterns: Map<string, GeneratedPattern[]> = new Map();
  
  constructor() {
    this.initializeLocalPatterns();
  }

  /**
   * Generate patterns using AI with local fallback
   */
  async generatePatterns(request: PatternGenerationRequest): Promise<AIResponse> {
    try {
      // Check if AI service is available
      const canUseAI = await this.canUseAIService(request.userId);
      
      if (!canUseAI) {
        return this.generateLocalPatterns(request);
      }

      // Attempt AI generation
      const aiResponse = await anthropicClient.generatePattern(request);
      
      if (aiResponse.success && aiResponse.patterns?.length) {
        // Enhance patterns with local metadata
        aiResponse.patterns = aiResponse.patterns.map(pattern => 
          this.enhancePattern(pattern, request)
        );
        
        return aiResponse;
      }
      
      // AI failed, use local fallback
      return this.generateLocalPatterns(request);
      
    } catch (error) {
      console.error('Pattern generation error:', error);
      return this.generateLocalPatterns(request);
    }
  }

  /**
   * Check if AI service can be used for this user
   */
  private async canUseAIService(userId: string): Promise<boolean> {
    // Check rate limits
    const rateLimitStatus = anthropicClient.getRateLimitStatus(userId);
    if (!rateLimitStatus.canRequest) {
      return false;
    }

    // Check API connectivity (with timeout)
    try {
      const connectionPromise = anthropicClient.testConnection();
      const timeoutPromise = new Promise(resolve => setTimeout(() => resolve(false), 3000));
      
      const isConnected = await Promise.race([connectionPromise, timeoutPromise]);
      return Boolean(isConnected);
    } catch {
      return false;
    }
  }

  /**
   * Generate patterns using local algorithms
   */
  private generateLocalPatterns(request: PatternGenerationRequest): AIResponse {
    const patterns = this.getLocalPatternsForRequest(request);
    
    return {
      success: true,
      patterns,
      fallback: [],
      generatedAt: new Date(),
      usage: {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0
      }
    };
  }

  /**
   * Get local patterns based on request parameters
   */
  private getLocalPatternsForRequest(request: PatternGenerationRequest): GeneratedPattern[] {
    const { theme, mood, userLevel, maxPatterns = 2 } = request;
    
    // Get theme-based patterns
    let themePatterns = theme ? this.localPatterns.get(theme) || [] : [];
    
    // If no theme patterns, get general patterns
    if (themePatterns.length === 0) {
      themePatterns = this.localPatterns.get('general') || [];
    }
    
    // Filter by difficulty level
    const levelComplexity = this.getLevelComplexity(userLevel);
    const filteredPatterns = themePatterns.filter(pattern => {
      const patternComplexity = pattern.sequence.length;
      return patternComplexity >= levelComplexity.min && patternComplexity <= levelComplexity.max;
    });
    
    // Apply mood-based modifications
    const moodPatterns = mood ? this.applyMoodToPatterns(filteredPatterns, mood) : filteredPatterns;
    
    // Return requested number of patterns
    return this.shuffleArray(moodPatterns)
      .slice(0, maxPatterns)
      .map(pattern => this.enhancePattern(pattern, request));
  }

  /**
   * Get complexity range for user level
   */
  private getLevelComplexity(level: UserLevel): { min: number; max: number } {
    switch (level) {
      case 'beginner': return { min: 3, max: 6 };
      case 'intermediate': return { min: 6, max: 12 };
      case 'advanced': return { min: 12, max: 20 };
      case 'expert': return { min: 20, max: 36 };
    }
  }

  /**
   * Apply mood-based modifications to patterns
   */
  private applyMoodToPatterns(patterns: GeneratedPattern[], mood: PatternMood): GeneratedPattern[] {
    const moodEmojis = this.getMoodEmojis(mood);
    
    return patterns.map(pattern => ({
      ...pattern,
      sequence: this.blendWithMoodEmojis(pattern.sequence, moodEmojis, 0.3),
      description: `${this.getMoodAdjective(mood)} ${pattern.description}`,
      tags: [...pattern.tags, mood]
    }));
  }

  /**
   * Get emojis associated with a mood
   */
  private getMoodEmojis(mood: PatternMood): string[] {
    const moodMap: Record<PatternMood, string[]> = {
      happy: ['😊', '😀', '🎉', '🌟', '✨', '🎈'],
      calm: ['😌', '🕯️', '🧘', '🌿', '💙', '🤍'],
      energetic: ['⚡', '🔥', '💥', '🚀', '⭐', '💨'],
      romantic: ['💕', '💖', '🌹', '💐', '💝', '👑'],
      mysterious: ['🌙', '⭐', '🔮', '👻', '🖤', '💜'],
      playful: ['🎪', '🎨', '🎭', '🦄', '🍭', '🎯'],
      elegant: ['💎', '👑', '🌟', '🤍', '🖤', '✨'],
      bold: ['🔥', '💥', '⚡', '🦁', '👑', '💪'],
      peaceful: ['🕊️', '🌸', '🍃', '💚', '🤍', '☁️']
    };
    
    return moodMap[mood] || [];
  }

  /**
   * Get adjective for mood
   */
  private getMoodAdjective(mood: PatternMood): string {
    const adjectives: Record<PatternMood, string> = {
      happy: 'joyful',
      calm: 'serene',
      energetic: 'vibrant',
      romantic: 'romantic',
      mysterious: 'enigmatic',
      playful: 'whimsical',
      elegant: 'sophisticated',
      bold: 'dynamic',
      peaceful: 'tranquil'
    };
    
    return adjectives[mood] || '';
  }

  /**
   * Blend pattern emojis with mood emojis
   */
  private blendWithMoodEmojis(sequence: string[], moodEmojis: string[], ratio: number): string[] {
    const blendCount = Math.floor(sequence.length * ratio);
    const result = [...sequence];
    
    for (let i = 0; i < blendCount && i < moodEmojis.length; i++) {
      const randomIndex = Math.floor(Math.random() * result.length);
      result[randomIndex] = moodEmojis[i];
    }
    
    return result;
  }

  /**
   * Enhance pattern with request-specific metadata
   */
  private enhancePattern(pattern: GeneratedPattern, request: PatternGenerationRequest): GeneratedPattern {
    return {
      ...pattern,
      metadata: {
        ...pattern.metadata,
        userLevel: request.userLevel,
        language: request.language,
        generatedAt: new Date(),
        requestTheme: request.theme,
        requestMood: request.mood
      }
    };
  }

  /**
   * Shuffle array using Fisher-Yates algorithm
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Initialize local pattern library
   */
  private initializeLocalPatterns(): void {
    // Nature patterns
    this.localPatterns.set('nature', [
      {
        name: 'Forest Harmony',
        sequence: ['🌲', '🌿', '🍃', '🌱', '🌳', '🌾'],
        description: 'A peaceful forest scene',
        difficulty: 'intermediate',
        tags: ['nature', 'trees', 'green'],
        metadata: { aiGenerated: false, generatedBy: 'local' }
      },
      {
        name: 'Ocean Waves',
        sequence: ['🌊', '🐠', '🐙', '🦑', '🐋', '🏝️', '⛵', '🌊'],
        description: 'Life beneath the waves',
        difficulty: 'advanced',
        tags: ['nature', 'ocean', 'marine'],
        metadata: { aiGenerated: false, generatedBy: 'local' }
      },
      {
        name: 'Garden Paradise',
        sequence: ['🌺', '🌸', '🌼', '🌻', '🌷', '🌹'],
        description: 'A blooming flower garden',
        difficulty: 'beginner',
        tags: ['nature', 'flowers', 'colorful'],
        metadata: { aiGenerated: false, generatedBy: 'local' }
      }
    ]);

    // Emotion patterns
    this.localPatterns.set('emotions', [
      {
        name: 'Joy Spiral',
        sequence: ['😊', '😀', '🤗', '😄', '🥰', '😍'],
        description: 'A spiral of happiness',
        difficulty: 'beginner',
        tags: ['emotions', 'happy', 'faces'],
        metadata: { aiGenerated: false, generatedBy: 'local' }
      },
      {
        name: 'Love Constellation',
        sequence: ['💕', '💖', '💗', '💝', '💘', '💞', '💓', '💌'],
        description: 'Hearts forming a constellation',
        difficulty: 'intermediate',
        tags: ['emotions', 'love', 'hearts'],
        metadata: { aiGenerated: false, generatedBy: 'local' }
      }
    ]);

    // Food patterns
    this.localPatterns.set('food', [
      {
        name: 'Fruit Mandala',
        sequence: ['🍎', '🍊', '🍌', '🍇', '🍓', '🥝', '🍑', '🍒'],
        description: 'A colorful fruit arrangement',
        difficulty: 'intermediate',
        tags: ['food', 'fruit', 'healthy'],
        metadata: { aiGenerated: false, generatedBy: 'local' }
      },
      {
        name: 'Sweet Treats',
        sequence: ['🍰', '🧁', '🍪', '🍩', '🍫', '🍬'],
        description: 'Delicious desserts in harmony',
        difficulty: 'beginner',
        tags: ['food', 'sweet', 'dessert'],
        metadata: { aiGenerated: false, generatedBy: 'local' }
      }
    ]);

    // General patterns for fallback
    this.localPatterns.set('general', [
      {
        name: 'Rainbow Circle',
        sequence: ['❤️', '🧡', '💛', '💚', '💙', '💜'],
        description: 'A rainbow of hearts',
        difficulty: 'beginner',
        tags: ['colorful', 'hearts', 'rainbow'],
        metadata: { aiGenerated: false, generatedBy: 'local' }
      },
      {
        name: 'Starlight Pattern',
        sequence: ['⭐', '✨', '🌟', '💫', '⭐', '✨', '🌟', '💫'],
        description: 'Twinkling stars in the night',
        difficulty: 'intermediate',
        tags: ['stars', 'night', 'sparkle'],
        metadata: { aiGenerated: false, generatedBy: 'local' }
      },
      {
        name: 'Geometric Harmony',
        sequence: ['🔷', '🔶', '🔸', '🔹', '🔺', '🔻', '🔳', '🔲', '◼️', '◻️', '🔘', '⚫', '⚪'],
        description: 'Abstract geometric arrangement',
        difficulty: 'expert',
        tags: ['geometric', 'abstract', 'shapes'],
        metadata: { aiGenerated: false, generatedBy: 'local' }
      }
    ]);
  }

  /**
   * Get available themes
   */
  getAvailableThemes(): PatternTheme[] {
    return ['nature', 'emotions', 'food', 'travel', 'animals', 'abstract', 'seasonal', 'celebration', 'tech', 'sports'];
  }

  /**
   * Get available moods
   */
  getAvailableMoods(): PatternMood[] {
    return ['happy', 'calm', 'energetic', 'romantic', 'mysterious', 'playful', 'elegant', 'bold', 'peaceful'];
  }

  /**
   * Get pattern statistics
   */
  getPatternStats(): {
    totalPatterns: number;
    patternsByTheme: Record<string, number>;
    patternsByDifficulty: Record<string, number>;
  } {
    let totalPatterns = 0;
    const patternsByTheme: Record<string, number> = {};
    const patternsByDifficulty: Record<string, number> = {};

    for (const [theme, patterns] of this.localPatterns) {
      patternsByTheme[theme] = patterns.length;
      totalPatterns += patterns.length;

      patterns.forEach(pattern => {
        patternsByDifficulty[pattern.difficulty] = 
          (patternsByDifficulty[pattern.difficulty] || 0) + 1;
      });
    }

    return {
      totalPatterns,
      patternsByTheme,
      patternsByDifficulty
    };
  }
}

// Export singleton
export const patternGenerator = new PatternGeneratorService();