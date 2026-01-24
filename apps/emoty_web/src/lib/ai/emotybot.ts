/**
 * EmotyBot conversational interface for pattern creation
 */
import { patternGenerator } from './pattern-generator';
import type { 
  EmotyBotSession, 
  EmotyBotMessage, 
  PatternGenerationRequest,
  GeneratedPattern,
  Language,
  UserLevel,
  PatternTheme,
  PatternMood
} from '@/types/ai';

interface MessageContext {
  isFollowUp: boolean;
  previousTheme?: PatternTheme;
  previousMood?: PatternMood;
  previousSize?: number;
  conversationFlow: 'greeting' | 'pattern_request' | 'pattern_feedback' | 'help' | 'casual';
}

export class EmotyBotService {
  private sessions: Map<string, EmotyBotSession> = new Map();
  
  // Localized responses
  private responses = {
    en: {
      greeting: [
        "Hello! I'm EmotyBot, your emoji pattern assistant! 🎨 What kind of pattern would you like to create today?",
        "Hi there! Ready to create some beautiful emoji patterns? ✨ Tell me what's inspiring you!",
        "Welcome! I'm here to help you design amazing emoji patterns. What's on your mind? 🌟"
      ],
      help: [
        "I can help you create emoji patterns! Try saying things like:\n• 'Create a nature pattern'\n• 'Make something happy and colorful'\n• 'I want a 6x6 romantic pattern'\n• 'Generate patterns about food'",
        "Here are some ways I can assist you:\n• Generate patterns by theme (nature, food, emotions)\n• Create patterns with specific moods (happy, calm, energetic)\n• Adjust pattern sizes and complexity\n• Suggest improvements to existing patterns"
      ],
      patternSuccess: [
        "Here are some beautiful patterns I created for you! ✨",
        "I've designed these patterns based on your request! 🎨",
        "Check out these creative patterns I generated! 🌟"
      ],
      patternError: [
        "I had some trouble creating patterns right now, but I've prepared some alternatives for you! 💫",
        "The AI service is taking a break, so I've crafted some local patterns instead! 🎭",
        "Let me offer you some handcrafted patterns while the AI catches up! 🌈"
      ],
      followUp: [
        "Would you like me to create variations of these patterns?",
        "How do these look? I can adjust the theme or mood if you'd like!",
        "What do you think? Should I try a different approach?"
      ],
      rateLimited: [
        "I need a moment to recharge my creativity! ⚡ Please try again in a minute.",
        "My pattern generator is cooling down. Let's wait just a moment! ⏰"
      ],
      farewell: [
        "Thanks for creating with me! Your patterns look amazing! 🎨✨",
        "It was fun designing patterns together! Come back anytime! 🌟",
        "Happy pattern making! I hope you love what we created! 💫"
      ]
    },
    fr: {
      greeting: [
        "Salut ! Je suis EmotyBot, votre assistant de motifs emoji ! 🎨 Quel type de motif voulez-vous créer aujourd'hui ?",
        "Bonjour ! Prêt à créer de beaux motifs emoji ? ✨ Dites-moi ce qui vous inspire !",
        "Bienvenue ! Je suis là pour vous aider à concevoir des motifs emoji incroyables. À quoi pensez-vous ? 🌟"
      ],
      help: [
        "Je peux vous aider à créer des motifs emoji ! Essayez des phrases comme :\n• 'Créer un motif nature'\n• 'Faire quelque chose de joyeux et coloré'\n• 'Je veux un motif romantique 6x6'\n• 'Générer des motifs sur la nourriture'",
        "Voici comment je peux vous aider :\n• Générer des motifs par thème (nature, nourriture, émotions)\n• Créer des motifs avec des humeurs spécifiques (heureux, calme, énergique)\n• Ajuster la taille et la complexité des motifs\n• Suggérer des améliorations aux motifs existants"
      ],
      patternSuccess: [
        "Voici de beaux motifs que j'ai créés pour vous ! ✨",
        "J'ai conçu ces motifs basés sur votre demande ! 🎨",
        "Découvrez ces motifs créatifs que j'ai générés ! 🌟"
      ],
      patternError: [
        "J'ai eu des difficultés à créer des motifs maintenant, mais j'ai préparé des alternatives pour vous ! 💫",
        "Le service IA fait une pause, alors j'ai créé des motifs locaux à la place ! 🎭",
        "Permettez-moi de vous offrir des motifs artisanaux pendant que l'IA rattrape ! 🌈"
      ],
      followUp: [
        "Voulez-vous que je crée des variations de ces motifs ?",
        "Comment ça vous semble ? Je peux ajuster le thème ou l'humeur si vous voulez !",
        "Qu'en pensez-vous ? Dois-je essayer une approche différente ?"
      ],
      rateLimited: [
        "J'ai besoin d'un moment pour recharger ma créativité ! ⚡ Veuillez réessayer dans une minute.",
        "Mon générateur de motifs refroidit. Attendons juste un moment ! ⏰"
      ],
      farewell: [
        "Merci d'avoir créé avec moi ! Vos motifs sont magnifiques ! 🎨✨",
        "C'était amusant de concevoir des motifs ensemble ! Revenez quand vous voulez ! 🌟",
        "Bonne création de motifs ! J'espère que vous aimez ce que nous avons créé ! 💫"
      ]
    }
  };

  /**
   * Start a new conversation session
   */
  async startSession(
    userId: string, 
    userLevel: UserLevel, 
    language: Language = 'en'
  ): Promise<EmotyBotSession> {
    const sessionId = `${userId}_${Date.now()}`;
    
    const session: EmotyBotSession = {
      id: sessionId,
      userId,
      messages: [],
      startedAt: new Date(),
      lastActivity: new Date(),
      language,
      context: {
        userLevel,
        preferences: {
          themes: [],
          moods: [],
          avoidEmojis: [],
          favoriteColors: []
        },
        stats: {
          messagesCount: 0,
          patternsGenerated: 0,
          tokensUsed: 0
        }
      }
    };

    // Add greeting message
    const greetingMessage = this.createBotMessage(
      this.getRandomResponse('greeting', language),
      session.language
    );
    
    session.messages.push(greetingMessage);
    this.sessions.set(sessionId, session);
    
    return session;
  }

  /**
   * Send a message and get response
   */
  async sendMessage(
    sessionId: string, 
    userMessage: string, 
    isVoiceCommand: boolean = false
  ): Promise<EmotyBotMessage> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Add user message to session
    const userMsg = this.createUserMessage(userMessage, session.language, isVoiceCommand);
    session.messages.push(userMsg);
    session.context.stats.messagesCount++;
    
    // Analyze message context
    const context = this.analyzeMessage(userMessage, session);
    
    // Generate response
    const botResponse = await this.generateResponse(userMessage, context, session);
    
    // Add bot response to session
    session.messages.push(botResponse);
    session.lastActivity = new Date();
    
    // Update session context based on conversation
    this.updateSessionContext(session, context, botResponse);
    
    return botResponse;
  }

  /**
   * Analyze message to understand context and intent
   */
  private analyzeMessage(message: string, session: EmotyBotSession): MessageContext {
    const lowerMessage = message.toLowerCase();
    const recentMessages = session.messages.slice(-4);
    
    // Determine conversation flow
    let conversationFlow: MessageContext['conversationFlow'] = 'casual';
    
    if (this.isGreeting(lowerMessage)) {
      conversationFlow = 'greeting';
    } else if (this.isHelpRequest(lowerMessage)) {
      conversationFlow = 'help';
    } else if (this.isPatternRequest(lowerMessage)) {
      conversationFlow = 'pattern_request';
    } else if (this.isPatternFeedback(lowerMessage)) {
      conversationFlow = 'pattern_feedback';
    }

    // Extract theme and mood preferences
    const extractedTheme = this.extractTheme(lowerMessage, session.language);
    const extractedMood = this.extractMood(lowerMessage, session.language);
    const extractedSize = this.extractSize(lowerMessage);
    
    // Check if this is a follow-up to a previous pattern request
    const isFollowUp = recentMessages.some(msg => 
      msg.role === 'assistant' && msg.patterns && msg.patterns.length > 0
    );

    return {
      isFollowUp,
      previousTheme: extractedTheme,
      previousMood: extractedMood,
      previousSize: extractedSize,
      conversationFlow
    };
  }

  /**
   * Generate appropriate response based on context
   */
  private async generateResponse(
    userMessage: string, 
    context: MessageContext, 
    session: EmotyBotSession
  ): Promise<EmotyBotMessage> {
    const { language } = session;
    
    switch (context.conversationFlow) {
      case 'greeting':
        return this.createBotMessage(
          this.getRandomResponse('greeting', language),
          language
        );
        
      case 'help':
        return this.createBotMessage(
          this.getRandomResponse('help', language),
          language
        );
        
      case 'pattern_request':
        return await this.handlePatternRequest(userMessage, context, session);
        
      case 'pattern_feedback':
        return await this.handlePatternFeedback(userMessage, context, session);
        
      default:
        return await this.handleCasualConversation(userMessage, context, session);
    }
  }

  /**
   * Handle pattern generation requests
   */
  private async handlePatternRequest(
    userMessage: string, 
    context: MessageContext, 
    session: EmotyBotSession
  ): Promise<EmotyBotMessage> {
    try {
      // Build pattern generation request
      const request: PatternGenerationRequest = {
        userId: session.userId,
        userLevel: session.context.userLevel,
        language: session.language,
        theme: context.previousTheme,
        mood: context.previousMood,
        size: context.previousSize,
        customPrompt: this.extractCustomPrompt(userMessage),
        maxPatterns: 2
      };

      // Generate patterns
      const result = await patternGenerator.generatePatterns(request);
      
      let responseText: string;
      let patterns: GeneratedPattern[] = [];

      if (result.success && result.patterns) {
        responseText = this.getRandomResponse('patternSuccess', session.language);
        patterns = result.patterns;
        session.context.stats.patternsGenerated += patterns.length;
        
        // Add follow-up question
        responseText += '\n\n' + this.getRandomResponse('followUp', session.language);
      } else {
        responseText = this.getRandomResponse('patternError', session.language);
        patterns = result.fallback || [];
      }

      // Track token usage
      if (result.usage) {
        session.context.stats.tokensUsed += result.usage.totalTokens;
      }

      const message = this.createBotMessage(responseText, session.language);
      message.patterns = patterns;
      
      return message;

    } catch (error) {
      console.error('Pattern request error:', error);
      
      return this.createBotMessage(
        this.getRandomResponse('patternError', session.language),
        session.language
      );
    }
  }

  /**
   * Handle feedback on generated patterns
   */
  private async handlePatternFeedback(
    userMessage: string, 
    context: MessageContext, 
    session: EmotyBotSession
  ): Promise<EmotyBotMessage> {
    const lowerMessage = userMessage.toLowerCase();
    
    if (this.isPositiveFeedback(lowerMessage)) {
      return this.createBotMessage(
        "I'm so glad you like them! 😊 Would you like me to create more patterns with a similar style?",
        session.language
      );
    } else if (this.isNegativeFeedback(lowerMessage)) {
      return this.createBotMessage(
        "Let me try a different approach! What would you like me to change? 🎨",
        session.language
      );
    } else {
      // User wants modifications
      return await this.handlePatternRequest(userMessage, context, session);
    }
  }

  /**
   * Handle casual conversation
   */
  private async handleCasualConversation(
    userMessage: string, 
    context: MessageContext, 
    session: EmotyBotSession
  ): Promise<EmotyBotMessage> {
    const responses = [
      "That's interesting! How can I help you create some emoji patterns? 🎨",
      "I love chatting with you! Ready to make some beautiful patterns together? ✨",
      "Cool! Let's channel that creativity into some amazing emoji patterns! 🌟"
    ];

    return this.createBotMessage(
      responses[Math.floor(Math.random() * responses.length)],
      session.language
    );
  }

  /**
   * Create user message
   */
  private createUserMessage(
    content: string, 
    language: Language, 
    voiceCommand: boolean = false
  ): EmotyBotMessage {
    return {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date(),
      voiceCommand,
      language
    };
  }

  /**
   * Create bot message
   */
  private createBotMessage(content: string, language: Language): EmotyBotMessage {
    return {
      id: crypto.randomUUID(),
      role: 'assistant',
      content,
      timestamp: new Date(),
      voiceCommand: false,
      language
    };
  }

  /**
   * Update session context based on conversation
   */
  private updateSessionContext(
    session: EmotyBotSession, 
    context: MessageContext, 
    response: EmotyBotMessage
  ): void {
    if (context.previousTheme && !session.context.preferences.themes.includes(context.previousTheme)) {
      session.context.preferences.themes.push(context.previousTheme);
    }
    
    if (context.previousMood && !session.context.preferences.moods.includes(context.previousMood)) {
      session.context.preferences.moods.push(context.previousMood);
    }
  }

  /**
   * Get random response from array
   */
  private getRandomResponse(type: keyof typeof this.responses.en, language: Language): string {
    const responses = this.responses[language][type];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  // Message classification helpers
  private isGreeting(message: string): boolean {
    const greetings = ['hello', 'hi', 'hey', 'bonjour', 'salut'];
    return greetings.some(greeting => message.includes(greeting));
  }

  private isHelpRequest(message: string): boolean {
    const helpKeywords = ['help', 'how', 'what can', 'aide', 'comment'];
    return helpKeywords.some(keyword => message.includes(keyword));
  }

  private isPatternRequest(message: string): boolean {
    const patternKeywords = ['pattern', 'create', 'make', 'generate', 'motif', 'créer', 'faire', 'générer'];
    return patternKeywords.some(keyword => message.includes(keyword));
  }

  private isPatternFeedback(message: string): boolean {
    const feedbackKeywords = ['love', 'like', 'great', 'awesome', 'bad', 'don\'t like', 'aime', 'super', 'génial', 'pas bien'];
    return feedbackKeywords.some(keyword => message.includes(keyword));
  }

  private isPositiveFeedback(message: string): boolean {
    const positive = ['love', 'like', 'great', 'awesome', 'perfect', 'amazing', 'aime', 'super', 'génial', 'parfait'];
    return positive.some(word => message.includes(word));
  }

  private isNegativeFeedback(message: string): boolean {
    const negative = ['don\'t like', 'bad', 'terrible', 'ugly', 'wrong', 'aime pas', 'mauvais', 'terrible', 'laid'];
    return negative.some(word => message.includes(word));
  }

  // Content extraction helpers
  private extractTheme(message: string, language: Language): PatternTheme | undefined {
    const themes: Record<string, PatternTheme> = {
      nature: 'nature', forest: 'nature', ocean: 'nature', tree: 'nature',
      emotion: 'emotions', feeling: 'emotions', happy: 'emotions',
      food: 'food', eat: 'food', cooking: 'food',
      travel: 'travel', vacation: 'travel', trip: 'travel',
      animal: 'animals', pet: 'animals', cat: 'animals', dog: 'animals',
      tech: 'tech', computer: 'tech', robot: 'tech',
      sport: 'sports', game: 'sports', ball: 'sports'
    };

    for (const [key, theme] of Object.entries(themes)) {
      if (message.includes(key)) {
        return theme;
      }
    }
    
    return undefined;
  }

  private extractMood(message: string, language: Language): PatternMood | undefined {
    const moods: Record<string, PatternMood> = {
      happy: 'happy', joyful: 'happy', cheerful: 'happy',
      calm: 'calm', peaceful: 'peaceful', relaxed: 'calm',
      energetic: 'energetic', vibrant: 'energetic', dynamic: 'energetic',
      romantic: 'romantic', love: 'romantic', cute: 'romantic',
      mysterious: 'mysterious', dark: 'mysterious', secret: 'mysterious',
      playful: 'playful', fun: 'playful', silly: 'playful',
      elegant: 'elegant', sophisticated: 'elegant', classy: 'elegant',
      bold: 'bold', strong: 'bold', powerful: 'bold'
    };

    for (const [key, mood] of Object.entries(moods)) {
      if (message.includes(key)) {
        return mood;
      }
    }
    
    return undefined;
  }

  private extractSize(message: string): number | undefined {
    const sizeMatch = message.match(/(\d+)(?:x\d+)?/);
    if (sizeMatch) {
      const size = parseInt(sizeMatch[1]);
      return size >= 3 && size <= 12 ? size : undefined;
    }
    return undefined;
  }

  private extractCustomPrompt(message: string): string | undefined {
    // Remove common pattern keywords to isolate custom description
    const cleaned = message
      .replace(/(?:create|make|generate|pattern)/gi, '')
      .trim();
    
    return cleaned.length > 3 ? cleaned : undefined;
  }

  /**
   * Get session
   */
  getSession(sessionId: string): EmotyBotSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * End session
   */
  endSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  /**
   * Clean up old sessions (called periodically)
   */
  cleanupOldSessions(): void {
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // 30 minutes
    
    for (const [sessionId, session] of this.sessions) {
      if (now - session.lastActivity.getTime() > maxAge) {
        this.sessions.delete(sessionId);
      }
    }
  }
}

// Export singleton
export const emotyBot = new EmotyBotService();