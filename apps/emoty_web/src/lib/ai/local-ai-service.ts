import type { PatternSequence, EmojiCell } from '@/db/types';

interface LocalPatternRequest {
  prompt: string;
  language: 'en' | 'fr';
  difficulty?: 'simple' | 'medium' | 'complex';
  size?: number;
  style?: string;
  availablePalettes?: string[];
}

interface LocalPatternResponse {
  success: boolean;
  pattern?: PatternSequence;
  patternName?: string;
  explanation?: string;
  suggestedPalette?: string;
  error?: string;
}

interface LocalNamingRequest {
  pattern: PatternSequence;
  language: 'en' | 'fr';
  style?: 'creative' | 'descriptive' | 'playful' | 'elegant';
}

interface LocalNamingResponse {
  success: boolean;
  names?: string[];
  explanation?: string;
  error?: string;
}

interface PatternTemplate {
  name: string;
  keywords: string[];
  emojiSets: string[][];
  pattern: 'concentric' | 'radial' | 'spiral' | 'diagonal';
  difficulty: 'simple' | 'medium' | 'complex';
}

/**
 * Local AI Service - Rule-based fallback for AI pattern generation
 * Provides offline functionality and deterministic outputs
 */
export class LocalAIService {
  private patternTemplates: PatternTemplate[] = [
    {
      name: 'Nature Garden',
      keywords: ['nature', 'garden', 'flower', 'plant', 'green', 'forest'],
      emojiSets: [['🌸', '🌺', '🌻', '🌷'], ['🌱', '🌿', '🍀', '☘️'], ['🌳', '🌲', '🎋']],
      pattern: 'concentric',
      difficulty: 'simple',
    },
    {
      name: 'Ocean Waves',
      keywords: ['ocean', 'sea', 'water', 'beach', 'wave', 'blue'],
      emojiSets: [['🌊', '💧', '🌀'], ['🐠', '🐟', '🐡', '🐙'], ['🏖️', '🏝️', '⛵']],
      pattern: 'concentric',
      difficulty: 'medium',
    },
    {
      name: 'Space Galaxy',
      keywords: ['space', 'star', 'galaxy', 'cosmic', 'universe', 'planet'],
      emojiSets: [['⭐', '✨', '🌟', '💫'], ['🌍', '🌎', '🌏', '🪐'], ['🚀', '🛸', '🌙']],
      pattern: 'radial',
      difficulty: 'complex',
    },
    {
      name: 'Food Feast',
      keywords: ['food', 'eat', 'delicious', 'hungry', 'meal', 'cooking'],
      emojiSets: [['🍎', '🍊', '🍌', '🍓'], ['🍕', '🍔', '🌭', '🍟'], ['🍰', '🧁', '🍪', '🍩']],
      pattern: 'concentric',
      difficulty: 'simple',
    },
    {
      name: 'Love Hearts',
      keywords: ['love', 'heart', 'romantic', 'valentine', 'cute', 'sweet'],
      emojiSets: [['❤️', '💖', '💕', '💗'], ['💝', '💐', '🌹'], ['😍', '🥰', '😘']],
      pattern: 'concentric',
      difficulty: 'simple',
    },
    {
      name: 'Tech Digital',
      keywords: ['technology', 'computer', 'digital', 'tech', 'modern', 'electronic'],
      emojiSets: [['💻', '📱', '⌨️', '🖥️'], ['🔌', '💡', '⚡'], ['🤖', '👾', '🎮']],
      pattern: 'diagonal',
      difficulty: 'medium',
    },
    {
      name: 'Weather Elements',
      keywords: ['weather', 'rain', 'sun', 'cloud', 'storm', 'climate'],
      emojiSets: [['☀️', '🌤️', '⛅', '☁️'], ['🌧️', '⛈️', '🌩️'], ['❄️', '🌨️', '☃️']],
      pattern: 'spiral',
      difficulty: 'medium',
    },
    {
      name: 'Animal Kingdom',
      keywords: ['animal', 'pet', 'wild', 'cute', 'zoo', 'wildlife'],
      emojiSets: [['🐶', '🐱', '🐭', '🐹'], ['🦁', '🐯', '🐻', '🐼'], ['🐦', '🦋', '🐝', '🐛']],
      pattern: 'concentric',
      difficulty: 'complex',
    },
  ];

  private nameTemplates = {
    en: {
      creative: [
        '{emoji} Dreams',
        'Mystical {theme}',
        '{theme} Symphony',
        'Dancing {emoji}',
        'Enchanted {theme}',
        '{emoji} Wonderland',
        'Cosmic {theme}',
        '{theme} Harmony',
      ],
      descriptive: [
        '{theme} Pattern',
        '{emoji} Collection',
        '{theme} Design',
        'Simple {theme}',
        '{theme} Grid',
        '{emoji} Arrangement',
        'Classic {theme}',
        '{theme} Display',
      ],
      playful: [
        '{emoji} Party!',
        'Fun {theme}',
        '{emoji} Playground',
        'Happy {theme}',
        '{emoji} Festival',
        'Cheerful {theme}',
        '{emoji} Celebration',
        'Joyful {theme}',
      ],
      elegant: [
        'Elegant {theme}',
        'Royal {emoji}',
        'Graceful {theme}',
        'Majestic {emoji}',
        'Noble {theme}',
        'Refined {emoji}',
        'Sophisticated {theme}',
        'Classic {emoji}',
      ],
    },
    fr: {
      creative: [
        'Rêves de {emoji}',
        '{theme} Mystique',
        'Symphonie {theme}',
        '{emoji} Dansants',
        '{theme} Enchanté',
        'Pays des {emoji}',
        '{theme} Cosmique',
        'Harmonie {theme}',
      ],
      descriptive: [
        'Motif {theme}',
        'Collection {emoji}',
        'Design {theme}',
        '{theme} Simple',
        'Grille {theme}',
        'Arrangement {emoji}',
        '{theme} Classique',
        'Affichage {theme}',
      ],
      playful: [
        'Fête des {emoji}!',
        '{theme} Amusant',
        'Terrain de Jeu {emoji}',
        '{theme} Joyeux',
        'Festival {emoji}',
        '{theme} Gai',
        'Célébration {emoji}',
        '{theme} Joyeux',
      ],
      elegant: [
        '{theme} Élégant',
        '{emoji} Royal',
        '{theme} Gracieux',
        '{emoji} Majestueux',
        '{theme} Noble',
        '{emoji} Raffiné',
        '{theme} Sophistiqué',
        '{emoji} Classique',
      ],
    },
  };

  /**
   * Generate pattern using local rule-based logic
   */
  async generatePattern(request: LocalPatternRequest): Promise<LocalPatternResponse> {
    try {
      const { prompt, language, difficulty = 'medium', size = 5 } = request;
      
      // Find matching template
      const template = this.findBestTemplate(prompt, difficulty);
      if (!template) {
        return {
          success: false,
          error: 'Unable to generate pattern for this prompt',
        };
      }

      // Generate pattern based on template
      const pattern = this.generatePatternFromTemplate(template, size);
      const name = this.generatePatternName(template, language);
      const explanation = this.generateExplanation(template, language);

      return {
        success: true,
        pattern,
        patternName: name,
        explanation,
        suggestedPalette: this.suggestPalette(template),
      };

    } catch (error) {
      return {
        success: false,
        error: 'Local pattern generation failed',
      };
    }
  }

  /**
   * Generate pattern names using local templates
   */
  async generatePatternNames(request: LocalNamingRequest): Promise<LocalNamingResponse> {
    try {
      const { pattern, language, style = 'creative' } = request;
      
      // Analyze pattern to determine theme
      const theme = this.analyzePatternTheme(pattern);
      const emoji = this.getRepresentativeEmoji(pattern);
      
      // Generate names using templates
      const templates = this.nameTemplates[language][style];
      const names = templates
        .slice(0, 5) // Take first 5 templates
        .map(template => template
          .replace('{theme}', theme[language])
          .replace('{emoji}', emoji)
        );

      return {
        success: true,
        names,
        explanation: language === 'en' 
          ? `Generated ${style} names based on pattern analysis`
          : `Noms ${style} générés basés sur l'analyse du motif`,
      };

    } catch (error) {
      return {
        success: false,
        error: 'Local naming generation failed',
      };
    }
  }

  /**
   * Find best template match for prompt
   */
  private findBestTemplate(prompt: string, difficulty: string): PatternTemplate | null {
    const lowerPrompt = prompt.toLowerCase();
    
    // Score each template based on keyword matches
    const scores = this.patternTemplates.map(template => {
      let score = 0;
      
      // Keyword matching
      for (const keyword of template.keywords) {
        if (lowerPrompt.includes(keyword)) {
          score += 10;
        }
      }
      
      // Difficulty preference
      if (template.difficulty === difficulty) {
        score += 5;
      }
      
      return { template, score };
    });

    // Sort by score and return best match
    scores.sort((a, b) => b.score - a.score);
    
    // If no good matches, return a default template
    return scores[0]?.score > 0 ? scores[0].template : this.patternTemplates[0];
  }

  /**
   * Generate pattern from template
   */
  private generatePatternFromTemplate(template: PatternTemplate, size: number): PatternSequence {
    const emojis: EmojiCell[] = [];
    const center = Math.floor(size / 2);
    
    // Select emoji sets based on difficulty
    const maxSets = template.difficulty === 'simple' ? 2 : 
                   template.difficulty === 'medium' ? 3 : 
                   template.emojiSets.length;
    
    const selectedSets = template.emojiSets.slice(0, maxSets);
    
    switch (template.pattern) {
      case 'concentric':
        this.generateConcentricPattern(emojis, selectedSets, size, center);
        break;
      case 'radial':
        this.generateRadialPattern(emojis, selectedSets, size, center);
        break;
      case 'spiral':
        this.generateSpiralPattern(emojis, selectedSets, size, center);
        break;
      case 'diagonal':
        this.generateDiagonalPattern(emojis, selectedSets, size);
        break;
      default:
        this.generateConcentricPattern(emojis, selectedSets, size, center);
    }

    return {
      emojis,
      metadata: {
        version: 1,
        created_with: 'local_ai',
        last_modified: new Date(),
      },
    };
  }

  /**
   * Generate concentric square pattern
   */
  private generateConcentricPattern(
    emojis: EmojiCell[], 
    emojiSets: string[][], 
    size: number, 
    center: number
  ): void {
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        const distance = Math.max(Math.abs(row - center), Math.abs(col - center));
        const setIndex = distance % emojiSets.length;
        const emojiIndex = (row + col) % emojiSets[setIndex].length;
        
        emojis.push({
          emoji: emojiSets[setIndex][emojiIndex],
          position: { row, col },
          metadata: { source: 'ai', added_at: new Date() },
        });
      }
    }
  }

  /**
   * Generate radial pattern
   */
  private generateRadialPattern(
    emojis: EmojiCell[], 
    emojiSets: string[][], 
    size: number, 
    center: number
  ): void {
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        const dx = col - center;
        const dy = row - center;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        
        const setIndex = Math.floor(distance) % emojiSets.length;
        const emojiIndex = Math.floor((angle + Math.PI) / (Math.PI / 4)) % emojiSets[setIndex].length;
        
        emojis.push({
          emoji: emojiSets[setIndex][emojiIndex],
          position: { row, col },
          metadata: { source: 'ai', added_at: new Date() },
        });
      }
    }
  }

  /**
   * Generate spiral pattern
   */
  private generateSpiralPattern(
    emojis: EmojiCell[], 
    emojiSets: string[][], 
    size: number, 
    center: number
  ): void {
    const positions: { row: number; col: number }[] = [];
    
    // Generate spiral positions
    let row = center, col = center;
    let dx = 0, dy = -1;
    
    for (let i = 0; i < size * size; i++) {
      positions.push({ row, col });
      
      if (row === col || (row < col && row + col === size - 1) || (row > col && row + col === size - 1)) {
        [dx, dy] = [-dy, dx]; // Turn
      }
      
      row += dy;
      col += dx;
    }

    // Assign emojis to spiral positions
    positions.forEach((pos, index) => {
      const setIndex = Math.floor(index / 3) % emojiSets.length;
      const emojiIndex = index % emojiSets[setIndex].length;
      
      emojis.push({
        emoji: emojiSets[setIndex][emojiIndex],
        position: pos,
        metadata: { source: 'ai', added_at: new Date() },
      });
    });
  }

  /**
   * Generate diagonal pattern
   */
  private generateDiagonalPattern(
    emojis: EmojiCell[], 
    emojiSets: string[][], 
    size: number
  ): void {
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        const diagonal = (row + col) % (emojiSets.length * 2);
        const setIndex = Math.floor(diagonal / 2) % emojiSets.length;
        const emojiIndex = (row * col) % emojiSets[setIndex].length;
        
        emojis.push({
          emoji: emojiSets[setIndex][emojiIndex],
          position: { row, col },
          metadata: { source: 'ai', added_at: new Date() },
        });
      }
    }
  }

  /**
   * Generate pattern name from template
   */
  private generatePatternName(template: PatternTemplate, language: 'en' | 'fr'): string {
    const names = {
      en: template.name,
      fr: this.translateTemplateName(template.name),
    };

    return names[language];
  }

  /**
   * Generate explanation for pattern
   */
  private generateExplanation(template: PatternTemplate, language: 'en' | 'fr'): string {
    const explanations = {
      en: `Created a ${template.difficulty} ${template.pattern} pattern inspired by ${template.name.toLowerCase()}. This pattern uses carefully selected emojis to create visual harmony and balance.`,
      fr: `Créé un motif ${template.pattern} de difficulté ${template.difficulty} inspiré par ${this.translateTemplateName(template.name).toLowerCase()}. Ce motif utilise des emojis soigneusement sélectionnés pour créer une harmonie et un équilibre visuels.`,
    };

    return explanations[language];
  }

  /**
   * Translate template names to French
   */
  private translateTemplateName(name: string): string {
    const translations: Record<string, string> = {
      'Nature Garden': 'Jardin Nature',
      'Ocean Waves': 'Vagues Océan',
      'Space Galaxy': 'Galaxie Espace',
      'Food Feast': 'Festin Nourriture',
      'Love Hearts': 'Cœurs Amour',
      'Tech Digital': 'Tech Numérique',
      'Weather Elements': 'Éléments Météo',
      'Animal Kingdom': 'Royaume Animal',
    };

    return translations[name] || name;
  }

  /**
   * Suggest palette based on template
   */
  private suggestPalette(template: PatternTemplate): string | undefined {
    const paletteMapping: Record<string, string> = {
      'Nature Garden': 'nature-green',
      'Ocean Waves': 'ocean-blue',
      'Space Galaxy': 'space-cosmic',
      'Food Feast': 'food-colorful',
      'Love Hearts': 'hearts-pink',
      'Tech Digital': 'tech-modern',
      'Weather Elements': 'weather-varied',
      'Animal Kingdom': 'animals-cute',
    };

    return paletteMapping[template.name];
  }

  /**
   * Analyze pattern to determine theme
   */
  private analyzePatternTheme(pattern: PatternSequence): { en: string; fr: string } {
    const emojis = pattern.emojis.map(cell => cell.emoji);
    const uniqueEmojis = [...new Set(emojis)];

    // Simple theme detection based on emoji types
    const hasNature = uniqueEmojis.some(emoji => /[🌸🌺🌻🌷🌱🌿🍀☘️🌳🌲]/.test(emoji));
    const hasFood = uniqueEmojis.some(emoji => /[🍎🍊🍌🍓🍕🍔🌭🍟🍰🧁]/.test(emoji));
    const hasHearts = uniqueEmojis.some(emoji => /[❤️💖💕💗💝]/.test(emoji));
    const hasAnimals = uniqueEmojis.some(emoji => /[🐶🐱🐭🐹🦁🐯🐻🐼]/.test(emoji));
    const hasSpace = uniqueEmojis.some(emoji => /[⭐✨🌟💫🌍🌎🌏🪐🚀]/.test(emoji));

    if (hasNature) return { en: 'Nature', fr: 'Nature' };
    if (hasFood) return { en: 'Food', fr: 'Nourriture' };
    if (hasHearts) return { en: 'Love', fr: 'Amour' };
    if (hasAnimals) return { en: 'Animals', fr: 'Animaux' };
    if (hasSpace) return { en: 'Space', fr: 'Espace' };

    return { en: 'Pattern', fr: 'Motif' };
  }

  /**
   * Get representative emoji from pattern
   */
  private getRepresentativeEmoji(pattern: PatternSequence): string {
    const emojiCounts = new Map<string, number>();
    
    pattern.emojis.forEach(cell => {
      emojiCounts.set(cell.emoji, (emojiCounts.get(cell.emoji) || 0) + 1);
    });

    // Return most common emoji
    let mostCommon = '';
    let maxCount = 0;
    
    for (const [emoji, count] of emojiCounts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = emoji;
      }
    }

    return mostCommon || '🎨';
  }

  /**
   * Health check for local service
   */
  async healthCheck(): Promise<{ available: boolean; latencyMs: number }> {
    const start = Date.now();
    
    try {
      // Simple test generation
      await this.generatePattern({
        prompt: 'test',
        language: 'en',
        difficulty: 'simple',
        size: 3,
      });
      
      return {
        available: true,
        latencyMs: Date.now() - start,
      };
    } catch (error) {
      return {
        available: false,
        latencyMs: Date.now() - start,
      };
    }
  }
}

// Export singleton instance
export const localAIService = new LocalAIService();