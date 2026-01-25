/**
 * Local Name Generator
 * Generates creative, culturally appropriate names for emoji patterns
 * Supports multilingual naming with template-based and algorithmic approaches
 */

import type { LocalizedString } from '@/types/pattern';
import { EMOJI_CONCEPTS, type EmotionType, type ColorFamily } from './emoji-concepts';

export interface NameGenerationRequest {
  sequence: string[];
  theme?: string;
  emotion?: EmotionType;
  colorFamily?: ColorFamily;
  complexity?: 'simple' | 'moderate' | 'complex';
  language?: 'en' | 'fr';
  style?: 'descriptive' | 'poetic' | 'fun' | 'minimalist';
  userLevel?: number;
}

export interface NameGenerationResult {
  name: LocalizedString;
  alternatives: LocalizedString[];
  rationale: string;
  confidence: number;
}

/**
 * Template-based name generator with creative algorithms
 */
export class LocalNameGenerator {
  private templates!: Map<string, NamingTemplate[]>;
  private adjectives!: Map<string, string[]>;
  private nouns!: Map<string, string[]>;
  private connectors!: Map<string, string[]>;
  private patterns!: Map<string, PatternNameRule[]>;

  constructor() {
    this.initializeTemplates();
    this.initializeWordBanks();
    this.initializePatternRules();
  }

  /**
   * Generate names for a pattern
   */
  generateName(request: NameGenerationRequest): NameGenerationResult {
    const language = request.language || 'en';
    const style = request.style || 'descriptive';

    try {
      // Analyze the emoji sequence for naming cues
      const analysis = this.analyzeSequence(request.sequence);

      // Generate primary name
      const primaryName = this.generatePrimaryName(request, analysis, style, language);

      // Generate alternatives
      const alternatives = this.generateAlternatives(request, analysis, 3);

      // Calculate confidence
      const confidence = this.calculateNamingConfidence(primaryName, analysis);

      return {
        name: primaryName,
        alternatives,
        rationale: this.explainNamingChoice(primaryName, analysis, language),
        confidence
      };

    } catch (error) {
      console.error('Name generation failed:', error);
      return this.generateFallbackName(request);
    }
  }

  /**
   * Analyze emoji sequence for naming patterns
   */
  private analyzeSequence(sequence: string[]): SequenceAnalysis {
    const categories = new Map<string, number>();
    const emotions = new Map<EmotionType, number>();
    const colors = new Map<ColorFamily, number>();
    const themes = new Set<string>();

    let totalComplexity = 0;
    let childSafeCount = 0;

    for (const emoji of sequence) {
      const concept = EMOJI_CONCEPTS[emoji];
      if (!concept) continue;

      // Collect categories
      for (const category of concept.categories) {
        const current = categories.get(category.primary) || 0;
        categories.set(category.primary, current + category.weight);

        if (category.secondary) {
          themes.add(category.secondary);
        }
      }

      // Collect emotions
      for (const emotion of concept.emotions) {
        const current = emotions.get(emotion.emotion) || 0;
        emotions.set(emotion.emotion, current + emotion.intensity);
      }

      // Collect colors
      const colorFamily = concept.visualHarmony.colorFamily;
      const current = colors.get(colorFamily) || 0;
      colors.set(colorFamily, current + 1);

      // Analyze complexity and safety
      totalComplexity += concept.visualHarmony.complexity;
      if (concept.culturalContext.appropriatenessLevel === 'child-safe') {
        childSafeCount++;
      }
    }

    return {
      dominantCategories: this.getTopEntries(categories, 3),
      dominantEmotions: this.getTopEntries(emotions, 2),
      dominantColors: this.getTopEntries(colors, 2),
      themes: Array.from(themes).slice(0, 5),
      avgComplexity: totalComplexity / sequence.length,
      childSafeRatio: childSafeCount / sequence.length,
      sequenceLength: sequence.length,
      uniqueCount: new Set(sequence).size,
      diversity: new Set(sequence).size / sequence.length
    };
  }

  /**
   * Generate primary name using templates and rules
   */
  private generatePrimaryName(
    request: NameGenerationRequest,
    analysis: SequenceAnalysis,
    style: string,
    language: string
  ): LocalizedString {
    const generators = [
      () => this.generateTemplateBasedName(analysis, style, language),
      () => this.generateThemeBasedName(request, analysis, language),
      () => this.generateEmotionBasedName(analysis, language),
      () => this.generateDescriptiveName(analysis, language),
      () => this.generateCreativeName(analysis, language)
    ];

    // Try generators in order of preference
    for (const generator of generators) {
      try {
        const result = generator();
        if (result.en && result.fr) {
          return result;
        }
      } catch (error) {
        console.warn('Name generator failed, trying next:', error);
      }
    }

    // Fallback to simple descriptive name
    return this.generateSimpleName(request.sequence, language);
  }

  /**
   * Generate template-based name
   */
  private generateTemplateBasedName(
    analysis: SequenceAnalysis,
    style: string,
    language: string
  ): LocalizedString {
    const templates = this.templates.get(`${style}-${language}`) || this.templates.get(`descriptive-${language}`) || [];

    if (templates.length === 0) {
      throw new Error('No templates available');
    }

    const template = this.selectBestTemplate(templates, analysis);
    return this.fillTemplate(template, analysis, language);
  }

  /**
   * Generate theme-based name
   */
  private generateThemeBasedName(
    request: NameGenerationRequest,
    analysis: SequenceAnalysis,
    language: string
  ): LocalizedString {
    const theme = request.theme || analysis.themes[0];
    if (!theme) throw new Error('No theme available');

    const adjectives = this.adjectives.get(language) || [];
    const nouns = this.nouns.get(language) || [];

    const themeAdjective = this.findThemeWord(theme, adjectives);
    const themeNoun = this.findThemeWord(theme, nouns) || (language === 'fr' ? 'motif' : 'pattern');

    if (language === 'fr') {
      return {
        en: `${this.capitalize(theme)} Pattern`,
        fr: `${this.capitalize(themeNoun)} ${themeAdjective || 'thématique'}`
      };
    } else {
      return {
        en: `${themeAdjective || 'Themed'} ${this.capitalize(themeNoun)}`,
        fr: `${this.capitalize(themeNoun)} ${themeAdjective || 'thématique'}`
      };
    }
  }

  /**
   * Generate emotion-based name
   */
  private generateEmotionBasedName(analysis: SequenceAnalysis, language: string): LocalizedString {
    const dominantEmotion = analysis.dominantEmotions[0];
    if (!dominantEmotion) throw new Error('No emotion detected');

    const emotionNames = {
      en: {
        joy: 'Joyful', love: 'Loving', surprise: 'Surprising', sadness: 'Melancholic',
        fear: 'Mysterious', anger: 'Intense', excitement: 'Exciting', calm: 'Peaceful',
        peace: 'Serene', energy: 'Energetic', mystery: 'Enigmatic', wonder: 'Wonderful'
      },
      fr: {
        joy: 'Joyeux', love: 'Amoureux', surprise: 'Surprenant', sadness: 'Mélancolique',
        fear: 'Mystérieux', anger: 'Intense', excitement: 'Excitant', calm: 'Paisible',
        peace: 'Serein', energy: 'Énergique', mystery: 'Énigmatique', wonder: 'Merveilleux'
      }
    };

    const baseName = language === 'fr' ? 'Motif' : 'Pattern';
    const emotionName = emotionNames[language as keyof typeof emotionNames][dominantEmotion.key as keyof typeof emotionNames.en] || dominantEmotion.key;

    return {
      en: `${emotionNames.en[dominantEmotion.key as keyof typeof emotionNames.en] || dominantEmotion.key} ${baseName}`,
      fr: `${baseName} ${emotionNames.fr[dominantEmotion.key as keyof typeof emotionNames.fr] || dominantEmotion.key}`
    };
  }

  /**
   * Generate descriptive name based on content analysis
   */
  private generateDescriptiveName(analysis: SequenceAnalysis, language: string): LocalizedString {
    const category = analysis.dominantCategories[0];
    const color = analysis.dominantColors[0];

    if (!category) throw new Error('No categories detected');

    const categoryNames = {
      en: {
        emotion: 'Emotional', nature: 'Natural', animal: 'Animal', food: 'Culinary',
        technology: 'Tech', weather: 'Weather', symbol: 'Symbolic', activity: 'Active',
        object: 'Artistic', building: 'Architectural'
      },
      fr: {
        emotion: 'Émotionnel', nature: 'Naturel', animal: 'Animal', food: 'Culinaire',
        technology: 'Technologique', weather: 'Météo', symbol: 'Symbolique', activity: 'Actif',
        object: 'Artistique', building: 'Architectural'
      }
    };

    const colorNames = {
      en: {
        red: 'Ruby', orange: 'Amber', yellow: 'Golden', green: 'Emerald',
        blue: 'Sapphire', purple: 'Violet', pink: 'Rose', black: 'Onyx',
        white: 'Pearl', brown: 'Bronze', multicolor: 'Rainbow', neutral: 'Neutral'
      },
      fr: {
        red: 'Rubis', orange: 'Ambre', yellow: 'Doré', green: 'Émeraude',
        blue: 'Saphir', purple: 'Violet', pink: 'Rose', black: 'Onyx',
        white: 'Perle', brown: 'Bronze', multicolor: 'Arc-en-ciel', neutral: 'Neutre'
      }
    };

    const categoryName = categoryNames[language as keyof typeof categoryNames][category.key as keyof typeof categoryNames.en] || category.key;
    const colorName = color ? colorNames[language as keyof typeof colorNames][color.key as keyof typeof colorNames.en] : null;

    const baseName = language === 'fr' ? 'Composition' : 'Composition';

    if (colorName) {
      return {
        en: `${colorName} ${categoryName} ${baseName}`,
        fr: `${baseName} ${categoryName} ${colorName}`
      };
    } else {
      return {
        en: `${categoryName} ${baseName}`,
        fr: `${baseName} ${categoryName}`
      };
    }
  }

  /**
   * Generate creative name with poetic elements
   */
  private generateCreativeName(analysis: SequenceAnalysis, language: string): LocalizedString {
    const poeticElements = {
      en: {
        prefixes: ['Dancing', 'Singing', 'Whispering', 'Blooming', 'Sparkling', 'Flowing', 'Gentle', 'Vibrant'],
        suffixes: ['Dreams', 'Symphony', 'Garden', 'Journey', 'Story', 'Magic', 'Wonder', 'Harmony'],
        connectors: ['of', 'in', 'with', 'through']
      },
      fr: {
        prefixes: ['Danse', 'Chant', 'Murmure', 'Floraison', 'Étincelle', 'Flux', 'Douceur', 'Vibrance'],
        suffixes: ['Rêves', 'Symphonie', 'Jardin', 'Voyage', 'Histoire', 'Magie', 'Merveille', 'Harmonie'],
        connectors: ['de', 'des', 'dans', 'avec', 'par']
      }
    };

    const elements = poeticElements[language as keyof typeof poeticElements];
    const prefix = elements.prefixes[Math.floor(Math.random() * elements.prefixes.length)];
    const suffix = elements.suffixes[Math.floor(Math.random() * elements.suffixes.length)];
    const connector = elements.connectors[Math.floor(Math.random() * elements.connectors.length)];

    if (language === 'fr') {
      return {
        en: `${prefix} ${connector} ${suffix}`,
        fr: `${prefix} ${connector} ${suffix}`
      };
    } else {
      return {
        en: `${prefix} ${connector} ${suffix}`,
        fr: `${prefix} ${connector} ${suffix}` // Could be improved with proper French structure
      };
    }
  }

  /**
   * Generate simple fallback name
   */
  private generateSimpleName(sequence: string[], language: string): LocalizedString {
    const count = sequence.length;
    const firstEmoji = sequence[0] || '✨';

    if (language === 'fr') {
      return {
        en: `Pattern ${firstEmoji}`,
        fr: `Motif ${firstEmoji} (${count})`
      };
    } else {
      return {
        en: `${firstEmoji} Pattern (${count})`,
        fr: `Motif ${firstEmoji} (${count})`
      };
    }
  }

  /**
   * Fill template with analyzed data
   */
  private fillTemplate(template: NamingTemplate, analysis: SequenceAnalysis, language: string): LocalizedString {
    let filled = template.pattern;

    // Replace placeholders
    filled = filled.replace('{category}', analysis.dominantCategories[0]?.key || 'mixed');
    filled = filled.replace('{emotion}', analysis.dominantEmotions[0]?.key || 'neutral');
    filled = filled.replace('{color}', analysis.dominantColors[0]?.key || 'colorful');
    filled = filled.replace('{complexity}', analysis.avgComplexity > 0.6 ? 'complex' : 'simple');
    filled = filled.replace('{count}', analysis.sequenceLength.toString());

    // Apply language-specific formatting
    const formatted = this.formatForLanguage(filled, language);

    return {
      en: language === 'en' ? formatted : this.translateToEnglish(formatted),
      fr: language === 'fr' ? formatted : this.translateToFrench(formatted)
    };
  }

  /**
   * Generate alternative names
   */
  private generateAlternatives(
    request: NameGenerationRequest,
    analysis: SequenceAnalysis,
    count: number
  ): LocalizedString[] {
    const alternatives: LocalizedString[] = [];
    const styles = ['descriptive', 'poetic', 'fun', 'minimalist'];
    const language = request.language || 'en';

    for (let i = 0; i < count && i < styles.length; i++) {
      try {
        const altName = this.generatePrimaryName(
          { ...request, style: styles[i] as any },
          analysis,
          styles[i],
          language
        );
        alternatives.push(altName);
      } catch (error) {
        // Skip failed alternatives
        console.warn('Alternative name generation failed:', error);
      }
    }

    // Fill with simple variations if needed
    while (alternatives.length < count) {
      const variation = this.generateVariation(request.sequence, language, alternatives.length);
      alternatives.push(variation);
    }

    return alternatives;
  }

  /**
   * Calculate naming confidence based on analysis quality
   */
  private calculateNamingConfidence(name: LocalizedString, analysis: SequenceAnalysis): number {
    let confidence = 0.7; // Base confidence

    // Boost for good category detection
    if (analysis.dominantCategories.length > 0 && analysis.dominantCategories[0].value > 0.5) {
      confidence += 0.1;
    }

    // Boost for emotional clarity
    if (analysis.dominantEmotions.length > 0 && analysis.dominantEmotions[0].value > 0.6) {
      confidence += 0.1;
    }

    // Boost for sequence diversity
    if (analysis.diversity > 0.8) {
      confidence += 0.05;
    }

    // Penalty for very short or very long names
    const nameLength = name.en.length;
    if (nameLength < 5 || nameLength > 40) {
      confidence -= 0.05;
    }

    return Math.max(0.5, Math.min(0.9, confidence));
  }

  /**
   * Helper methods
   */
  private getTopEntries<T>(map: Map<T, number>, limit: number): Array<{ key: T; value: number }> {
    return Array.from(map.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([key, value]) => ({ key, value }));
  }

  private selectBestTemplate(templates: NamingTemplate[], analysis: SequenceAnalysis): NamingTemplate {
    // Score templates based on analysis
    const scored = templates.map(template => ({
      template,
      score: this.scoreTemplate(template, analysis)
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored[0]?.template || templates[0];
  }

  private scoreTemplate(template: NamingTemplate, analysis: SequenceAnalysis): number {
    let score = template.baseScore || 0.5;

    // Prefer templates that match the analysis
    if (template.preferredCategories) {
      const matches = template.preferredCategories.filter(cat =>
        analysis.dominantCategories.some(domCat => domCat.key === cat)
      );
      score += matches.length * 0.1;
    }

    return score;
  }

  private fillTemplate_old(template: NamingTemplate, analysis: SequenceAnalysis, language: string): string {
    // This is a placeholder - would contain actual template filling logic
    return template.pattern.replace('{category}', analysis.dominantCategories[0]?.key || 'pattern');
  }

  private findThemeWord(theme: string, words: string[]): string | null {
    const themeLower = theme.toLowerCase();
    return words.find(word => word.toLowerCase().includes(themeLower) || themeLower.includes(word.toLowerCase())) || null;
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private formatForLanguage(text: string, language: string): string {
    // Apply language-specific capitalization and formatting rules
    if (language === 'fr') {
      // French typically doesn't capitalize every word in titles
      return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    } else {
      // English title case
      return text.replace(/\w\S*/g, (txt) =>
        txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
      );
    }
  }

  private translateToEnglish(text: string): string {
    // Simple translation mappings for common terms
    const translations: Record<string, string> = {
      'motif': 'pattern',
      'composition': 'composition',
      'harmonie': 'harmony',
      'émotionnel': 'emotional',
      'naturel': 'natural'
    };

    let translated = text;
    for (const [fr, en] of Object.entries(translations)) {
      translated = translated.replace(new RegExp(fr, 'gi'), en);
    }

    return translated || text;
  }

  private translateToFrench(text: string): string {
    // Simple translation mappings for common terms
    const translations: Record<string, string> = {
      'pattern': 'motif',
      'composition': 'composition',
      'harmony': 'harmonie',
      'emotional': 'émotionnel',
      'natural': 'naturel'
    };

    let translated = text;
    for (const [en, fr] of Object.entries(translations)) {
      translated = translated.replace(new RegExp(en, 'gi'), fr);
    }

    return translated || text;
  }

  private generateVariation(sequence: string[], language: string, index: number): LocalizedString {
    const firstEmoji = sequence[0] || '✨';
    const variantSuffixes = language === 'fr'
      ? ['Création', 'Design', 'Œuvre', 'Style']
      : ['Creation', 'Design', 'Work', 'Style'];

    const suffix = variantSuffixes[index % variantSuffixes.length];

    return {
      en: `${firstEmoji} ${language === 'en' ? suffix : 'Creation'} #${index + 1}`,
      fr: `${suffix} ${firstEmoji} #${index + 1}`
    };
  }

  private explainNamingChoice(name: LocalizedString, analysis: SequenceAnalysis, language: string): string {
    const category = analysis.dominantCategories[0]?.key || 'mixed';
    const emotion = analysis.dominantEmotions[0]?.key || 'neutral';

    if (language === 'fr') {
      return `Nom basé sur la catégorie principale "${category}" et l'émotion "${emotion}" détectées dans la séquence.`;
    } else {
      return `Name based on dominant category "${category}" and emotion "${emotion}" detected in the sequence.`;
    }
  }

  private generateFallbackName(request: NameGenerationRequest): NameGenerationResult {
    const simple = this.generateSimpleName(request.sequence, request.language || 'en');

    return {
      name: simple,
      alternatives: [simple],
      rationale: 'Generated using fallback naming algorithm',
      confidence: 0.6
    };
  }

  // Initialization methods
  private initializeTemplates(): void {
    this.templates = new Map();

    // English templates
    this.templates.set('descriptive-en', [
      { pattern: '{category} {color} Pattern', baseScore: 0.8, preferredCategories: ['nature', 'emotion'] },
      { pattern: '{color} {category} Collection', baseScore: 0.7, preferredCategories: ['animal', 'food'] },
      { pattern: 'The {emotion} {category}', baseScore: 0.6, preferredCategories: ['emotion'] }
    ]);

    // French templates
    this.templates.set('descriptive-fr', [
      { pattern: 'Motif {category} {color}', baseScore: 0.8, preferredCategories: ['nature', 'emotion'] },
      { pattern: 'Collection {color} {category}', baseScore: 0.7, preferredCategories: ['animal', 'food'] },
      { pattern: 'Le {category} {emotion}', baseScore: 0.6, preferredCategories: ['emotion'] }
    ]);

    // Add more templates for different styles
    this.addPoeticalTemplates();
    this.addFunTemplates();
    this.addMinimalistTemplates();
  }

  private addPoeticalTemplates(): void {
    this.templates.set('poetic-en', [
      { pattern: 'Symphony of {category}', baseScore: 0.7 },
      { pattern: '{color} Dreams', baseScore: 0.6 },
      { pattern: 'Dancing {category}', baseScore: 0.5 }
    ]);

    this.templates.set('poetic-fr', [
      { pattern: 'Symphonie de {category}', baseScore: 0.7 },
      { pattern: 'Rêves {color}', baseScore: 0.6 },
      { pattern: '{category} Dansant', baseScore: 0.5 }
    ]);
  }

  private addFunTemplates(): void {
    this.templates.set('fun-en', [
      { pattern: '{category} Party!', baseScore: 0.6 },
      { pattern: 'Super {color} Mix', baseScore: 0.5 },
      { pattern: '{emotion} Vibes', baseScore: 0.4 }
    ]);

    this.templates.set('fun-fr', [
      { pattern: 'Fête {category}!', baseScore: 0.6 },
      { pattern: 'Super Mix {color}', baseScore: 0.5 },
      { pattern: 'Ambiance {emotion}', baseScore: 0.4 }
    ]);
  }

  private addMinimalistTemplates(): void {
    this.templates.set('minimalist-en', [
      { pattern: '{category}', baseScore: 0.5 },
      { pattern: '{color}', baseScore: 0.4 },
      { pattern: '{emotion}', baseScore: 0.3 }
    ]);

    this.templates.set('minimalist-fr', [
      { pattern: '{category}', baseScore: 0.5 },
      { pattern: '{color}', baseScore: 0.4 },
      { pattern: '{emotion}', baseScore: 0.3 }
    ]);
  }

  private initializeWordBanks(): void {
    this.adjectives = new Map();
    this.nouns = new Map();
    this.connectors = new Map();

    // English word banks
    this.adjectives.set('en', [
      'beautiful', 'elegant', 'vibrant', 'serene', 'dynamic', 'harmonious',
      'delicate', 'bold', 'graceful', 'stunning', 'peaceful', 'energetic'
    ]);

    this.nouns.set('en', [
      'pattern', 'design', 'composition', 'collection', 'arrangement', 'sequence',
      'harmony', 'symphony', 'creation', 'artwork', 'expression', 'story'
    ]);

    // French word banks
    this.adjectives.set('fr', [
      'beau', 'élégant', 'vibrant', 'serein', 'dynamique', 'harmonieux',
      'délicat', 'audacieux', 'gracieux', 'magnifique', 'paisible', 'énergique'
    ]);

    this.nouns.set('fr', [
      'motif', 'design', 'composition', 'collection', 'arrangement', 'séquence',
      'harmonie', 'symphonie', 'création', 'œuvre', 'expression', 'histoire'
    ]);
  }

  private initializePatternRules(): void {
    this.patterns = new Map();
    // Initialize pattern-specific naming rules
  }
}

// Interfaces for type safety
interface SequenceAnalysis {
  dominantCategories: Array<{ key: string; value: number }>;
  dominantEmotions: Array<{ key: EmotionType; value: number }>;
  dominantColors: Array<{ key: ColorFamily; value: number }>;
  themes: string[];
  avgComplexity: number;
  childSafeRatio: number;
  sequenceLength: number;
  uniqueCount: number;
  diversity: number;
}

interface NamingTemplate {
  pattern: string;
  baseScore?: number;
  preferredCategories?: string[];
  minComplexity?: number;
  maxComplexity?: number;
}

interface PatternNameRule {
  condition: (analysis: SequenceAnalysis) => boolean;
  template: string;
  priority: number;
}

// Export singleton instance
export const localNameGenerator = new LocalNameGenerator();