// Pattern generation engine - migrated from Android Kotlin
// Generates concentric square emoji patterns

import { GridCell, PatternState, PatternAccessibilityInfo, PatternMode } from '@/types/pattern';

export class PatternGenerator {
  /**
   * Generates a concentric square pattern from an emoji sequence
   * @param sequence Array of emojis from outer to inner layer
   * @returns 2D grid representing the pattern
   */
  static generateConcentricPattern(sequence: string[]): GridCell[][] {
    if (sequence.length === 0) return [];
    
    const size = (sequence.length * 2) - 1;
    const pattern: GridCell[][] = Array(size).fill(null).map(() => 
      Array(size).fill(null).map(() => ({ 
        emoji: '', 
        row: 0, 
        col: 0, 
        layer: 0, 
        isCenter: false 
      }))
    );
    
    const center = Math.floor(size / 2);
    
    // In concentric patterns: first emoji = center, new emojis = outer layers
    // Each new emoji wraps around all existing emojis as a new outer layer
    sequence.forEach((emoji, index) => {
      // index 0 (first emoji) = center (distance 0)
      // index 1 (second emoji) = outer layer (distance 1) 
      // index 2 (third emoji) = outermost layer (distance 2), etc.
      const distance = index; // Direct mapping: later emojis get larger distance
      this.fillSquareLayer(pattern, center, distance, emoji, index);
    });
    
    return pattern;
  }

  /**
   * Fills a square layer in the pattern
   * @param pattern The pattern grid to modify
   * @param center Center coordinate
   * @param distance Distance from center
   * @param emoji Emoji to place
   * @param layer Layer index
   */
  private static fillSquareLayer(
    pattern: GridCell[][], 
    center: number, 
    distance: number, 
    emoji: string, 
    layer: number
  ): void {
    for (let i = center - distance; i <= center + distance; i++) {
      for (let j = center - distance; j <= center + distance; j++) {
        // Only place emoji on the perimeter of the current layer
        if (i === center - distance || i === center + distance || 
            j === center - distance || j === center + distance) {
          pattern[i][j] = {
            emoji,
            row: i,
            col: j,
            layer,
            isCenter: i === center && j === center
          };
        }
      }
    }
  }

  /**
   * Validates emoji characters in sequence
   * @param sequence Array of emojis to validate
   * @returns True if all are valid emojis
   */
  static validateSequence(sequence: string[]): boolean {
    if (sequence.length === 0) return false;
    if (sequence.length > 10) return false;
    
    return sequence.every(emoji => this.isValidEmoji(emoji));
  }

  /**
   * Checks if a string is a valid emoji
   * @param str String to check
   * @returns True if valid emoji
   */
  static isValidEmoji(str: string): boolean {
    // Simple emoji validation - checks for non-empty string with reasonable length
    // In production, would use a proper emoji validation library
    return str.length > 0 && str.length <= 8 && /\p{Emoji}/u.test(str);
  }

  /**
   * Extracts sequence from existing pattern
   * @param pattern 2D grid pattern
   * @returns Emoji sequence from outer to inner
   */
  static extractSequenceFromPattern(pattern: GridCell[][]): string[] {
    if (pattern.length === 0) return [];
    
    const layers = new Map<number, string>();
    
    pattern.forEach(row => {
      row.forEach(cell => {
        if (cell.emoji && !layers.has(cell.layer)) {
          layers.set(cell.layer, cell.emoji);
        }
      });
    });
    
    // Sort by layer index (outer to inner)
    return Array.from(layers.entries())
      .sort(([a], [b]) => b - a) // Reverse order for outer-to-inner
      .map(([, emoji]) => emoji);
  }

  /**
   * Generates accessibility information for a pattern
   * @param pattern 2D grid pattern
   * @returns Accessibility description object
   */
  static generatePatternAltText(pattern: GridCell[][]): PatternAccessibilityInfo {
    const sequence = this.extractSequenceFromPattern(pattern);
    const size = pattern.length;
    
    if (sequence.length === 0) {
      return {
        altText: 'Empty pattern canvas',
        description: 'An empty pattern canvas ready for emoji placement',
        sequenceDescription: 'No emojis in sequence',
        spatialDescription: 'Empty grid layout'
      };
    }
    
    return {
      altText: `Emoji pattern: ${sequence.join(' ')} arranged in ${size}×${size} concentric squares`,
      description: `A ${size} by ${size} grid pattern with emojis arranged in concentric squares. The outermost layer contains ${sequence[0]}, working inward to the center with ${sequence[sequence.length - 1]}.`,
      sequenceDescription: `Emoji sequence from outside to center: ${sequence.map((emoji, i) => `${i + 1}. ${emoji}`).join(', ')}`,
      spatialDescription: `Grid layout: ${size} rows by ${size} columns, symmetrical pattern radiating from center`
    };
  }

  /**
   * Calculates pattern complexity score
   * @param sequence Emoji sequence
   * @returns Complexity level
   */
  static calculateComplexity(sequence: string[]): 'simple' | 'moderate' | 'complex' {
    if (sequence.length <= 2) return 'simple';
    if (sequence.length <= 5) return 'moderate';
    return 'complex';
  }

  /**
   * Gets the dimensions for a pattern based on sequence length
   * @param sequenceLength Number of emojis in sequence
   * @returns Pattern dimensions
   */
  static getPatternDimensions(sequenceLength: number): { size: number; cellSize: number } {
    const size = (sequenceLength * 2) - 1;
    
    // Adjust cell size based on pattern size for optimal visibility
    let cellSize = 40; // Base cell size in pixels
    if (size > 7) cellSize = 32;
    if (size > 11) cellSize = 24;
    if (size > 15) cellSize = 20;
    
    return { size, cellSize };
  }

  /**
   * Creates a pattern state from sequence
   * @param sequence Emoji sequence
   * @param mode Pattern mode
   * @returns Complete pattern state
   */
  static createPatternState(
    sequence: string[], 
    mode: PatternMode = PatternMode.CONCENTRIC
  ): PatternState {
    const { size } = this.getPatternDimensions(sequence.length);
    
    return {
      sequence: [...sequence], // Create copy
      insertionIndex: sequence.length, // Always at end for concentric mode
      patternSize: size,
      patternMode: mode,
      activeInsertionMode: mode,
      createdAt: new Date(),
      isFavorite: false,
      tags: [],
      metadata: {
        aiGenerated: false,
        complexity: this.calculateComplexity(sequence),
        language: 'en',
        userLevel: 1
      }
    };
  }
}