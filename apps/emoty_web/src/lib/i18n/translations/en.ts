/**
 * English translations
 */
import type { TranslationNamespace } from '@/types/i18n';

export const en: TranslationNamespace = {
  common: {
    // General UI
    loading: 'Loading...',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    create: 'Create',
    update: 'Update',
    confirm: 'Confirm',
    yes: 'Yes',
    no: 'No',
    close: 'Close',
    back: 'Back',
    next: 'Next',
    previous: 'Previous',
    
    // Time and dates
    today: 'Today',
    yesterday: 'Yesterday',
    tomorrow: 'Tomorrow',
    now: 'Now',
    
    // Actions
    search: 'Search',
    filter: 'Filter',
    sort: 'Sort',
    download: 'Download',
    upload: 'Upload',
    share: 'Share',
    copy: 'Copy',
    paste: 'Paste',
    clear: 'Clear',
    reset: 'Reset',
    refresh: 'Refresh'
  },
  
  navigation: {
    home: 'Home',
    patterns: 'Patterns',
    create: 'Create',
    library: 'Library',
    collections: 'Collections',
    settings: 'Settings',
    profile: 'Profile',
    help: 'Help',
    about: 'About',
    dashboard: 'Dashboard',
    achievements: 'Achievements'
  },
  
  patterns: {
    // Pattern creation
    createPattern: 'Create Pattern',
    newPattern: 'New Pattern',
    editPattern: 'Edit Pattern',
    patternName: 'Pattern Name',
    patternDescription: 'Pattern Description',
    patternSize: 'Pattern Size',
    patternDifficulty: 'Difficulty',
    patternTags: 'Tags',
    
    // Pattern properties
    theme: 'Theme',
    mood: 'Mood',
    colors: 'Colors',
    complexity: 'Complexity',
    estimatedTime: 'Estimated Time',
    
    // Pattern actions
    savePattern: 'Save Pattern',
    sharePattern: 'Share Pattern',
    duplicatePattern: 'Duplicate Pattern',
    deletePattern: 'Delete Pattern',
    favoritePattern: 'Add to Favorites',
    unfavoritePattern: 'Remove from Favorites',
    
    // Pattern status
    public: 'Public',
    private: 'Private',
    shared: 'Shared',
    draft: 'Draft',
    published: 'Published',
    
    // Themes
    themes: {
      nature: 'Nature',
      emotions: 'Emotions',
      food: 'Food',
      travel: 'Travel',
      animals: 'Animals',
      abstract: 'Abstract',
      seasonal: 'Seasonal',
      celebration: 'Celebration',
      tech: 'Technology',
      sports: 'Sports'
    },
    
    // Moods
    moods: {
      happy: 'Happy',
      calm: 'Calm',
      energetic: 'Energetic',
      romantic: 'Romantic',
      mysterious: 'Mysterious',
      playful: 'Playful',
      elegant: 'Elegant',
      bold: 'Bold',
      peaceful: 'Peaceful'
    },
    
    // Difficulties
    difficulties: {
      beginner: 'Beginner',
      intermediate: 'Intermediate',
      advanced: 'Advanced',
      expert: 'Expert'
    }
  },
  
  ai: {
    // AI generation
    generatePattern: 'Generate Pattern',
    aiSuggestion: 'AI Suggestion',
    aiGenerated: 'AI Generated',
    generateWithAI: 'Generate with AI',
    customPrompt: 'Custom Prompt',
    
    // AI features
    smartSuggestions: 'Smart Suggestions',
    patternAnalysis: 'Pattern Analysis',
    improvementTips: 'Improvement Tips',
    similarPatterns: 'Similar Patterns',
    
    // AI status
    aiThinking: 'AI is thinking...',
    aiProcessing: 'AI is processing your request...',
    aiError: 'AI service temporarily unavailable',
    aiUnavailable: 'AI features are currently unavailable',
    aiFallback: 'Using local generation instead',
    
    // AI settings
    aiPreferences: 'AI Preferences',
    aiLanguage: 'AI Language',
    aiCreativity: 'Creativity Level',
    aiComplexity: 'Complexity Preference'
  },
  
  voice: {
    // Voice controls
    voiceCommands: 'Voice Commands',
    startListening: 'Start Voice Commands',
    stopListening: 'Stop Voice Commands',
    voiceSettings: 'Voice Settings',
    
    // Voice feedback
    listeningOn: 'Voice commands active',
    listeningOff: 'Voice commands disabled',
    commandRecognized: 'Command recognized',
    commandNotRecognized: 'Command not recognized',
    
    // Voice help
    voiceHelp: 'Voice Help',
    availableCommands: 'Available Commands',
    exampleCommands: 'Example Commands',
    
    // Voice commands descriptions
    commands: {
      generatePattern: 'Say "generate pattern" to create a new pattern',
      savePattern: 'Say "save pattern" to save your current work',
      clearCanvas: 'Say "clear canvas" to start over',
      changeTheme: 'Say "change theme to [theme]" to switch themes',
      changeMood: 'Say "change mood to [mood]" to set the mood',
      changeSize: 'Say "set size [number]" to change pattern size',
      undo: 'Say "undo" to undo the last action',
      redo: 'Say "redo" to redo the last undone action',
      help: 'Say "help" to hear available commands'
    }
  },
  
  accessibility: {
    // General accessibility
    accessibility: 'Accessibility',
    accessibilitySettings: 'Accessibility Settings',
    screenReader: 'Screen Reader',
    keyboardNavigation: 'Keyboard Navigation',
    
    // Visual accessibility
    highContrast: 'High Contrast',
    largeText: 'Large Text',
    reducedMotion: 'Reduced Motion',
    colorBlindness: 'Color Blindness Support',
    
    // Motor accessibility
    touchTargets: 'Large Touch Targets',
    gestureAlternatives: 'Gesture Alternatives',
    voiceControl: 'Voice Control',
    
    // Audio accessibility
    audioFeedback: 'Audio Feedback',
    hapticFeedback: 'Haptic Feedback',
    visualIndicators: 'Visual Indicators',
    
    // Accessibility announcements
    announcements: {
      patternCreated: 'Pattern created successfully',
      patternSaved: 'Pattern saved to your library',
      patternDeleted: 'Pattern deleted',
      cellSelected: 'Cell selected',
      modeChanged: 'Mode changed',
      pageLoaded: 'Page loaded',
      errorOccurred: 'An error occurred',
      actionCompleted: 'Action completed'
    }
  },
  
  export: {
    // Export options
    export: 'Export',
    exportPattern: 'Export Pattern',
    exportCollection: 'Export Collection',
    exportFormat: 'Export Format',
    
    // Export formats
    formats: {
      pdf: 'PDF Document',
      png: 'PNG Image',
      jpg: 'JPEG Image',
      svg: 'SVG Vector',
      json: 'JSON Data',
      csv: 'CSV Spreadsheet',
      txt: 'Text File'
    },
    
    // Export settings
    exportSettings: 'Export Settings',
    resolution: 'Resolution',
    quality: 'Quality',
    includeMetadata: 'Include Metadata',
    includeTimestamp: 'Include Timestamp',
    
    // Export status
    preparing: 'Preparing export...',
    generating: 'Generating file...',
    downloading: 'Downloading...',
    completed: 'Export completed',
    failed: 'Export failed'
  },
  
  sharing: {
    // Sharing options
    share: 'Share',
    sharePattern: 'Share Pattern',
    shareCollection: 'Share Collection',
    shareLink: 'Share Link',
    
    // Sharing platforms
    platforms: {
      email: 'Email',
      socialMedia: 'Social Media',
      directLink: 'Direct Link',
      qrCode: 'QR Code',
      embed: 'Embed Code'
    },
    
    // Privacy settings
    privacySettings: 'Privacy Settings',
    publicShare: 'Public Share',
    privateShare: 'Private Share',
    linkExpiration: 'Link Expiration',
    passwordProtected: 'Password Protected',
    
    // Sharing status
    linkCopied: 'Link copied to clipboard',
    sharePreparing: 'Preparing share...',
    shareReady: 'Share link ready',
    shareError: 'Failed to create share link'
  },
  
  errors: {
    // General errors
    error: 'Error',
    unknownError: 'An unknown error occurred',
    networkError: 'Network connection error',
    serverError: 'Server error occurred',
    
    // Specific errors
    patternNotFound: 'Pattern not found',
    patternSaveError: 'Failed to save pattern',
    patternLoadError: 'Failed to load pattern',
    invalidPattern: 'Invalid pattern data',
    
    // Permission errors
    permissionDenied: 'Permission denied',
    unauthorized: 'Unauthorized access',
    accessRestricted: 'Access restricted',
    
    // Validation errors
    required: 'This field is required',
    invalid: 'Invalid input',
    tooShort: 'Input is too short',
    tooLong: 'Input is too long',
    invalidFormat: 'Invalid format'
  },
  
  validation: {
    // Field validation
    fieldRequired: (field: string) => `${field} is required`,
    fieldTooShort: (field: string, min: number) => `${field} must be at least ${min} characters`,
    fieldTooLong: (field: string, max: number) => `${field} must be no more than ${max} characters`,
    fieldInvalid: (field: string) => `${field} is invalid`,
    
    // Pattern validation
    patternEmpty: 'Pattern cannot be empty',
    patternTooSmall: 'Pattern is too small',
    patternTooLarge: 'Pattern is too large',
    patternInvalid: 'Pattern data is invalid',
    
    // User input validation
    emailInvalid: 'Please enter a valid email address',
    passwordWeak: 'Password is too weak',
    nameInvalid: 'Please enter a valid name'
  }
};