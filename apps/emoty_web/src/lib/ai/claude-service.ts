import Anthropic from '@anthropic-ai/sdk';
import type { EmojiCell, PatternSequence } from '@/db/types';

interface ClaudeConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  timeout: number;
}

interface PatternGenerationRequest {
  prompt: string;
  language: 'en' | 'fr';
  difficulty?: 'simple' | 'medium' | 'complex';
  size?: number;
  style?: string;
  availablePalettes?: string[];
}

interface PatternGenerationResponse {
  success: boolean;
  pattern?: PatternSequence;
  patternName?: string;
  explanation?: string;
  suggestedPalette?: string;
  error?: string;
  tokensUsed?: number;
  cached?: boolean;
}

interface NamingRequest {
  pattern: PatternSequence;
  language: 'en' | 'fr';
  style?: 'creative' | 'descriptive' | 'playful' | 'elegant';
}

interface NamingResponse {
  success: boolean;
  names?: string[];
  explanation?: string;
  error?: string;
  tokensUsed?: number;
  cached?: boolean;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  hash: string;
}

/**
 * Claude AI Service for pattern generation and naming
 * Provides secure, cached, and rate-limited access to Anthropic Claude API
 */
export class ClaudeService {
  private client: Anthropic;
  private config: ClaudeConfig;
  private cache = new Map<string, CacheEntry<any>>();
  private readonly CACHE_TTL = 1000 * 60 * 30; // 30 minutes
  private readonly MAX_CACHE_SIZE = 1000;

  constructor(config: Partial<ClaudeConfig> = {}) {
    const apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is required for Claude service');
    }

    this.config = {
      apiKey,
      model: config.model || process.env.CLAUDE_MODEL || 'claude-3-haiku-20240307',
      maxTokens: config.maxTokens || 2000,
      timeout: config.timeout || 30000,
    };

    this.client = new Anthropic({
      apiKey: this.config.apiKey,
      maxRetries: 2,
      timeout: this.config.timeout,
    });
  }

  /**
   * Generate emoji pattern from text prompt
   */
  async generatePattern(request: PatternGenerationRequest): Promise<PatternGenerationResponse> {
    try {
      // Check cache first
      const cacheKey = this.generateCacheKey('pattern', request);
      const cached = this.getFromCache<PatternGenerationResponse>(cacheKey);
      if (cached) {
        return { ...cached, cached: true };
      }

      // Validate input
      if (!this.isValidPrompt(request.prompt)) {
        return {
          success: false,
          error: 'Invalid or potentially unsafe prompt content',
        };
      }

      const systemPrompt = this.buildPatternGenerationPrompt(request.language);
      const userPrompt = this.buildUserPatternPrompt(request);

      const response = await this.client.messages.create({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: userPrompt,
        }],
      });

      const result = await this.parsePatternResponse(response, request.language);
      
      // Cache successful result
      if (result.success) {
        this.setCache(cacheKey, result);
      }

      return result;

    } catch (error) {
      console.error('Claude pattern generation error:', error);
      return {
        success: false,
        error: this.getErrorMessage(error),
      };
    }
  }

  /**
   * Generate creative names for patterns
   */
  async generatePatternNames(request: NamingRequest): Promise<NamingResponse> {
    try {
      // Check cache first
      const cacheKey = this.generateCacheKey('naming', request);
      const cached = this.getFromCache<NamingResponse>(cacheKey);
      if (cached) {
        return { ...cached, cached: true };
      }

      const systemPrompt = this.buildNamingPrompt(request.language);
      const userPrompt = this.buildUserNamingPrompt(request);

      const response = await this.client.messages.create({
        model: this.config.model,
        max_tokens: 800,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: userPrompt,
        }],
      });

      const result = await this.parseNamingResponse(response, request.language);
      
      // Cache successful result
      if (result.success) {
        this.setCache(cacheKey, result);
      }

      return result;

    } catch (error) {
      console.error('Claude naming error:', error);
      return {
        success: false,
        error: this.getErrorMessage(error),
      };
    }
  }

  /**
   * Build system prompt for pattern generation
   */
  private buildPatternGenerationPrompt(language: 'en' | 'fr'): string {
    const prompts = {
      en: `You are an expert emoji pattern designer for the Emoty app. Your task is to create beautiful concentric square patterns using emojis.

IMPORTANT RULES:
1. Only respond with valid JSON containing pattern data
2. Use only standard Unicode emojis (no custom or text)
3. Create patterns that are visually appealing and meaningful
4. Patterns should be suitable for all ages (child-safe content)
5. Respect the requested size limitations
6. Focus on creating balanced, symmetric designs

Response format:
{
  "pattern": {
    "emojis": [{"emoji": "🌟", "position": {"row": 0, "col": 0}}],
    "metadata": {"version": 1, "created_with": "claude", "last_modified": "${new Date().toISOString()}"}
  },
  "name": "Descriptive pattern name",
  "explanation": "Brief explanation of the pattern design",
  "suggestedPalette": "palette-id-if-applicable"
}`,
      fr: `Vous êtes un expert en conception de motifs d'emojis pour l'application Emoty. Votre tâche est de créer de beaux motifs carrés concentriques en utilisant des emojis.

RÈGLES IMPORTANTES:
1. Répondez uniquement avec un JSON valide contenant les données du motif
2. Utilisez uniquement des emojis Unicode standard (pas de personnalisés ou de texte)
3. Créez des motifs visuellement attrayants et significatifs
4. Les motifs doivent être adaptés à tous les âges (contenu sûr pour les enfants)
5. Respectez les limitations de taille demandées
6. Concentrez-vous sur la création de designs équilibrés et symétriques

Format de réponse:
{
  "pattern": {
    "emojis": [{"emoji": "🌟", "position": {"row": 0, "col": 0}}],
    "metadata": {"version": 1, "created_with": "claude", "last_modified": "${new Date().toISOString()}"}
  },
  "name": "Nom descriptif du motif",
  "explanation": "Brève explication de la conception du motif",
  "suggestedPalette": "id-palette-si-applicable"
}`
    };

    return prompts[language];
  }

  /**
   * Build user prompt for pattern generation
   */
  private buildUserPatternPrompt(request: PatternGenerationRequest): string {
    const { prompt, difficulty = 'medium', size = 5, style, availablePalettes } = request;
    
    const difficultyGuide = {
      simple: 'Create a simple pattern with 2-3 emoji types, clear repetition',
      medium: 'Create a moderate complexity pattern with 3-5 emoji types, interesting variation',
      complex: 'Create a complex pattern with 4-7 emoji types, intricate design'
    };

    let userPrompt = `Create an emoji pattern based on: "${prompt}"

Requirements:
- Size: ${size}x${size} grid
- Difficulty: ${difficulty} (${difficultyGuide[difficulty]})
- Pattern should be concentric squares (center outward)`;

    if (style) {
      userPrompt += `\n- Style: ${style}`;
    }

    if (availablePalettes?.length) {
      userPrompt += `\n- Prefer emojis from these palettes: ${availablePalettes.join(', ')}`;
    }

    userPrompt += '\n\nRespond with JSON only, no additional text.';

    return userPrompt;
  }

  /**
   * Build system prompt for naming
   */
  private buildNamingPrompt(language: 'en' | 'fr'): string {
    const prompts = {
      en: `You are a creative naming expert for emoji patterns. Generate 3-5 creative, descriptive names for emoji patterns.

REQUIREMENTS:
1. Names should be engaging and memorable
2. Suitable for all ages (family-friendly)
3. Capture the essence and mood of the pattern
4. Avoid offensive or inappropriate content
5. Be creative but not overly abstract

Response format:
{
  "names": ["Creative Name 1", "Descriptive Name 2", "Playful Name 3"],
  "explanation": "Brief explanation of naming approach"
}`,
      fr: `Vous êtes un expert en dénomination créative pour les motifs d'emojis. Générez 3-5 noms créatifs et descriptifs pour les motifs d'emojis.

EXIGENCES:
1. Les noms doivent être engageants et mémorables
2. Adaptés à tous les âges (famille-friendly)
3. Capturer l'essence et l'ambiance du motif
4. Éviter le contenu offensant ou inapproprié
5. Être créatif mais pas trop abstrait

Format de réponse:
{
  "names": ["Nom Créatif 1", "Nom Descriptif 2", "Nom Ludique 3"],
  "explanation": "Brève explication de l'approche de dénomination"
}`
    };

    return prompts[language];
  }

  /**
   * Build user prompt for naming
   */
  private buildUserNamingPrompt(request: NamingRequest): string {
    const { pattern, style = 'creative' } = request;
    
    const emojis = pattern.emojis.map(cell => cell.emoji).join('');
    const uniqueEmojis = [...new Set(pattern.emojis.map(cell => cell.emoji))];

    const prompt = `Generate names for this emoji pattern:
- Emojis used: ${uniqueEmojis.join(' ')}
- Pattern size: ${Math.sqrt(pattern.emojis.length)}x${Math.sqrt(pattern.emojis.length)}
- Style preference: ${style}`;

    return prompt + '\n\nRespond with JSON only, no additional text.';
  }

  /**
   * Parse pattern generation response
   */
  private async parsePatternResponse(
    response: Anthropic.Messages.Message,
    language: 'en' | 'fr'
  ): Promise<PatternGenerationResponse> {
    try {
      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Expected text response from Claude');
      }

      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate the response structure
      if (!parsed.pattern || !parsed.pattern.emojis || !Array.isArray(parsed.pattern.emojis)) {
        throw new Error('Invalid pattern structure in response');
      }

      // Validate emoji cells
      for (const cell of parsed.pattern.emojis) {
        if (!cell.emoji || !cell.position || 
            typeof cell.position.row !== 'number' || 
            typeof cell.position.col !== 'number') {
          throw new Error('Invalid emoji cell structure');
        }
      }

      return {
        success: true,
        pattern: parsed.pattern,
        patternName: parsed.name || 'AI Generated Pattern',
        explanation: parsed.explanation || '',
        suggestedPalette: parsed.suggestedPalette,
        tokensUsed: response.usage?.input_tokens + response.usage?.output_tokens || 0,
      };

    } catch (error) {
      return {
        success: false,
        error: `Failed to parse pattern response: ${error.message}`,
      };
    }
  }

  /**
   * Parse naming response
   */
  private async parseNamingResponse(
    response: Anthropic.Messages.Message,
    language: 'en' | 'fr'
  ): Promise<NamingResponse> {
    try {
      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Expected text response from Claude');
      }

      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      if (!parsed.names || !Array.isArray(parsed.names)) {
        throw new Error('Invalid names array in response');
      }

      return {
        success: true,
        names: parsed.names.filter(name => typeof name === 'string' && name.length > 0),
        explanation: parsed.explanation || '',
        tokensUsed: response.usage?.input_tokens + response.usage?.output_tokens || 0,
      };

    } catch (error) {
      return {
        success: false,
        error: `Failed to parse naming response: ${error.message}`,
      };
    }
  }

  /**
   * Validate user prompt for safety
   */
  private isValidPrompt(prompt: string): boolean {
    if (!prompt || prompt.length < 3 || prompt.length > 500) {
      return false;
    }

    // Basic content filtering - extend this list as needed
    const inappropriateTerms = [
      'violence', 'weapon', 'drug', 'hate', 'explicit',
      // Add more terms as needed for child safety
    ];

    const lowerPrompt = prompt.toLowerCase();
    return !inappropriateTerms.some(term => lowerPrompt.includes(term));
  }

  /**
   * Generate cache key for request
   */
  private generateCacheKey(type: string, request: any): string {
    const hash = JSON.stringify(request);
    return `${type}:${this.hashString(hash)}`;
  }

  /**
   * Simple string hash function
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get item from cache
   */
  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set item in cache
   */
  private setCache<T>(key: string, data: T): void {
    // Clean cache if it gets too large
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.CACHE_TTL,
      hash: this.hashString(JSON.stringify(data)),
    };

    this.cache.set(key, entry);
  }

  /**
   * Get error message from API error
   */
  private getErrorMessage(error: any): string {
    if (error?.response?.data?.error?.message) {
      return error.response.data.error.message;
    }
    if (error?.message) {
      return error.message;
    }
    return 'An unknown error occurred with the AI service';
  }

  /**
   * Clear cache (useful for testing or memory management)
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { size: number; hitRate: number } {
    // This would require tracking hits/misses for accurate hit rate
    return {
      size: this.cache.size,
      hitRate: 0, // Placeholder - implement proper tracking if needed
    };
  }
}

// Export singleton instance
export const claudeService = new ClaudeService();