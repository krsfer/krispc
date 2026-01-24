// Core pattern types for the Emoty web application
// Based on Android Kotlin data classes migrated to TypeScript

export interface GridCell {
  emoji: string;
  row: number;
  col: number;
  layer: number;
  isCenter: boolean;
}

export interface PatternState {
  id?: string;
  sequence: string[];
  insertionIndex: number;
  patternSize: number;
  patternMode: PatternMode;
  activeInsertionMode: PatternMode;
  name?: string;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
  isFavorite?: boolean;
  tags?: string[];
  metadata?: PatternMetadata;
}

export interface EmojiPalette {
  id: string;
  name: LocalizedString;
  category: PaletteCategory;
  emojis: string[];
  orderIndex: number;
  isCustom: boolean;
  description?: LocalizedString;
  tags?: string[];
}

export interface LocalizedString {
  en: string;
  fr: string;
  [locale: string]: string;
}

export enum PatternMode {
  CONCENTRIC = 'concentric',
  SEQUENTIAL = 'sequential'
}

export enum PaletteCategory {
  COLOR = 'color',
  MONOCHROME = 'monochrome', 
  CUSTOM = 'custom'
}

export interface PatternMetadata {
  aiGenerated: boolean;
  sourcePrompt?: string;
  rationale?: string;
  complexity: 'simple' | 'moderate' | 'complex';
  language: 'en' | 'fr';
  userLevel: number;
  renderTime?: number;
  canvasSize?: { width: number; height: number };
}

// Validation types
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  suggestions?: string[];
}

export interface ValidationRule {
  validate: (value: any) => { isValid: boolean; message: string };
}

// Accessibility types
export interface PatternAccessibilityInfo {
  altText: string;
  description: string;
  sequenceDescription: string;
  spatialDescription: string;
}

// API response types
export interface PatternResponse {
  patterns: Array<{
    sequence: string[];
    rationale: string;
    confidence: number;
    name: string;
    tags: string[];
  }>;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// Voice command types
export interface VoiceCommand {
  intent: string;
  parameters: Record<string, any>;
  confidence: number;
  language: 'en' | 'fr';
}

// Pattern filters and search types for Phase 2 implementation
export interface PatternFilters {
  searchQuery?: string;
  tags?: string[];
  isFavorite?: boolean;
  isAiGenerated?: boolean;
  difficultyRange?: [number, number]; // min, max
  sortBy?: 'created_at' | 'updated_at' | 'name' | 'difficulty' | 'likes' | 'views';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationOptions {
  page: number;
  limit: number;
  offset?: number;
}

// Export format types
export type ExportFormat = 'text' | 'png' | 'pdf' | 'json' | 'share-code';

export interface ExportOption {
  id: ExportFormat;
  label: string;
  icon: string;
  level: number;
  description: string;
}

// ============================================================================
// Pattern CRUD API Types
// ============================================================================

/**
 * Saved pattern from database
 * Note: Thumbnails rendered client-side from sequence
 */
export interface SavedPattern {
  id: string;
  userId: string;
  name: string;
  sequence: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Pattern list API response
 */
export interface PatternListResponse {
  patterns: SavedPattern[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Create pattern request body
 */
export interface CreatePatternRequest {
  name?: string;
  sequence: string[]; // required
}

/**
 * Update pattern request body
 */
export interface UpdatePatternRequest {
  name?: string;
  sequence?: string[]; // optional
}

/**
 * Pattern API error response
 */
export interface PatternErrorResponse {
  error: string;
}