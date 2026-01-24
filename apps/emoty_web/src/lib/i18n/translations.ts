/**
 * Multilingual translations for AI features
 */
import type { Language } from '@/types/ai';

export interface Translations {
  // AI Pattern Generation
  ai: {
    patternGeneration: {
      title: string;
      subtitle: string;
      generateButton: string;
      generating: string;
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
      options: {
        theme: string;
        mood: string;
        size: string;
        customPrompt: string;
        maxPatterns: string;
      };
      placeholders: {
        customPrompt: string;
      };
      errors: {
        rateLimited: string;
        apiError: string;
        noPatterns: string;
        accessDenied: string;
      };
      success: {
        patternsGenerated: string;
        fallbackUsed: string;
      };
    };
    
    // Voice Commands
    voice: {
      title: string;
      startListening: string;
      stopListening: string;
      listening: string;
      notSupported: string;
      permissionDenied: string;
      errors: {
        notSupported: string;
        permissionDenied: string;
        recognitionError: string;
      };
      commands: {
        examples: string[];
        help: string;
      };
    };
    
    // EmotyBot
    bot: {
      title: string;
      subtitle: string;
      placeholder: string;
      voicePlaceholder: string;
      send: string;
      patterns: {
        usePattern: string;
        aiGenerated: string;
        localPattern: string;
      };
      greeting: string[];
      help: string[];
      errors: {
        sessionFailed: string;
        messageFailed: string;
      };
    };
    
    // Feature Gates
    featureGate: {
      title: string;
      description: string;
      levelRequired: string;
      upgrade: string;
      features: {
        aiPatternGeneration: string;
        voiceCommands: string;
        advancedChat: string;
      };
    };
  };
  
  // General UI
  ui: {
    loading: string;
    error: string;
    retry: string;
    cancel: string;
    close: string;
    back: string;
    next: string;
    save: string;
    delete: string;
    edit: string;
    copy: string;
    share: string;
  };
  
  // Accessibility
  a11y: {
    aiPatternGeneration: string;
    voiceCommands: string;
    chatBot: string;
    patterns: {
      preview: string;
      select: string;
      difficulty: string;
    };
  };
}

export const translations: Record<Language, Translations> = {
  en: {
    ai: {
      patternGeneration: {
        title: 'AI Pattern Generator',
        subtitle: 'Create unique emoji patterns with artificial intelligence',
        generateButton: 'Generate Patterns',
        generating: 'Generating patterns...',
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
        options: {
          theme: 'Theme',
          mood: 'Mood',
          size: 'Pattern Size',
          customPrompt: 'Custom Description',
          maxPatterns: 'Number of Patterns'
        },
        placeholders: {
          customPrompt: 'Describe the pattern you want...'
        },
        errors: {
          rateLimited: 'Please wait before generating more patterns',
          apiError: 'Unable to generate patterns right now',
          noPatterns: 'No patterns were generated',
          accessDenied: 'AI features not available at your level'
        },
        success: {
          patternsGenerated: 'Generated {count} new patterns!',
          fallbackUsed: 'Using offline patterns (AI unavailable)'
        }
      },
      
      voice: {
        title: 'Voice Commands',
        startListening: 'Start Voice Commands',
        stopListening: 'Stop Listening',
        listening: 'Listening...',
        notSupported: 'Voice commands not supported',
        permissionDenied: 'Microphone permission required',
        errors: {
          notSupported: 'Your browser doesn\'t support voice recognition',
          permissionDenied: 'Please allow microphone access to use voice commands',
          recognitionError: 'Voice recognition error occurred'
        },
        commands: {
          examples: [
            'Create a nature pattern',
            'Make something happy and colorful',
            'Generate a 6x6 romantic pattern',
            'Change theme to food',
            'Save this pattern',
            'Help'
          ],
          help: 'Try commands like "Create a nature pattern" or "Make something happy"'
        }
      },
      
      bot: {
        title: 'EmotyBot',
        subtitle: 'Your AI Pattern Assistant',
        placeholder: 'Ask me to create patterns...',
        voicePlaceholder: 'Listening for voice commands...',
        send: 'Send',
        patterns: {
          usePattern: 'Use This Pattern',
          aiGenerated: 'AI Generated',
          localPattern: 'Curated Pattern'
        },
        greeting: [
          'Hi! I\'m EmotyBot, ready to create amazing patterns with you! 🎨',
          'Hello! Let\'s make some beautiful emoji patterns together! ✨',
          'Welcome! I\'m here to help you design creative patterns! 🌟'
        ],
        help: [
          'I can create patterns by theme, mood, or custom descriptions.',
          'Try asking for "nature patterns", "happy designs", or describe what you want!'
        ],
        errors: {
          sessionFailed: 'Failed to start chat session',
          messageFailed: 'Failed to send message'
        }
      },
      
      featureGate: {
        title: 'AI Features',
        description: 'Unlock advanced AI-powered pattern creation',
        levelRequired: 'Level {level} required',
        upgrade: 'Create more patterns to unlock',
        features: {
          aiPatternGeneration: 'AI Pattern Generation',
          voiceCommands: 'Voice Commands',
          advancedChat: 'Advanced Chat Assistant'
        }
      }
    },
    
    ui: {
      loading: 'Loading...',
      error: 'Error',
      retry: 'Try Again',
      cancel: 'Cancel',
      close: 'Close',
      back: 'Back',
      next: 'Next',
      save: 'Save',
      delete: 'Delete',
      edit: 'Edit',
      copy: 'Copy',
      share: 'Share'
    },
    
    a11y: {
      aiPatternGeneration: 'AI pattern generation interface',
      voiceCommands: 'Voice command controls',
      chatBot: 'Chat with EmotyBot assistant',
      patterns: {
        preview: 'Pattern preview with {count} emojis',
        select: 'Select pattern {name}',
        difficulty: 'Difficulty level: {level}'
      }
    }
  },
  
  fr: {
    ai: {
      patternGeneration: {
        title: 'Générateur de Motifs IA',
        subtitle: 'Créez des motifs emoji uniques avec l\'intelligence artificielle',
        generateButton: 'Générer des Motifs',
        generating: 'Génération des motifs...',
        themes: {
          nature: 'Nature',
          emotions: 'Émotions',
          food: 'Nourriture',
          travel: 'Voyage',
          animals: 'Animaux',
          abstract: 'Abstrait',
          seasonal: 'Saisonnier',
          celebration: 'Célébration',
          tech: 'Technologie',
          sports: 'Sports'
        },
        moods: {
          happy: 'Joyeux',
          calm: 'Calme',
          energetic: 'Énergique',
          romantic: 'Romantique',
          mysterious: 'Mystérieux',
          playful: 'Joueur',
          elegant: 'Élégant',
          bold: 'Audacieux',
          peaceful: 'Paisible'
        },
        options: {
          theme: 'Thème',
          mood: 'Humeur',
          size: 'Taille du Motif',
          customPrompt: 'Description Personnalisée',
          maxPatterns: 'Nombre de Motifs'
        },
        placeholders: {
          customPrompt: 'Décrivez le motif que vous voulez...'
        },
        errors: {
          rateLimited: 'Veuillez attendre avant de générer plus de motifs',
          apiError: 'Impossible de générer des motifs maintenant',
          noPatterns: 'Aucun motif n\'a été généré',
          accessDenied: 'Fonctionnalités IA non disponibles à votre niveau'
        },
        success: {
          patternsGenerated: '{count} nouveaux motifs générés !',
          fallbackUsed: 'Utilisation de motifs hors ligne (IA indisponible)'
        }
      },
      
      voice: {
        title: 'Commandes Vocales',
        startListening: 'Démarrer les Commandes Vocales',
        stopListening: 'Arrêter l\'Écoute',
        listening: 'Écoute...',
        notSupported: 'Commandes vocales non supportées',
        permissionDenied: 'Permission du microphone requise',
        errors: {
          notSupported: 'Votre navigateur ne supporte pas la reconnaissance vocale',
          permissionDenied: 'Veuillez autoriser l\'accès au microphone pour les commandes vocales',
          recognitionError: 'Erreur de reconnaissance vocale'
        },
        commands: {
          examples: [
            'Créer un motif nature',
            'Faire quelque chose de joyeux et coloré',
            'Générer un motif romantique 6x6',
            'Changer le thème pour nourriture',
            'Sauvegarder ce motif',
            'Aide'
          ],
          help: 'Essayez des commandes comme "Créer un motif nature" ou "Faire quelque chose de joyeux"'
        }
      },
      
      bot: {
        title: 'EmotyBot',
        subtitle: 'Votre Assistant IA de Motifs',
        placeholder: 'Demandez-moi de créer des motifs...',
        voicePlaceholder: 'Écoute des commandes vocales...',
        send: 'Envoyer',
        patterns: {
          usePattern: 'Utiliser ce Motif',
          aiGenerated: 'Généré par IA',
          localPattern: 'Motif Sélectionné'
        },
        greeting: [
          'Salut ! Je suis EmotyBot, prêt à créer des motifs incroyables avec vous ! 🎨',
          'Bonjour ! Créons ensemble de beaux motifs emoji ! ✨',
          'Bienvenue ! Je suis là pour vous aider à concevoir des motifs créatifs ! 🌟'
        ],
        help: [
          'Je peux créer des motifs par thème, humeur ou descriptions personnalisées.',
          'Essayez de demander des "motifs nature", "designs joyeux", ou décrivez ce que vous voulez !'
        ],
        errors: {
          sessionFailed: 'Impossible de démarrer la session de chat',
          messageFailed: 'Impossible d\'envoyer le message'
        }
      },
      
      featureGate: {
        title: 'Fonctionnalités IA',
        description: 'Débloquez la création de motifs avancée alimentée par IA',
        levelRequired: 'Niveau {level} requis',
        upgrade: 'Créez plus de motifs pour débloquer',
        features: {
          aiPatternGeneration: 'Génération de Motifs IA',
          voiceCommands: 'Commandes Vocales',
          advancedChat: 'Assistant Chat Avancé'
        }
      }
    },
    
    ui: {
      loading: 'Chargement...',
      error: 'Erreur',
      retry: 'Réessayer',
      cancel: 'Annuler',
      close: 'Fermer',
      back: 'Retour',
      next: 'Suivant',
      save: 'Sauvegarder',
      delete: 'Supprimer',
      edit: 'Modifier',
      copy: 'Copier',
      share: 'Partager'
    },
    
    a11y: {
      aiPatternGeneration: 'Interface de génération de motifs IA',
      voiceCommands: 'Contrôles des commandes vocales',
      chatBot: 'Chatter avec l\'assistant EmotyBot',
      patterns: {
        preview: 'Aperçu du motif avec {count} emojis',
        select: 'Sélectionner le motif {name}',
        difficulty: 'Niveau de difficulté : {level}'
      }
    }
  }
};

/**
 * Get translation for current language
 */
export function getTranslation(language: Language = 'en'): Translations {
  return translations[language] || translations.en;
}

/**
 * Translate a key with interpolation
 */
export function t(
  key: string, 
  language: Language = 'en', 
  variables: Record<string, string | number> = {}
): string {
  const trans = getTranslation(language);
  
  // Navigate nested object path
  const keys = key.split('.');
  let value: any = trans;
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      console.warn(`Translation key not found: ${key}`);
      return key;
    }
  }
  
  if (typeof value !== 'string') {
    console.warn(`Translation key does not resolve to string: ${key}`);
    return key;
  }
  
  // Interpolate variables
  let result = value;
  for (const [variable, replacement] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{${variable}}`, 'g'), String(replacement));
  }
  
  return result;
}

/**
 * Get array of translations
 */
export function tArray(key: string, language: Language = 'en'): string[] {
  const trans = getTranslation(language);
  
  // Navigate nested object path
  const keys = key.split('.');
  let value: any = trans;
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      console.warn(`Translation key not found: ${key}`);
      return [key];
    }
  }
  
  if (!Array.isArray(value)) {
    console.warn(`Translation key does not resolve to array: ${key}`);
    return [key];
  }
  
  return value;
}

/**
 * React hook for translations
 */
export function useTranslations(language: Language = 'en') {
  const trans = getTranslation(language);
  
  const translate = (key: string, variables?: Record<string, string | number>) => 
    t(key, language, variables);
    
  const translateArray = (key: string) => 
    tArray(key, language);
  
  return {
    t: translate,
    tArray: translateArray,
    translations: trans
  };
}