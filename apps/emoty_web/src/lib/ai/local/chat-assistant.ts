/**
 * Offline Chat Assistant
 * Provides intelligent conversational support without external APIs
 * Educational content, troubleshooting, and pattern creation guidance
 */

import type { LocalizedString } from '@/types/pattern';
import type { PatternGenerationRequest } from './pattern-engine';
import { EMOJI_CONCEPTS, emojiRelationshipEngine } from './emoji-concepts';

export interface ChatMessage {
  id: string;
  content: LocalizedString;
  role: 'user' | 'assistant';
  timestamp: number;
  context?: ChatContext;
  suggestions?: LocalizedString[];
  metadata?: ChatMetadata;
}

export interface ChatContext {
  topic: string;
  userLevel: 'beginner' | 'intermediate' | 'advanced';
  language: 'en' | 'fr';
  previousTopics: string[];
  currentPattern?: string[];
  sessionLength: number;
}

export interface ChatMetadata {
  confidence: number;
  responseType: 'educational' | 'troubleshooting' | 'creative' | 'informational';
  relatedTopics: string[];
  hasFollowUp: boolean;
}

export interface ConversationFlow {
  id: string;
  name: LocalizedString;
  description: LocalizedString;
  triggers: string[];
  steps: ConversationStep[];
  prerequisites?: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export interface ConversationStep {
  id: string;
  content: LocalizedString;
  type: 'question' | 'explanation' | 'example' | 'exercise';
  options?: LocalizedString[];
  nextSteps: Record<string, string>; // option -> next step id
  isTerminal?: boolean;
}

export interface TutorialModule {
  id: string;
  title: LocalizedString;
  description: LocalizedString;
  lessons: TutorialLesson[];
  estimatedDuration: number; // minutes
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export interface TutorialLesson {
  id: string;
  title: LocalizedString;
  content: LocalizedString;
  examples: string[][]; // emoji sequences
  exercises: TutorialExercise[];
  keyTakeaways: LocalizedString[];
}

export interface TutorialExercise {
  id: string;
  prompt: LocalizedString;
  hint?: LocalizedString;
  expectedAnswer?: string;
  evaluation: (answer: string) => { correct: boolean; feedback: LocalizedString };
}

/**
 * Offline chat assistant with educational capabilities
 */
export class LocalChatAssistant {
  private conversationFlows: Map<string, ConversationFlow>;
  private tutorialModules: Map<string, TutorialModule>;
  private knowledgeBase: Map<string, KnowledgeEntry>;
  private currentContext: ChatContext;
  private messageHistory: ChatMessage[];

  constructor() {
    this.conversationFlows = new Map();
    this.tutorialModules = new Map();
    this.knowledgeBase = new Map();
    this.messageHistory = [];
    
    this.currentContext = {
      topic: 'general',
      userLevel: 'beginner',
      language: 'en',
      previousTopics: [],
      sessionLength: 0
    };

    this.initializeFlows();
    this.initializeTutorials();
    this.initializeKnowledgeBase();
  }

  /**
   * Process user message and generate response
   */
  async processMessage(userMessage: string, language: 'en' | 'fr' = 'en'): Promise<ChatMessage> {
    const messageId = this.generateMessageId();
    const timestamp = Date.now();
    
    // Update context
    this.currentContext.language = language;
    this.currentContext.sessionLength++;
    
    // Add user message to history
    const userMsg: ChatMessage = {
      id: messageId,
      content: { en: userMessage, fr: userMessage },
      role: 'user',
      timestamp,
      context: { ...this.currentContext }
    };
    this.messageHistory.push(userMsg);

    // Analyze user intent
    const intent = this.analyzeIntent(userMessage, language);
    
    // Generate response
    const response = await this.generateResponse(intent, userMessage, language);
    
    // Add assistant response to history
    this.messageHistory.push(response);
    
    // Update context based on response
    this.updateContext(intent, response);
    
    return response;
  }

  /**
   * Get tutorial recommendations based on user level and interests
   */
  getTutorialRecommendations(userLevel: 'beginner' | 'intermediate' | 'advanced' = 'beginner'): TutorialModule[] {
    const recommendations: TutorialModule[] = [];
    
    for (const [, module] of this.tutorialModules) {
      if (module.difficulty === userLevel || 
          (userLevel === 'intermediate' && module.difficulty === 'beginner')) {
        recommendations.push(module);
      }
    }
    
    return recommendations.sort((a, b) => a.estimatedDuration - b.estimatedDuration);
  }

  /**
   * Get help for specific topics
   */
  getTopicHelp(topic: string, language: 'en' | 'fr' = 'en'): LocalizedString | null {
    const entry = this.knowledgeBase.get(topic.toLowerCase());
    return entry ? entry.content : null;
  }

  /**
   * Get pattern creation tips based on current context
   */
  getPatternTips(currentPattern: string[], language: 'en' | 'fr' = 'en'): LocalizedString[] {
    const tips: LocalizedString[] = [];
    
    if (currentPattern.length === 0) {
      tips.push({
        en: "Start with a simple theme or emotion to guide your pattern creation",
        fr: "Commencez avec un thème simple ou une émotion pour guider la création de votre motif"
      });
    } else if (currentPattern.length === 1) {
      const emoji = currentPattern[0];
      const concept = EMOJI_CONCEPTS[emoji];
      if (concept) {
        const harmonies = emojiRelationshipEngine.findVisualHarmonies(emoji).slice(0, 3);
        if (harmonies.length > 0) {
          tips.push({
            en: `Consider adding ${harmonies.join(' ')} which harmonize well with ${emoji}`,
            fr: `Considérez ajouter ${harmonies.join(' ')} qui s'harmonisent bien avec ${emoji}`
          });
        }
      }
    } else {
      // Analyze current pattern for improvement suggestions
      const diversity = new Set(currentPattern).size / currentPattern.length;
      if (diversity < 0.7) {
        tips.push({
          en: "Try adding more variety to make your pattern more interesting",
          fr: "Essayez d'ajouter plus de variété pour rendre votre motif plus intéressant"
        });
      }
      
      if (currentPattern.length > 8) {
        tips.push({
          en: "Consider keeping patterns under 8 elements for better visual balance",
          fr: "Considérez garder les motifs sous 8 éléments pour un meilleur équilibre visuel"
        });
      }
    }
    
    return tips;
  }

  /**
   * Troubleshoot common issues
   */
  troubleshootIssue(issue: string, language: 'en' | 'fr' = 'en'): LocalizedString {
    const issueLower = issue.toLowerCase();
    
    // Common troubleshooting scenarios
    if (issueLower.includes('pattern') && issueLower.includes('not') && issueLower.includes('work')) {
      return {
        en: "Try refreshing the page or clearing your browser cache. If the issue persists, try using a different emoji palette or simplifying your pattern.",
        fr: "Essayez de rafraîchir la page ou de vider le cache de votre navigateur. Si le problème persiste, essayez d'utiliser une palette d'emojis différente ou de simplifier votre motif."
      };
    }
    
    if (issueLower.includes('slow') || issueLower.includes('performance')) {
      return {
        en: "Performance issues can occur with complex patterns. Try reducing the pattern size or complexity, and ensure you're not running too many other applications.",
        fr: "Des problèmes de performance peuvent survenir avec des motifs complexes. Essayez de réduire la taille ou la complexité du motif, et assurez-vous de ne pas exécuter trop d'autres applications."
      };
    }
    
    if (issueLower.includes('save') || issueLower.includes('lost')) {
      return {
        en: "Your patterns are automatically saved locally. If you're having issues, check your browser's local storage permissions and ensure you have enough storage space.",
        fr: "Vos motifs sont automatiquement sauvegardés localement. Si vous avez des problèmes, vérifiez les permissions de stockage local de votre navigateur et assurez-vous d'avoir suffisamment d'espace de stockage."
      };
    }
    
    if (issueLower.includes('accessibility') || issueLower.includes('screen reader')) {
      return {
        en: "This app is designed to work with screen readers. Make sure your screen reader is set to announce live regions and dynamic content changes.",
        fr: "Cette application est conçue pour fonctionner avec les lecteurs d'écran. Assurez-vous que votre lecteur d'écran est configuré pour annoncer les régions live et les changements de contenu dynamique."
      };
    }
    
    // Generic fallback
    return {
      en: "I'm here to help! Can you provide more details about the specific issue you're experiencing? For immediate assistance, try refreshing the page or restarting the application.",
      fr: "Je suis là pour vous aider ! Pouvez-vous fournir plus de détails sur le problème spécifique que vous rencontrez ? Pour une aide immédiate, essayez de rafraîchir la page ou de redémarrer l'application."
    };
  }

  /**
   * Get conversation history
   */
  getHistory(limit: number = 10): ChatMessage[] {
    return this.messageHistory.slice(-limit);
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.messageHistory = [];
    this.currentContext.previousTopics = [];
    this.currentContext.sessionLength = 0;
  }

  /**
   * Export conversation for offline analysis
   */
  exportConversation(): ConversationExport {
    return {
      messages: this.messageHistory,
      context: this.currentContext,
      timestamp: Date.now(),
      version: '1.0.0'
    };
  }

  // Private methods

  private analyzeIntent(message: string, language: 'en' | 'fr'): MessageIntent {
    const msgLower = message.toLowerCase();
    
    // Intent detection patterns
    const patterns = {
      help: ['help', 'aide', 'assistance', 'how', 'comment'],
      tutorial: ['tutorial', 'learn', 'teach', 'tutoriel', 'apprendre', 'enseigner'],
      troubleshoot: ['problem', 'issue', 'error', 'problème', 'erreur', 'bug'],
      creative: ['create', 'make', 'design', 'créer', 'faire', 'designer'],
      question: ['what', 'why', 'how', 'when', 'where', 'qu\'est-ce', 'pourquoi', 'comment', 'quand', 'où'],
      pattern: ['pattern', 'emoji', 'motif', 'émoji'],
      greeting: ['hello', 'hi', 'hey', 'bonjour', 'salut']
    };
    
    let primaryIntent = 'general';
    let confidence = 0.5;
    
    for (const [intent, keywords] of Object.entries(patterns)) {
      const matches = keywords.filter(keyword => msgLower.includes(keyword));
      const intentConfidence = matches.length / keywords.length;
      
      if (intentConfidence > confidence) {
        primaryIntent = intent;
        confidence = intentConfidence;
      }
    }
    
    return {
      primary: primaryIntent,
      confidence,
      entities: this.extractEntities(message),
      sentiment: this.analyzeSentiment(message)
    };
  }

  private async generateResponse(
    intent: MessageIntent, 
    userMessage: string, 
    language: 'en' | 'fr'
  ): Promise<ChatMessage> {
    const messageId = this.generateMessageId();
    const timestamp = Date.now();
    
    let content: LocalizedString;
    let suggestions: LocalizedString[] = [];
    let metadata: ChatMetadata;

    switch (intent.primary) {
      case 'greeting':
        content = this.generateGreeting(language);
        suggestions = this.getGreetingSuggestions(language);
        metadata = {
          confidence: 0.9,
          responseType: 'informational',
          relatedTopics: ['tutorial', 'help'],
          hasFollowUp: true
        };
        break;
        
      case 'help':
        content = this.generateHelpResponse(intent.entities, language);
        suggestions = this.getHelpSuggestions(language);
        metadata = {
          confidence: 0.8,
          responseType: 'informational',
          relatedTopics: ['tutorial', 'troubleshooting'],
          hasFollowUp: true
        };
        break;
        
      case 'tutorial':
        content = this.generateTutorialResponse(intent.entities, language);
        suggestions = this.getTutorialSuggestions(language);
        metadata = {
          confidence: 0.85,
          responseType: 'educational',
          relatedTopics: ['pattern', 'creative'],
          hasFollowUp: true
        };
        break;
        
      case 'troubleshoot':
        content = this.troubleshootIssue(userMessage, language);
        suggestions = this.getTroubleshootingSuggestions(language);
        metadata = {
          confidence: 0.75,
          responseType: 'troubleshooting',
          relatedTopics: ['help'],
          hasFollowUp: false
        };
        break;
        
      case 'creative':
        content = this.generateCreativeResponse(intent.entities, language);
        suggestions = this.getCreativeSuggestions(language);
        metadata = {
          confidence: 0.8,
          responseType: 'creative',
          relatedTopics: ['pattern', 'tutorial'],
          hasFollowUp: true
        };
        break;
        
      case 'pattern':
        content = this.generatePatternResponse(intent.entities, language);
        suggestions = this.getPatternSuggestions(language);
        metadata = {
          confidence: 0.85,
          responseType: 'educational',
          relatedTopics: ['creative', 'tutorial'],
          hasFollowUp: true
        };
        break;
        
      default:
        content = this.generateGeneralResponse(userMessage, language);
        suggestions = this.getGeneralSuggestions(language);
        metadata = {
          confidence: 0.6,
          responseType: 'informational',
          relatedTopics: ['help'],
          hasFollowUp: true
        };
    }

    return {
      id: messageId,
      content,
      role: 'assistant',
      timestamp,
      context: { ...this.currentContext },
      suggestions,
      metadata
    };
  }

  private generateGreeting(language: 'en' | 'fr'): LocalizedString {
    const greetings = {
      en: [
        "Hello! I'm your offline pattern assistant. I can help you create beautiful emoji patterns, learn new techniques, and troubleshoot any issues you might have.",
        "Hi there! Ready to create some amazing emoji patterns? I'm here to guide you through the process and answer any questions.",
        "Welcome! I'm here to help you become a pattern creation expert. What would you like to explore today?"
      ],
      fr: [
        "Bonjour ! Je suis votre assistant de motifs hors ligne. Je peux vous aider à créer de beaux motifs d'emojis, apprendre de nouvelles techniques et résoudre les problèmes que vous pourriez avoir.",
        "Salut ! Prêt à créer des motifs d'emojis incroyables ? Je suis là pour vous guider dans le processus et répondre à toutes vos questions.",
        "Bienvenue ! Je suis là pour vous aider à devenir un expert en création de motifs. Qu'aimeriez-vous explorer aujourd'hui ?"
      ]
    };

    const options = greetings[language];
    const selected = options[Math.floor(Math.random() * options.length)];
    
    return {
      en: language === 'en' ? selected : greetings.en[0],
      fr: language === 'fr' ? selected : greetings.fr[0]
    };
  }

  private generateHelpResponse(entities: string[], language: 'en' | 'fr'): LocalizedString {
    const helpTopics = {
      en: {
        general: "I can help you with pattern creation, tutorials, troubleshooting, and creative inspiration. What specific area would you like help with?",
        pattern: "For pattern help, I can guide you through emoji selection, color harmony, visual balance, and composition techniques.",
        emoji: "I can explain emoji meanings, suggest harmonious combinations, and help you understand visual relationships between different emojis.",
        tutorial: "I offer step-by-step tutorials for beginners through advanced users, covering all aspects of pattern creation."
      },
      fr: {
        general: "Je peux vous aider avec la création de motifs, les tutoriels, le dépannage et l'inspiration créative. Dans quel domaine spécifique aimeriez-vous de l'aide ?",
        pattern: "Pour l'aide aux motifs, je peux vous guider dans la sélection d'emojis, l'harmonie des couleurs, l'équilibre visuel et les techniques de composition.",
        emoji: "Je peux expliquer les significations des emojis, suggérer des combinaisons harmonieuses et vous aider à comprendre les relations visuelles entre différents emojis.",
        tutorial: "J'offre des tutoriels étape par étape pour les utilisateurs débutants à avancés, couvrant tous les aspects de la création de motifs."
      }
    };

    let topic = 'general';
    if (entities.includes('pattern') || entities.includes('motif')) topic = 'pattern';
    else if (entities.includes('emoji')) topic = 'emoji';
    else if (entities.includes('tutorial') || entities.includes('tutoriel')) topic = 'tutorial';

    return {
      en: helpTopics.en[topic as keyof typeof helpTopics.en],
      fr: helpTopics.fr[topic as keyof typeof helpTopics.fr]
    };
  }

  private generateTutorialResponse(entities: string[], language: 'en' | 'fr'): LocalizedString {
    return {
      en: "I'd love to help you learn! I offer tutorials on basic pattern creation, advanced composition techniques, color theory with emojis, and cultural considerations. Which topic interests you most?",
      fr: "J'aimerais vous aider à apprendre ! J'offre des tutoriels sur la création de motifs de base, les techniques de composition avancées, la théorie des couleurs avec les emojis et les considérations culturelles. Quel sujet vous intéresse le plus ?"
    };
  }

  private generateCreativeResponse(entities: string[], language: 'en' | 'fr'): LocalizedString {
    return {
      en: "Let's get creative! I can suggest themes, help you explore color combinations, recommend complementary emojis, or guide you through different pattern styles. What kind of pattern are you envisioning?",
      fr: "Soyons créatifs ! Je peux suggérer des thèmes, vous aider à explorer les combinaisons de couleurs, recommander des emojis complémentaires ou vous guider à travers différents styles de motifs. Quel genre de motif envisagez-vous ?"
    };
  }

  private generatePatternResponse(entities: string[], language: 'en' | 'fr'): LocalizedString {
    return {
      en: "Patterns are all about harmony and balance! The key is choosing emojis that work well together visually and thematically. Would you like tips on emoji selection, visual composition, or pattern complexity?",
      fr: "Les motifs sont une question d'harmonie et d'équilibre ! La clé est de choisir des emojis qui fonctionnent bien ensemble visuellement et thématiquement. Aimeriez-vous des conseils sur la sélection d'emojis, la composition visuelle ou la complexité des motifs ?"
    };
  }

  private generateGeneralResponse(message: string, language: 'en' | 'fr'): LocalizedString {
    return {
      en: "I understand you're looking for assistance. I'm specialized in helping with emoji pattern creation, tutorials, and troubleshooting. Could you tell me more about what you'd like to do?",
      fr: "Je comprends que vous cherchez de l'aide. Je me spécialise dans l'aide à la création de motifs d'emojis, les tutoriels et le dépannage. Pourriez-vous me dire plus sur ce que vous aimeriez faire ?"
    };
  }

  private getGreetingSuggestions(language: 'en' | 'fr'): LocalizedString[] {
    return [
      {
        en: "Show me a beginner tutorial",
        fr: "Montrez-moi un tutoriel pour débutants"
      },
      {
        en: "Help me create my first pattern",
        fr: "Aidez-moi à créer mon premier motif"
      },
      {
        en: "What can you teach me?",
        fr: "Que pouvez-vous m'enseigner ?"
      }
    ];
  }

  private getHelpSuggestions(language: 'en' | 'fr'): LocalizedString[] {
    return [
      {
        en: "How do I choose good emoji combinations?",
        fr: "Comment choisir de bonnes combinaisons d'emojis ?"
      },
      {
        en: "What makes a pattern visually appealing?",
        fr: "Qu'est-ce qui rend un motif visuellement attrayant ?"
      },
      {
        en: "Can you help me troubleshoot an issue?",
        fr: "Pouvez-vous m'aider à résoudre un problème ?"
      }
    ];
  }

  private getTutorialSuggestions(language: 'en' | 'fr'): LocalizedString[] {
    return [
      {
        en: "Start with basic pattern creation",
        fr: "Commencer avec la création de motifs de base"
      },
      {
        en: "Learn about color harmony",
        fr: "Apprendre sur l'harmonie des couleurs"
      },
      {
        en: "Advanced composition techniques",
        fr: "Techniques de composition avancées"
      }
    ];
  }

  private getTroubleshootingSuggestions(language: 'en' | 'fr'): LocalizedString[] {
    return [
      {
        en: "Try a different approach",
        fr: "Essayer une approche différente"
      },
      {
        en: "Get more specific help",
        fr: "Obtenir une aide plus spécifique"
      },
      {
        en: "Report a persistent issue",
        fr: "Signaler un problème persistant"
      }
    ];
  }

  private getCreativeSuggestions(language: 'en' | 'fr'): LocalizedString[] {
    return [
      {
        en: "Suggest a theme for me",
        fr: "Suggérer un thème pour moi"
      },
      {
        en: "Help me combine these emojis",
        fr: "Aidez-moi à combiner ces emojis"
      },
      {
        en: "Show me pattern inspiration",
        fr: "Montrez-moi de l'inspiration de motifs"
      }
    ];
  }

  private getPatternSuggestions(language: 'en' | 'fr'): LocalizedString[] {
    return [
      {
        en: "Explain visual harmony principles",
        fr: "Expliquer les principes d'harmonie visuelle"
      },
      {
        en: "Help me improve this pattern",
        fr: "Aidez-moi à améliorer ce motif"
      },
      {
        en: "What makes patterns effective?",
        fr: "Qu'est-ce qui rend les motifs efficaces ?"
      }
    ];
  }

  private getGeneralSuggestions(language: 'en' | 'fr'): LocalizedString[] {
    return [
      {
        en: "What can you help me with?",
        fr: "Avec quoi pouvez-vous m'aider ?"
      },
      {
        en: "I need help creating patterns",
        fr: "J'ai besoin d'aide pour créer des motifs"
      },
      {
        en: "Show me available tutorials",
        fr: "Montrez-moi les tutoriels disponibles"
      }
    ];
  }

  private extractEntities(message: string): string[] {
    const entities: string[] = [];
    const words = message.toLowerCase().split(/\s+/);
    
    // Common entity patterns
    const entityPatterns = {
      colors: ['red', 'blue', 'green', 'yellow', 'purple', 'pink', 'orange', 'rouge', 'bleu', 'vert', 'jaune', 'violet', 'rose'],
      emotions: ['happy', 'sad', 'love', 'joy', 'peace', 'energy', 'heureux', 'triste', 'amour', 'joie', 'paix', 'énergie'],
      objects: ['heart', 'flower', 'star', 'animal', 'food', 'cœur', 'fleur', 'étoile', 'animal', 'nourriture']
    };
    
    for (const word of words) {
      for (const [category, items] of Object.entries(entityPatterns)) {
        if (items.includes(word)) {
          entities.push(word);
        }
      }
    }
    
    return entities;
  }

  private analyzeSentiment(message: string): 'positive' | 'neutral' | 'negative' {
    const positiveWords = ['good', 'great', 'awesome', 'love', 'like', 'amazing', 'perfect', 'excellent', 'bon', 'génial', 'formidable', 'aime', 'incroyable', 'parfait'];
    const negativeWords = ['bad', 'terrible', 'hate', 'dislike', 'awful', 'wrong', 'problem', 'issue', 'mauvais', 'terrible', 'déteste', 'affreux', 'problème'];
    
    const words = message.toLowerCase().split(/\s+/);
    const positiveScore = words.filter(word => positiveWords.includes(word)).length;
    const negativeScore = words.filter(word => negativeWords.includes(word)).length;
    
    if (positiveScore > negativeScore) return 'positive';
    if (negativeScore > positiveScore) return 'negative';
    return 'neutral';
  }

  private updateContext(intent: MessageIntent, response: ChatMessage): void {
    // Update topic based on intent
    if (intent.primary !== 'general') {
      this.currentContext.topic = intent.primary;
      
      if (!this.currentContext.previousTopics.includes(intent.primary)) {
        this.currentContext.previousTopics.push(intent.primary);
      }
    }
    
    // Infer user level from conversation
    if (intent.primary === 'tutorial' && response.metadata?.hasFollowUp) {
      // User asking for tutorials might be beginner
      this.currentContext.userLevel = 'beginner';
    }
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeFlows(): void {
    // Initialize conversation flows for guided interactions
    // This would contain structured conversation trees
  }

  private initializeTutorials(): void {
    // Initialize tutorial modules
    const basicPatternTutorial: TutorialModule = {
      id: 'basic-patterns',
      title: {
        en: 'Basic Pattern Creation',
        fr: 'Création de Motifs de Base'
      },
      description: {
        en: 'Learn the fundamentals of creating beautiful emoji patterns',
        fr: 'Apprenez les bases de la création de beaux motifs d\'emojis'
      },
      estimatedDuration: 15,
      difficulty: 'beginner',
      lessons: [
        {
          id: 'lesson-1',
          title: {
            en: 'Choosing Your First Emoji',
            fr: 'Choisir Votre Premier Emoji'
          },
          content: {
            en: 'The first emoji sets the tone for your entire pattern. Choose something that represents the main theme or emotion you want to convey.',
            fr: 'Le premier emoji donne le ton à tout votre motif. Choisissez quelque chose qui représente le thème principal ou l\'émotion que vous voulez transmettre.'
          },
          examples: [['❤️'], ['🌸'], ['⭐']],
          exercises: [],
          keyTakeaways: [
            {
              en: 'The first emoji is your pattern\'s foundation',
              fr: 'Le premier emoji est la base de votre motif'
            }
          ]
        }
      ]
    };

    this.tutorialModules.set(basicPatternTutorial.id, basicPatternTutorial);
  }

  private initializeKnowledgeBase(): void {
    // Initialize knowledge base entries
    const entries = [
      {
        key: 'pattern basics',
        content: {
          en: 'Patterns are sequences of emojis arranged in concentric squares. The key to good patterns is visual harmony and thematic coherence.',
          fr: 'Les motifs sont des séquences d\'emojis arrangées en carrés concentriques. La clé de bons motifs est l\'harmonie visuelle et la cohérence thématique.'
        }
      },
      {
        key: 'color harmony',
        content: {
          en: 'Color harmony in emoji patterns comes from choosing emojis with similar or complementary color schemes. Warm colors work well together, as do cool colors.',
          fr: 'L\'harmonie des couleurs dans les motifs d\'emojis vient du choix d\'emojis avec des schémas de couleurs similaires ou complémentaires. Les couleurs chaudes fonctionnent bien ensemble, tout comme les couleurs froides.'
        }
      }
    ];

    for (const entry of entries) {
      this.knowledgeBase.set(entry.key, {
        content: entry.content,
        lastUpdated: Date.now(),
        accessCount: 0
      });
    }
  }
}

// Supporting interfaces
interface MessageIntent {
  primary: string;
  confidence: number;
  entities: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
}

interface KnowledgeEntry {
  content: LocalizedString;
  lastUpdated: number;
  accessCount: number;
}

export interface ConversationExport {
  messages: ChatMessage[];
  context: ChatContext;
  timestamp: number;
  version: string;
}

// Export singleton instance
export const localChatAssistant = new LocalChatAssistant();