/**
 * AI service type definitions
 */

export type UserLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type Language = 'en' | 'fr';
export type PatternTheme = 
  | 'nature' 
  | 'emotions' 
  | 'food' 
  | 'travel' 
  | 'animals' 
  | 'abstract' 
  | 'seasonal'
  | 'celebration'
  | 'tech'
  | 'sports';

export type PatternMood = 
  | 'happy' 
  | 'calm' 
  | 'energetic' 
  | 'romantic' 
  | 'mysterious' 
  | 'playful'
  | 'elegant'
  | 'bold'
  | 'peaceful';

export interface PatternGenerationRequest {
  userId: string;
  userLevel: UserLevel;
  language: Language;
  theme?: PatternTheme;
  mood?: PatternMood;
  colors?: string[];
  size?: number;
  customPrompt?: string;
  maxPatterns?: number;
  avoidEmojis?: string[]; // Emojis to exclude
  includeEmojis?: string[]; // Emojis that must be included
}

export interface GeneratedPattern {
  name: string;
  sequence: string[];
  description: string;
  difficulty: UserLevel;
  tags: string[];
  metadata: {
    aiGenerated: boolean;
    generatedBy?: 'claude' | 'local';
    fallback?: boolean;
    reason?: string;
    prompt?: string;
    confidence?: number; // 0-100
  };
}

export interface AIUsageStats {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost?: number; // In cents
}

export interface AIResponse {
  success: boolean;
  patterns?: GeneratedPattern[];
  fallback?: GeneratedPattern[];
  error?: string;
  usage?: AIUsageStats;
  model?: string;
  generatedAt: Date;
  rateLimited?: boolean;
  nextRetryAt?: Date;
}

export interface VoiceCommand {
  command: string;
  parameters?: Record<string, any>;
  confidence: number;
  language: Language;
  timestamp: Date;
}

export interface VoiceCommandConfig {
  language: Language;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  grammars?: SpeechGrammarList;
}

export interface EmotyBotMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  patterns?: GeneratedPattern[];
  voiceCommand?: boolean;
  language: Language;
  metadata?: {
    tokens?: number;
    confidence?: number;
    processingTime?: number;
  };
}

export interface EmotyBotSession {
  id: string;
  userId: string;
  messages: EmotyBotMessage[];
  startedAt: Date;
  lastActivity: Date;
  language: Language;
  context: {
    userLevel: UserLevel;
    preferences: {
      themes: PatternTheme[];
      moods: PatternMood[];
      avoidEmojis: string[];
      favoriteColors: string[];
    };
    stats: {
      messagesCount: number;
      patternsGenerated: number;
      tokensUsed: number;
    };
  };
}

// Voice command types
export type VoiceCommandType = 
  | 'generate_pattern'
  | 'change_theme'
  | 'change_mood'
  | 'change_size'
  | 'save_pattern'
  | 'export_pattern'
  | 'help'
  | 'stop_listening'
  | 'clear_canvas'
  | 'undo'
  | 'redo';

export interface ParsedVoiceCommand {
  type: VoiceCommandType;
  parameters: {
    theme?: PatternTheme;
    mood?: PatternMood;
    size?: number;
    colors?: string[];
    customText?: string;
    patternName?: string;
    format?: string;
  };
  confidence: number;
  rawText: string;
}

// AI service configuration
export interface AIServiceConfig {
  provider: 'anthropic' | 'openai' | 'local';
  model: string;
  maxTokens: number;
  temperature: number;
  rateLimits: {
    requestsPerMinute: number;
    tokensPerDay: number;
  };
  fallbackEnabled: boolean;
  retryAttempts: number;
  timeoutMs: number;
}

// Localization types
export interface AILocalizedStrings {
  en: {
    greeting: string;
    help: string;
    patternGenerated: string;
    error: string;
    rateLimited: string;
    voiceNotSupported: string;
    listeningStarted: string;
    listeningStopped: string;
    commandNotRecognized: string;
  };
  fr: {
    greeting: string;
    help: string;
    patternGenerated: string;
    error: string;
    rateLimited: string;
    voiceNotSupported: string;
    listeningStarted: string;
    listeningStopped: string;
    commandNotRecognized: string;
  };
}

// Error types
export class AIServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public retryable: boolean = false,
    public rateLimited: boolean = false
  ) {
    super(message);
    this.name = 'AIServiceError';
  }
}

export class VoiceCommandError extends Error {
  constructor(
    message: string,
    public code: 'NOT_SUPPORTED' | 'PERMISSION_DENIED' | 'RECOGNITION_ERROR',
    public details?: any
  ) {
    super(message);
    this.name = 'VoiceCommandError';
  }
}