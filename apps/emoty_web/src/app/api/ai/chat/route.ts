import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { aiSafety } from '@/lib/ai/ai-safety';
import { ProgressionEngine } from '@/lib/progression-engine';
import type { UserLevel } from '@/db/types';

interface ChatRequest {
  message: string;
  sessionId: string;
  language?: 'en' | 'fr';
  userId: string;
  userLevel: UserLevel;
}

interface ChatResponse {
  success: boolean;
  response?: string;
  suggestions?: string[];
  error?: string;
  service: 'local';
  rateLimitRemaining: number;
}

/**
 * EmotyBot Chat API - Level 3+ Feature
 * Provides conversational assistance using local knowledge base
 * Note: This is implemented as a local service for child safety and privacy
 */

// Local knowledge base for EmotyBot responses
const CHAT_RESPONSES = {
  en: {
    greeting: [
      "Hello! I'm EmotyBot, your friendly pattern creation assistant! 🎨",
      "Hi there! Ready to create some amazing emoji patterns? ✨",
      "Welcome! I'm here to help you with all things emoji patterns! 🌟",
    ],
    help: {
      pattern_ideas: [
        "Here are some great pattern ideas: Try a nature theme with 🌸🌿🦋, or maybe a space theme with ⭐🌙🚀! You could also create food patterns with 🍎🍊🍌.",
        "For beginners, I recommend starting simple: pick 2-3 emojis that go well together, like 💖💕💗 for hearts or 🌊🐠🏖️ for ocean themes.",
        "Want something fun? Try seasonal patterns! Spring: 🌸🦋🌱, Summer: ☀️🏖️🍉, Fall: 🍁🎃🌰, Winter: ❄️☃️🎿",
      ],
      emoji_combinations: [
        "Great emoji combinations include: Colors (❤️🧡💛💚💙), Nature (🌳🌸🦋🐝), Space (⭐🌙🪐🚀), and Food groups (🍎🥕🥖🧀).",
        "Try matching emojis by theme, color, or feeling! Like happy faces (😊😍🥰), or cool colors (💙💚💜🖤).",
        "Pro tip: Use emojis that tell a story together, like 🌱➡️🌿➡️🌳 for growth, or 🌅➡️☀️➡️🌇 for a day's journey!",
      ],
      advanced_features: [
        "As you level up, you'll unlock amazing features! Level 2 gets AI pattern generation, Level 3 unlocks me (EmotyBot), and Level 4 has advanced tools!",
        "AI features help generate patterns from descriptions like 'peaceful garden' or 'cosmic adventure'. The AI suggests emojis and arrangements!",
        "Voice commands let you create patterns hands-free! Just say what you want and I'll help guide the process.",
      ],
      accessibility: [
        "Emoty is designed for everyone! We support screen readers, high contrast mode, large text, and voice commands.",
        "Use Tab key to navigate, Enter to select, and arrow keys to move around patterns. All features work without a mouse!",
        "Turn on high contrast mode in settings for better visibility, or enable voice commands for hands-free creation.",
      ],
    },
    tips: [
      "Start with simple 3x3 patterns to learn the basics, then grow to 5x5 or larger! 📏",
      "Use the palette carousel to find emojis that work well together! 🎨",
      "Save your favorite patterns to build a collection over time! 💾",
      "Share patterns with friends using the share feature! 🤝",
      "Try different difficulty levels - simple patterns are perfect for beginners! ⭐",
      "Experiment with symmetrical vs asymmetrical designs! ⚖️",
    ],
    encouragement: [
      "You're doing great! Every pattern you create is unique and special! 🌟",
      "Keep experimenting - that's how you discover amazing combinations! 🔬",
      "Remember, there's no wrong way to be creative! 🎨",
      "I love seeing what patterns you come up with! 💖",
    ],
    fallback: [
      "That's an interesting question! I'm still learning, but I'd love to help with pattern creation! 🤔",
      "I might not know everything, but I'm great at helping with emoji patterns! What would you like to create? 🎨",
      "Hmm, I'm not sure about that specific topic, but I can definitely help with pattern ideas and tips! 💡",
    ],
  },
  fr: {
    greeting: [
      "Bonjour ! Je suis EmotyBot, votre assistant amical pour la création de motifs ! 🎨",
      "Salut ! Prêt à créer d'incroyables motifs d'emojis ? ✨",
      "Bienvenue ! Je suis là pour vous aider avec tout ce qui concerne les motifs d'emojis ! 🌟",
    ],
    help: {
      pattern_ideas: [
        "Voici quelques excellentes idées de motifs : Essayez un thème nature avec 🌸🌿🦋, ou peut-être un thème spatial avec ⭐🌙🚀 ! Vous pourriez aussi créer des motifs alimentaires avec 🍎🍊🍌.",
        "Pour les débutants, je recommande de commencer simplement : choisissez 2-3 emojis qui vont bien ensemble, comme 💖💕💗 pour les cœurs ou 🌊🐠🏖️ pour les thèmes océaniques.",
        "Vous voulez quelque chose d'amusant ? Essayez les motifs saisonniers ! Printemps : 🌸🦋🌱, Été : ☀️🏖️🍉, Automne : 🍁🎃🌰, Hiver : ❄️☃️🎿",
      ],
      emoji_combinations: [
        "De bonnes combinaisons d'emojis incluent : Couleurs (❤️🧡💛💚💙), Nature (🌳🌸🦋🐝), Espace (⭐🌙🪐🚀), et groupes alimentaires (🍎🥕🥖🧀).",
        "Essayez d'associer les emojis par thème, couleur ou sentiment ! Comme les visages heureux (😊😍🥰), ou les couleurs froides (💙💚💜🖤).",
        "Astuce pro : Utilisez des emojis qui racontent une histoire ensemble, comme 🌱➡️🌿➡️🌳 pour la croissance, ou 🌅➡️☀️➡️🌇 pour le voyage d'une journée !",
      ],
      advanced_features: [
        "En montant de niveau, vous débloquerez des fonctionnalités incroyables ! Le niveau 2 obtient la génération de motifs IA, le niveau 3 me débloque (EmotyBot), et le niveau 4 a des outils avancés !",
        "Les fonctionnalités IA aident à générer des motifs à partir de descriptions comme 'jardin paisible' ou 'aventure cosmique'. L'IA suggère des emojis et des arrangements !",
        "Les commandes vocales vous permettent de créer des motifs sans les mains ! Dites simplement ce que vous voulez et je vous aiderai à guider le processus.",
      ],
      accessibility: [
        "Emoty est conçu pour tout le monde ! Nous supportons les lecteurs d'écran, le mode contraste élevé, le texte large et les commandes vocales.",
        "Utilisez la touche Tab pour naviguer, Entrée pour sélectionner, et les flèches pour vous déplacer dans les motifs. Toutes les fonctionnalités marchent sans souris !",
        "Activez le mode contraste élevé dans les paramètres pour une meilleure visibilité, ou activez les commandes vocales pour une création sans les mains.",
      ],
    },
    tips: [
      "Commencez avec des motifs 3x3 simples pour apprendre les bases, puis grandissez vers 5x5 ou plus grand ! 📏",
      "Utilisez le carrousel de palettes pour trouver des emojis qui fonctionnent bien ensemble ! 🎨",
      "Sauvegardez vos motifs favoris pour construire une collection au fil du temps ! 💾",
      "Partagez des motifs avec des amis en utilisant la fonction de partage ! 🤝",
      "Essayez différents niveaux de difficulté - les motifs simples sont parfaits pour les débutants ! ⭐",
      "Expérimentez avec des designs symétriques vs asymétriques ! ⚖️",
    ],
    encouragement: [
      "Vous vous débrouillez très bien ! Chaque motif que vous créez est unique et spécial ! 🌟",
      "Continuez à expérimenter - c'est comme ça qu'on découvre d'incroyables combinaisons ! 🔬",
      "Rappelez-vous, il n'y a pas de mauvaise façon d'être créatif ! 🎨",
      "J'adore voir les motifs que vous créez ! 💖",
    ],
    fallback: [
      "C'est une question intéressante ! J'apprends encore, mais j'adorerais aider avec la création de motifs ! 🤔",
      "Je ne connais peut-être pas tout, mais je suis excellent pour aider avec les motifs d'emojis ! Que voudriez-vous créer ? 🎨",
      "Hmm, je ne suis pas sûr de ce sujet spécifique, mais je peux définitivement aider avec des idées de motifs et des conseils ! 💡",
    ],
  },
};

export async function POST(request: NextRequest) {
  try {
    // Get session and verify authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse request body
    const body: ChatRequest = await request.json();
    const { message, sessionId, language = 'en', userId, userLevel } = body;

    // Verify user ID matches session
    if (userId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'User ID mismatch' },
        { status: 403 }
      );
    }

    // Check if user can access EmotyBot chat (Level 3+)
    if (!ProgressionEngine.canAccessFeature(userLevel, 'emoty_bot_chat')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'EmotyBot chat requires Advanced level or higher' 
        },
        { status: 403 }
      );
    }

    // Validate input
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Valid message is required' },
        { status: 400 }
      );
    }

    if (message.length > 500) {
      return NextResponse.json(
        { success: false, error: 'Message too long (max 500 characters)' },
        { status: 400 }
      );
    }

    // Content safety filtering
    const contentFilter = aiSafety.filterContent(message, { userId });
    if (!contentFilter.isAllowed) {
      return NextResponse.json(
        { 
          success: false, 
          error: contentFilter.reason,
          severity: contentFilter.severity 
        },
        { status: 400 }
      );
    }

    // Check COPPA compliance
    const coppaCheck = await aiSafety.checkCOPPACompliance(userId);
    if (!coppaCheck.compliant) {
      return NextResponse.json(
        { 
          success: false, 
          error: coppaCheck.reason,
          requiredActions: coppaCheck.requiredActions 
        },
        { status: 403 }
      );
    }

    // Generate response using local knowledge base
    const response = generateLocalChatResponse(message.toLowerCase(), language);
    
    // Sanitize the response
    const { sanitized: sanitizedResponse } = aiSafety.sanitizeOutput(response, { userId });

    // Track user interaction
    await ProgressionEngine.trackAction(userId, 'use_emoty_bot', {
      messageLength: message.length,
      language,
      sessionId,
    });

    // Return response
    const chatResponse: ChatResponse = {
      success: true,
      response: sanitizedResponse,
      suggestions: generateSuggestions(message.toLowerCase(), language),
      service: 'local',
      rateLimitRemaining: 100, // EmotyBot has higher limits since it's local
    };

    return NextResponse.json(chatResponse);

  } catch (error) {
    console.error('Chat API error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        service: 'local',
        rateLimitRemaining: 0,
      },
      { status: 500 }
    );
  }
}

function generateLocalChatResponse(message: string, language: 'en' | 'fr'): string {
  const responses = CHAT_RESPONSES[language];
  
  // Greeting patterns
  if (/^(hi|hello|hey|bonjour|salut|coucou)/i.test(message)) {
    return getRandomItem(responses.greeting);
  }

  // Help patterns
  if (/(help|pattern.*idea|idea|inspire|créer|idée)/i.test(message)) {
    return getRandomItem(responses.help.pattern_ideas);
  }

  if (/(emoji.*together|combination|combiner|ensemble)/i.test(message)) {
    return getRandomItem(responses.help.emoji_combinations);
  }

  if (/(level|unlock|débloquer|fonctionnalité|feature)/i.test(message)) {
    return getRandomItem(responses.help.advanced_features);
  }

  if (/(accessibility|screen reader|voice|accessibilité|vocal)/i.test(message)) {
    return getRandomItem(responses.help.accessibility);
  }

  // Tips and encouragement
  if (/(tip|advice|conseil|aide)/i.test(message)) {
    return getRandomItem(responses.tips);
  }

  if (/(good|great|awesome|bien|super|génial|thank)/i.test(message)) {
    return getRandomItem(responses.encouragement);
  }

  // Difficulty and complexity questions
  if (/(difficult|hard|complex|difficile|compliqué)/i.test(message)) {
    return language === 'en' 
      ? "Don't worry! Start with simple 3x3 patterns using just 2-3 emoji types. As you get comfortable, try medium difficulty with 4-5 types, then work up to complex patterns! Practice makes perfect! 🌟"
      : "Ne vous inquiétez pas ! Commencez avec des motifs 3x3 simples utilisant seulement 2-3 types d'emojis. Une fois à l'aise, essayez la difficulté moyenne avec 4-5 types, puis progressez vers des motifs complexes ! C'est en forgeant qu'on devient forgeron ! 🌟";
  }

  // Color and theme questions
  if (/(color|theme|couleur|thème)/i.test(message)) {
    return language === 'en'
      ? "Colors and themes make patterns beautiful! Try grouping by color families (all blues 💙🔵🌀, all warm colors ❤️🧡💛), or by themes like nature 🌸🌿🦋, food 🍎🥕🧀, or celebrations 🎉🎈🎊!"
      : "Les couleurs et thèmes rendent les motifs magnifiques ! Essayez de grouper par familles de couleurs (tous les bleus 💙🔵🌀, toutes les couleurs chaudes ❤️🧡💛), ou par thèmes comme la nature 🌸🌿🦋, la nourriture 🍎🥕🧀, ou les célébrations 🎉🎈🎊 !";
  }

  // Voice commands
  if (/(voice|speak|talk|vocal|parler)/i.test(message)) {
    return language === 'en'
      ? "Voice commands are amazing! Once unlocked, you can say things like 'Create a nature pattern' or 'Make it bigger' and I'll help guide you through the process. It's perfect for hands-free creativity! 🎤"
      : "Les commandes vocales sont incroyables ! Une fois débloquées, vous pouvez dire des choses comme 'Créer un motif nature' ou 'Agrandir' et je vous aiderai à guider le processus. C'est parfait pour la créativité mains libres ! 🎤";
  }

  // Sharing and social
  if (/(share|friend|family|social|partager|ami)/i.test(message)) {
    return language === 'en'
      ? "Sharing patterns is so much fun! Use the share button to send your creations to friends and family. They can view your patterns even without the app, and maybe get inspired to create their own! 🤝✨"
      : "Partager des motifs c'est si amusant ! Utilisez le bouton partager pour envoyer vos créations à vos amis et famille. Ils peuvent voir vos motifs même sans l'app, et peut-être s'inspirer pour créer les leurs ! 🤝✨";
  }

  // Default fallback responses
  return getRandomItem(responses.fallback);
}

function generateSuggestions(message: string, language: 'en' | 'fr'): string[] {
  const suggestions = language === 'en' 
    ? [
        "Show me pattern tips",
        "How do I make complex patterns?",
        "What emojis work well together?",
        "Help me unlock new levels",
      ]
    : [
        "Montrez-moi des conseils de motifs",
        "Comment faire des motifs complexes ?",
        "Quels emojis fonctionnent bien ensemble ?",
        "Aidez-moi à débloquer de nouveaux niveaux",
      ];

  // Return 2-3 relevant suggestions based on the message
  return suggestions.slice(0, 3);
}

function getRandomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export async function GET(request: NextRequest) {
  return NextResponse.json(
    { 
      success: false, 
      error: 'Method not allowed. Use POST to chat with EmotyBot.' 
    },
    { status: 405 }
  );
}