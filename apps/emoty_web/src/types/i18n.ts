/**
 * Internationalization types and interfaces
 */

export type SupportedLanguage = 'en' | 'fr' | 'es' | 'de' | 'it' | 'pt' | 'ja' | 'ko' | 'zh' | 'ar' | 'he' | 'hi' | 'ru';

export type LanguageDirection = 'ltr' | 'rtl';

export interface LanguageInfo {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  direction: LanguageDirection;
  region: string;
  flag: string;
  dateFormat: string;
  numberFormat: Intl.NumberFormatOptions;
  pluralRules: (count: number) => 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';
}

export interface TranslationNamespace {
  common: CommonTranslations;
  navigation: NavigationTranslations;
  patterns: PatternTranslations;
  ai: AITranslations;
  voice: VoiceTranslations;
  accessibility: AccessibilityTranslations;
  export: ExportTranslations;
  sharing: SharingTranslations;
  errors: ErrorTranslations;
  validation: ValidationTranslations;
}

export interface CommonTranslations {
  // General UI
  loading: string;
  save: string;
  cancel: string;
  delete: string;
  edit: string;
  create: string;
  update: string;
  confirm: string;
  yes: string;
  no: string;
  close: string;
  back: string;
  next: string;
  previous: string;

  // Time and dates
  today: string;
  yesterday: string;
  tomorrow: string;
  now: string;

  // Actions
  search: string;
  filter: string;
  sort: string;
  download: string;
  upload: string;
  share: string;
  copy: string;
  paste: string;
  clear: string;
  reset: string;
  refresh: string;
}

export interface NavigationTranslations {
  home: string;
  patterns: string;
  create: string;
  library: string;
  collections: string;
  settings: string;
  profile: string;
  help: string;
  about: string;
  dashboard: string;
  achievements: string;
}

export interface PatternTranslations {
  // Pattern creation
  createPattern: string;
  newPattern: string;
  editPattern: string;
  patternName: string;
  patternDescription: string;
  patternSize: string;
  patternDifficulty: string;
  patternTags: string;

  // Pattern properties
  theme: string;
  mood: string;
  colors: string;
  complexity: string;
  estimatedTime: string;

  // Pattern actions
  savePattern: string;
  sharePattern: string;
  duplicatePattern: string;
  deletePattern: string;
  favoritePattern: string;
  unfavoritePattern: string;

  // Pattern status
  public: string;
  private: string;
  shared: string;
  draft: string;
  published: string;

  // Themes
  themes: {
    nature: string;
    emotions: string;
    food: string;
    travel: string;
    animals: string;
    abstract: string;
    seasonal: string;
    celebration: string;
    tech: string;
    sports: string;
  };

  // Moods
  moods: {
    happy: string;
    calm: string;
    energetic: string;
    romantic: string;
    mysterious: string;
    playful: string;
    elegant: string;
    bold: string;
    peaceful: string;
  };

  // Difficulties
  difficulties: {
    beginner: string;
    intermediate: string;
    advanced: string;
    expert: string;
  };
}

export interface AITranslations {
  // AI generation
  generatePattern: string;
  aiSuggestion: string;
  aiGenerated: string;
  generateWithAI: string;
  customPrompt: string;

  // AI features
  smartSuggestions: string;
  patternAnalysis: string;
  improvementTips: string;
  similarPatterns: string;

  // AI status
  aiThinking: string;
  aiProcessing: string;
  aiError: string;
  aiUnavailable: string;
  aiFallback: string;

  // AI settings
  aiPreferences: string;
  aiLanguage: string;
  aiCreativity: string;
  aiComplexity: string;
}

export interface VoiceTranslations {
  // Voice controls
  voiceCommands: string;
  startListening: string;
  stopListening: string;
  voiceSettings: string;

  // Voice feedback
  listeningOn: string;
  listeningOff: string;
  commandRecognized: string;
  commandNotRecognized: string;

  // Voice help
  voiceHelp: string;
  availableCommands: string;
  exampleCommands: string;

  // Voice commands descriptions
  commands: {
    generatePattern: string;
    savePattern: string;
    clearCanvas: string;
    changeTheme: string;
    changeMood: string;
    changeSize: string;
    undo: string;
    redo: string;
    help: string;
  };
}

export interface AccessibilityTranslations {
  // General accessibility
  accessibility: string;
  accessibilitySettings: string;
  screenReader: string;
  keyboardNavigation: string;

  // Visual accessibility
  highContrast: string;
  largeText: string;
  reducedMotion: string;
  colorBlindness: string;

  // Motor accessibility
  touchTargets: string;
  gestureAlternatives: string;
  voiceControl: string;

  // Audio accessibility
  audioFeedback: string;
  hapticFeedback: string;
  visualIndicators: string;

  // Accessibility announcements
  announcements: {
    patternCreated: string;
    patternSaved: string;
    patternDeleted: string;
    cellSelected: string;
    modeChanged: string;
    pageLoaded: string;
    errorOccurred: string;
    actionCompleted: string;
  };
}

export interface ExportTranslations {
  // Export options
  export: string;
  exportPattern: string;
  exportCollection: string;
  exportFormat: string;

  // Export formats
  formats: {
    pdf: string;
    png: string;
    jpg: string;
    svg: string;
    json: string;
    csv: string;
    txt: string;
  };

  // Export settings
  exportSettings: string;
  resolution: string;
  quality: string;
  includeMetadata: string;
  includeTimestamp: string;

  // Export status
  preparing: string;
  generating: string;
  downloading: string;
  completed: string;
  failed: string;
}

export interface SharingTranslations {
  // Sharing options
  share: string;
  sharePattern: string;
  shareCollection: string;
  shareLink: string;

  // Sharing platforms
  platforms: {
    email: string;
    socialMedia: string;
    directLink: string;
    qrCode: string;
    embed: string;
  };

  // Privacy settings
  privacySettings: string;
  publicShare: string;
  privateShare: string;
  linkExpiration: string;
  passwordProtected: string;

  // Sharing status
  linkCopied: string;
  sharePreparing: string;
  shareReady: string;
  shareError: string;
}

export interface ErrorTranslations {
  // General errors
  error: string;
  unknownError: string;
  networkError: string;
  serverError: string;

  // Specific errors
  patternNotFound: string;
  patternSaveError: string;
  patternLoadError: string;
  invalidPattern: string;

  // Permission errors
  permissionDenied: string;
  unauthorized: string;
  accessRestricted: string;

  // Validation errors
  required: string;
  invalid: string;
  tooShort: string;
  tooLong: string;
  invalidFormat: string;
}

export interface ValidationTranslations {
  // Field validation
  fieldRequired: (field: string) => string;
  fieldTooShort: (field: string, min: number) => string;
  fieldTooLong: (field: string, max: number) => string;
  fieldInvalid: (field: string) => string;

  // Pattern validation
  patternEmpty: string;
  patternTooSmall: string;
  patternTooLarge: string;
  patternInvalid: string;

  // User input validation
  emailInvalid: string;
  passwordWeak: string;
  nameInvalid: string;
}

export interface I18nContext {
  language: SupportedLanguage;
  direction: LanguageDirection;
  t: TranslationFunction;
  setLanguage: (language: SupportedLanguage) => void;
  supportedLanguages: LanguageInfo[];
  formatDate: (date: Date) => string;
  formatNumber: (number: number) => string;
  formatCurrency: (amount: number, currency: string) => string;
  formatRelativeTime: (date: Date) => string;
}

export type TranslationFunction = {
  (key: keyof TranslationNamespace): any;
  <T extends keyof TranslationNamespace>(namespace: T, key: keyof TranslationNamespace[T]): any;
  (key: string, params?: Record<string, any>): string;
};

export interface CulturalAdaptation {
  emojiMapping: Record<string, string>;
  colorPreferences: Record<string, string[]>;
  patternStyles: Record<string, any>;
  dateFormats: Record<string, string>;
  numberFormats: Intl.NumberFormatOptions;
  currencyFormats: Intl.NumberFormatOptions;
  textDirections: Record<string, LanguageDirection>;
  fontPreferences: string[];
}

export interface LocalizationPreferences {
  language: SupportedLanguage;
  region: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  numberFormat: 'decimal' | 'scientific' | 'engineering';
  currency: string;
  measurements: 'metric' | 'imperial';
  calendar: 'gregorian' | 'lunar' | 'solar';
}