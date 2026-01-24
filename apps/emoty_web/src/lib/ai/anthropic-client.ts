/**
 * Anthropic Claude API client with error handling and rate limiting
 */
import type { PatternGenerationRequest, AIResponse } from '@/types/ai';

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AnthropicRequest {
  model: string;
  max_tokens: number;
  messages: AnthropicMessage[];
  temperature?: number;
  system?: string;
}

interface AnthropicResponse {
  content: Array<{ type: 'text'; text: string }>;
  id: string;
  model: string;
  role: 'assistant';
  stop_reason: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export class AnthropicClient {
  private apiKey: string;
  private baseUrl = 'https://api.anthropic.com/v1';
  private rateLimiter: Map<string, number> = new Map();
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Check if we're within rate limits for a user
   */
  private checkRateLimit(userId: string): boolean {
    const now = Date.now();
    const lastRequest = this.rateLimiter.get(userId) || 0;
    const minInterval = 2000; // 2 seconds between requests per user
    
    if (now - lastRequest < minInterval) {
      return false;
    }
    
    this.rateLimiter.set(userId, now);
    return true;
  }

  /**
   * Generate pattern suggestions using Claude
   */
  async generatePattern(request: PatternGenerationRequest): Promise<AIResponse> {
    try {
      // Rate limiting
      if (!this.checkRateLimit(request.userId)) {
        throw new Error('Rate limit exceeded. Please wait before making another request.');
      }

      const systemPrompt = this.buildSystemPrompt(request);
      const userPrompt = this.buildUserPrompt(request);

      const anthropicRequest: AnthropicRequest = {
        model: 'claude-3-haiku-20240307',
        max_tokens: 1000,
        temperature: 0.7,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt
          }
        ]
      };

      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(anthropicRequest)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API Error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data: AnthropicResponse = await response.json();
      
      return {
        success: true,
        patterns: this.parsePatternResponse(data.content[0].text),
        usage: {
          inputTokens: data.usage.input_tokens,
          outputTokens: data.usage.output_tokens,
          totalTokens: data.usage.input_tokens + data.usage.output_tokens
        },
        model: data.model,
        generatedAt: new Date()
      };

    } catch (error) {
      console.error('Anthropic API error:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown AI service error',
        fallback: this.generateFallbackPatterns(request),
        generatedAt: new Date()
      };
    }
  }

  /**
   * Build system prompt based on user context
   */
  private buildSystemPrompt(request: PatternGenerationRequest): string {
    const { userLevel, language } = request;
    
    const levelInstructions = {
      beginner: 'Create simple, easy-to-follow patterns with 3-6 emojis',
      intermediate: 'Create moderately complex patterns with 6-12 emojis and interesting arrangements',
      advanced: 'Create sophisticated patterns with 12-20 emojis and complex geometric layouts',
      expert: 'Create highly complex patterns with 20+ emojis and intricate mathematical arrangements'
    };

    return `You are EmotyBot, an expert emoji pattern designer. Your role is to create beautiful, meaningful emoji patterns.

GUIDELINES:
- Pattern complexity: ${levelInstructions[userLevel]}
- Language: Respond in ${language === 'fr' ? 'French' : 'English'}
- Format: Return a JSON object with exactly this structure:
  {
    "patterns": [
      {
        "name": "Pattern Name",
        "sequence": ["emoji1", "emoji2", "emoji3"],
        "description": "Brief description",
        "difficulty": "${userLevel}",
        "tags": ["tag1", "tag2"]
      }
    ]
  }

RULES:
- Always return 2-3 pattern suggestions
- Use only standard Unicode emojis
- Each pattern must be unique and creative
- Include appropriate tags for categorization
- Ensure patterns are culturally appropriate
- Consider color harmony and visual balance`;
  }

  /**
   * Build user prompt with specific request details
   */
  private buildUserPrompt(request: PatternGenerationRequest): string {
    const { theme, mood, colors, size } = request;
    
    let prompt = `Create emoji patterns with the following requirements:\n`;
    
    if (theme) {
      prompt += `Theme: ${theme}\n`;
    }
    
    if (mood) {
      prompt += `Mood: ${mood}\n`;
    }
    
    if (colors?.length) {
      prompt += `Preferred colors: ${colors.join(', ')}\n`;
    }
    
    if (size) {
      prompt += `Target size: ${size}x${size} grid\n`;
    }
    
    prompt += `\nPlease generate creative and visually appealing emoji patterns that match these criteria.`;
    
    return prompt;
  }

  /**
   * Parse Claude's response to extract pattern data
   */
  private parsePatternResponse(content: string): any[] {
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      if (!parsed.patterns || !Array.isArray(parsed.patterns)) {
        throw new Error('Invalid pattern format');
      }
      
      return parsed.patterns.map((pattern: any) => ({
        name: pattern.name || 'Generated Pattern',
        sequence: pattern.sequence || [],
        description: pattern.description || '',
        difficulty: pattern.difficulty || 'beginner',
        tags: pattern.tags || [],
        metadata: {
          aiGenerated: true,
          generatedBy: 'claude',
          prompt: content.substring(0, 100) + '...'
        }
      }));
      
    } catch (error) {
      console.error('Failed to parse pattern response:', error);
      return [];
    }
  }

  /**
   * Generate fallback patterns when AI fails
   */
  private generateFallbackPatterns(request: PatternGenerationRequest): any[] {
    const { theme, userLevel } = request;
    
    const fallbackPatterns = [
      {
        name: 'Simple Smile Pattern',
        sequence: ['😊', '😀', '😊', '😀'],
        description: 'A cheerful alternating smile pattern',
        difficulty: 'beginner',
        tags: ['happy', 'simple', 'faces']
      },
      {
        name: 'Rainbow Hearts',
        sequence: ['❤️', '🧡', '💛', '💚', '💙', '💜'],
        description: 'A colorful heart rainbow',
        difficulty: 'intermediate',
        tags: ['hearts', 'rainbow', 'love']
      },
      {
        name: 'Nature Circle',
        sequence: ['🌱', '🌿', '🌳', '🌲', '🍃', '🌾'],
        description: 'Natural elements in harmony',
        difficulty: 'advanced',
        tags: ['nature', 'plants', 'green']
      }
    ];

    // Filter by user level
    const maxPatterns = userLevel === 'beginner' ? 1 : 2;
    return fallbackPatterns
      .filter(pattern => {
        if (userLevel === 'beginner') return pattern.difficulty === 'beginner';
        if (userLevel === 'intermediate') return ['beginner', 'intermediate'].includes(pattern.difficulty);
        return true;
      })
      .slice(0, maxPatterns)
      .map(pattern => ({
        ...pattern,
        metadata: {
          aiGenerated: false,
          fallback: true,
          reason: 'AI service unavailable'
        }
      }));
  }

  /**
   * Test API connectivity
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'test' }]
        })
      });

      return response.ok || response.status === 400; // 400 means API is reachable
    } catch {
      return false;
    }
  }

  /**
   * Get current rate limit status for user
   */
  getRateLimitStatus(userId: string): { canRequest: boolean; nextRequestAt?: Date } {
    const lastRequest = this.rateLimiter.get(userId);
    if (!lastRequest) {
      return { canRequest: true };
    }

    const minInterval = 2000;
    const nextRequestAt = new Date(lastRequest + minInterval);
    const canRequest = Date.now() >= nextRequestAt.getTime();

    return {
      canRequest,
      nextRequestAt: canRequest ? undefined : nextRequestAt
    };
  }
}

// Export singleton instance
export const anthropicClient = new AnthropicClient(
  process.env.ANTHROPIC_API_KEY || ''
);