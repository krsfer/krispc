/**
 * Voice command system using Web Speech API with multilingual support
 */
import type { 
  VoiceCommand, 
  VoiceCommandConfig, 
  ParsedVoiceCommand, 
  VoiceCommandType,
  PatternTheme,
  PatternMood,
  Language,
  VoiceCommandError 
} from '@/types/ai';

interface VoiceCommandPattern {
  pattern: RegExp;
  type: VoiceCommandType;
  extractParams: (match: RegExpMatchArray, language: Language) => any;
}

export class VoiceCommandService {
  private recognition: SpeechRecognition | null = null;
  private isListening = false;
  private language: Language = 'en';
  private listeners: Set<(command: ParsedVoiceCommand) => void> = new Set();
  private errorListeners: Set<(error: VoiceCommandError) => void> = new Set();
  private statusListeners: Set<(isListening: boolean) => void> = new Set();
  
  // Command patterns for English and French
  private commandPatterns: Record<Language, VoiceCommandPattern[]> = {
    en: [
      {
        pattern: /generate\s+(?:a\s+)?pattern\s*(?:with\s+(.+))?/i,
        type: 'generate_pattern',
        extractParams: (match) => ({ customText: match[1]?.trim() })
      },
      {
        pattern: /(?:create|make)\s+(?:a\s+)?(.+)\s+pattern/i,
        type: 'generate_pattern',
        extractParams: (match) => ({ theme: this.extractTheme(match[1], 'en') })
      },
      {
        pattern: /change\s+(?:the\s+)?theme\s+to\s+(.+)/i,
        type: 'change_theme',
        extractParams: (match) => ({ theme: this.extractTheme(match[1], 'en') })
      },
      {
        pattern: /(?:set|change)\s+(?:the\s+)?mood\s+to\s+(.+)/i,
        type: 'change_mood',
        extractParams: (match) => ({ mood: this.extractMood(match[1], 'en') })
      },
      {
        pattern: /(?:make|set)\s+(?:it|the\s+pattern)\s+size\s+(\d+)/i,
        type: 'change_size',
        extractParams: (match) => ({ size: parseInt(match[1]) })
      },
      {
        pattern: /save\s+(?:this\s+)?pattern(?:\s+as\s+(.+))?/i,
        type: 'save_pattern',
        extractParams: (match) => ({ patternName: match[1]?.trim() })
      },
      {
        pattern: /export\s+(?:this\s+)?pattern(?:\s+as\s+(.+))?/i,
        type: 'export_pattern',
        extractParams: (match) => ({ format: match[1]?.trim() })
      },
      {
        pattern: /(?:help|what\s+can\s+(?:i|you)\s+do)/i,
        type: 'help',
        extractParams: () => ({})
      },
      {
        pattern: /stop\s+listening/i,
        type: 'stop_listening',
        extractParams: () => ({})
      },
      {
        pattern: /(?:clear|reset)\s+(?:the\s+)?canvas/i,
        type: 'clear_canvas',
        extractParams: () => ({})
      },
      {
        pattern: /undo/i,
        type: 'undo',
        extractParams: () => ({})
      },
      {
        pattern: /redo/i,
        type: 'redo',
        extractParams: () => ({})
      }
    ],
    fr: [
      {
        pattern: /(?:générer?|créer)\s+(?:un\s+)?motif\s*(?:avec\s+(.+))?/i,
        type: 'generate_pattern',
        extractParams: (match) => ({ customText: match[1]?.trim() })
      },
      {
        pattern: /(?:créer?|faire)\s+un\s+motif\s+(.+)/i,
        type: 'generate_pattern',
        extractParams: (match) => ({ theme: this.extractTheme(match[1], 'fr') })
      },
      {
        pattern: /changer\s+(?:le\s+)?thème\s+(?:à|pour)\s+(.+)/i,
        type: 'change_theme',
        extractParams: (match) => ({ theme: this.extractTheme(match[1], 'fr') })
      },
      {
        pattern: /(?:définir|changer)\s+(?:l'|la\s+)?humeur\s+(?:à|pour)\s+(.+)/i,
        type: 'change_mood',
        extractParams: (match) => ({ mood: this.extractMood(match[1], 'fr') })
      },
      {
        pattern: /(?:définir|mettre)\s+(?:la\s+)?taille\s+(?:à|de)\s+(\d+)/i,
        type: 'change_size',
        extractParams: (match) => ({ size: parseInt(match[1]) })
      },
      {
        pattern: /sauvegarder\s+(?:ce\s+)?motif(?:\s+comme\s+(.+))?/i,
        type: 'save_pattern',
        extractParams: (match) => ({ patternName: match[1]?.trim() })
      },
      {
        pattern: /exporter\s+(?:ce\s+)?motif(?:\s+en\s+(.+))?/i,
        type: 'export_pattern',
        extractParams: (match) => ({ format: match[1]?.trim() })
      },
      {
        pattern: /(?:aide|qu'est-ce\s+que\s+(?:je\s+peux|tu\s+peux)\s+faire)/i,
        type: 'help',
        extractParams: () => ({})
      },
      {
        pattern: /(?:arrêter?\s+d'écouter|stop)/i,
        type: 'stop_listening',
        extractParams: () => ({})
      },
      {
        pattern: /(?:effacer|vider)\s+(?:le\s+)?canvas/i,
        type: 'clear_canvas',
        extractParams: () => ({})
      },
      {
        pattern: /annuler/i,
        type: 'undo',
        extractParams: () => ({})
      },
      {
        pattern: /rétablir/i,
        type: 'redo',
        extractParams: () => ({})
      }
    ]
  };

  constructor() {
    this.initializeSpeechRecognition();
  }

  /**
   * Initialize speech recognition if supported
   */
  private initializeSpeechRecognition(): void {
    if (!this.isSpeechRecognitionSupported()) {
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.maxAlternatives = 3;
    
    this.setupRecognitionEvents();
  }

  /**
   * Setup speech recognition event handlers
   */
  private setupRecognitionEvents(): void {
    if (!this.recognition) return;

    this.recognition.onresult = (event) => {
      const result = event.results[event.results.length - 1];
      const transcript = result[0].transcript.trim();
      const confidence = result[0].confidence;

      try {
        const command = this.parseCommand(transcript, confidence);
        this.notifyListeners(command);
      } catch (error) {
        this.notifyErrorListeners(new VoiceCommandError(
          `Failed to parse command: "${transcript}"`,
          'RECOGNITION_ERROR',
          { transcript, confidence }
        ));
      }
    };

    this.recognition.onerror = (event) => {
      let errorCode: 'NOT_SUPPORTED' | 'PERMISSION_DENIED' | 'RECOGNITION_ERROR';
      
      switch (event.error) {
        case 'not-allowed':
          errorCode = 'PERMISSION_DENIED';
          break;
        case 'service-not-allowed':
          errorCode = 'NOT_SUPPORTED';
          break;
        default:
          errorCode = 'RECOGNITION_ERROR';
      }

      this.notifyErrorListeners(new VoiceCommandError(
        `Speech recognition error: ${event.error}`,
        errorCode,
        { originalError: event.error }
      ));

      this.stopListening();
    };

    this.recognition.onstart = () => {
      this.isListening = true;
      this.notifyStatusListeners(true);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.notifyStatusListeners(false);
    };
  }

  /**
   * Check if speech recognition is supported
   */
  isSpeechRecognitionSupported(): boolean {
    return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
  }

  /**
   * Start listening for voice commands
   */
  startListening(config?: Partial<VoiceCommandConfig>): void {
    if (!this.recognition) {
      throw new VoiceCommandError('Speech recognition not supported', 'NOT_SUPPORTED');
    }

    if (this.isListening) {
      return;
    }

    if (config) {
      this.applyConfig(config);
    }

    try {
      this.recognition.lang = this.language === 'fr' ? 'fr-FR' : 'en-US';
      this.recognition.start();
    } catch (error) {
      throw new VoiceCommandError('Failed to start speech recognition', 'RECOGNITION_ERROR', error);
    }
  }

  /**
   * Stop listening for voice commands
   */
  stopListening(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
  }

  /**
   * Set language for voice recognition
   */
  setLanguage(language: Language): void {
    this.language = language;
    
    if (this.recognition) {
      this.recognition.lang = language === 'fr' ? 'fr-FR' : 'en-US';
    }
  }

  /**
   * Parse voice command transcript
   */
  private parseCommand(transcript: string, confidence: number): ParsedVoiceCommand {
    const patterns = this.commandPatterns[this.language];
    
    for (const pattern of patterns) {
      const match = transcript.match(pattern.pattern);
      if (match) {
        return {
          type: pattern.type,
          parameters: pattern.extractParams(match, this.language),
          confidence,
          rawText: transcript
        };
      }
    }

    throw new Error(`No matching command pattern found for: "${transcript}"`);
  }

  /**
   * Extract theme from text
   */
  private extractTheme(text: string, language: Language): PatternTheme | undefined {
    const normalizedText = text.toLowerCase().trim();
    
    const themeMap: Record<Language, Record<string, PatternTheme>> = {
      en: {
        nature: 'nature',
        natural: 'nature',
        forest: 'nature',
        ocean: 'nature',
        emotion: 'emotions',
        emotional: 'emotions',
        feeling: 'emotions',
        feelings: 'emotions',
        food: 'food',
        eat: 'food',
        eating: 'food',
        travel: 'travel',
        trip: 'travel',
        vacation: 'travel',
        animal: 'animals',
        animals: 'animals',
        pet: 'animals',
        pets: 'animals',
        abstract: 'abstract',
        geometric: 'abstract',
        shapes: 'abstract',
        seasonal: 'seasonal',
        season: 'seasonal',
        winter: 'seasonal',
        summer: 'seasonal',
        celebration: 'celebration',
        party: 'celebration',
        birthday: 'celebration',
        tech: 'tech',
        technology: 'tech',
        computer: 'tech',
        sports: 'sports',
        sport: 'sports',
        game: 'sports'
      },
      fr: {
        nature: 'nature',
        naturel: 'nature',
        naturelle: 'nature',
        forêt: 'nature',
        océan: 'nature',
        émotion: 'emotions',
        émotions: 'emotions',
        sentiment: 'emotions',
        sentiments: 'emotions',
        nourriture: 'food',
        manger: 'food',
        cuisine: 'food',
        voyage: 'travel',
        voyager: 'travel',
        vacances: 'travel',
        animal: 'animals',
        animaux: 'animals',
        abstrait: 'abstract',
        abstraite: 'abstract',
        géométrique: 'abstract',
        formes: 'abstract',
        saisonnier: 'seasonal',
        saison: 'seasonal',
        hiver: 'seasonal',
        été: 'seasonal',
        célébration: 'celebration',
        fête: 'celebration',
        anniversaire: 'celebration',
        technologie: 'tech',
        tech: 'tech',
        ordinateur: 'tech',
        sport: 'sports',
        sports: 'sports',
        jeu: 'sports'
      }
    };

    return themeMap[language][normalizedText];
  }

  /**
   * Extract mood from text
   */
  private extractMood(text: string, language: Language): PatternMood | undefined {
    const normalizedText = text.toLowerCase().trim();
    
    const moodMap: Record<Language, Record<string, PatternMood>> = {
      en: {
        happy: 'happy',
        joyful: 'happy',
        cheerful: 'happy',
        calm: 'calm',
        peaceful: 'peaceful',
        serene: 'calm',
        relaxed: 'calm',
        energetic: 'energetic',
        energetic: 'energetic',
        vibrant: 'energetic',
        romantic: 'romantic',
        love: 'romantic',
        lovely: 'romantic',
        mysterious: 'mysterious',
        mystery: 'mysterious',
        dark: 'mysterious',
        playful: 'playful',
        fun: 'playful',
        funny: 'playful',
        elegant: 'elegant',
        sophisticated: 'elegant',
        classy: 'elegant',
        bold: 'bold',
        strong: 'bold',
        powerful: 'bold'
      },
      fr: {
        heureux: 'happy',
        heureuse: 'happy',
        joyeux: 'happy',
        joyeuse: 'happy',
        calme: 'calm',
        paisible: 'peaceful',
        serein: 'calm',
        sereine: 'calm',
        détendu: 'calm',
        détendue: 'calm',
        énergique: 'energetic',
        vibrant: 'energetic',
        vibrante: 'energetic',
        romantique: 'romantic',
        amour: 'romantic',
        mystérieux: 'mysterious',
        mystérieuse: 'mysterious',
        mystère: 'mysterious',
        sombre: 'mysterious',
        joueur: 'playful',
        joueuse: 'playful',
        amusant: 'playful',
        amusante: 'playful',
        élégant: 'elegant',
        élégante: 'elegant',
        sophistiqué: 'elegant',
        sophistiquée: 'elegant',
        audacieux: 'bold',
        audacieuse: 'bold',
        fort: 'bold',
        forte: 'bold',
        puissant: 'bold',
        puissante: 'bold'
      }
    };

    return moodMap[language][normalizedText];
  }

  /**
   * Apply configuration
   */
  private applyConfig(config: Partial<VoiceCommandConfig>): void {
    if (!this.recognition) return;

    if (config.language) {
      this.setLanguage(config.language);
    }
    
    if (config.continuous !== undefined) {
      this.recognition.continuous = config.continuous;
    }
    
    if (config.interimResults !== undefined) {
      this.recognition.interimResults = config.interimResults;
    }
    
    if (config.maxAlternatives !== undefined) {
      this.recognition.maxAlternatives = config.maxAlternatives;
    }
    
    if (config.grammars) {
      this.recognition.grammars = config.grammars;
    }
  }

  /**
   * Add command listener
   */
  onCommand(listener: (command: ParsedVoiceCommand) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Add error listener
   */
  onError(listener: (error: VoiceCommandError) => void): () => void {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }

  /**
   * Add status change listener
   */
  onStatusChange(listener: (isListening: boolean) => void): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  /**
   * Get current status
   */
  getStatus(): { isListening: boolean; language: Language; supported: boolean } {
    return {
      isListening: this.isListening,
      language: this.language,
      supported: this.isSpeechRecognitionSupported()
    };
  }

  /**
   * Notify command listeners
   */
  private notifyListeners(command: ParsedVoiceCommand): void {
    this.listeners.forEach(listener => {
      try {
        listener(command);
      } catch (error) {
        console.error('Voice command listener error:', error);
      }
    });
  }

  /**
   * Notify error listeners
   */
  private notifyErrorListeners(error: VoiceCommandError): void {
    this.errorListeners.forEach(listener => {
      try {
        listener(error);
      } catch (listenerError) {
        console.error('Voice command error listener error:', listenerError);
      }
    });
  }

  /**
   * Notify status listeners
   */
  private notifyStatusListeners(isListening: boolean): void {
    this.statusListeners.forEach(listener => {
      try {
        listener(isListening);
      } catch (error) {
        console.error('Voice command status listener error:', error);
      }
    });
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.stopListening();
    this.listeners.clear();
    this.errorListeners.clear();
    this.statusListeners.clear();
    this.recognition = null;
  }
}

// Export singleton
export const voiceCommandService = new VoiceCommandService();