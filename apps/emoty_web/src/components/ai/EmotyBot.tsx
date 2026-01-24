'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { FeatureGate } from '@/components/feature-gate';

interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  typing?: boolean;
  error?: boolean;
}

interface EmotyBotProps {
  className?: string;
  language?: 'en' | 'fr';
  onSuggestionClick?: (suggestion: string) => void;
}

interface ChatState {
  messages: ChatMessage[];
  isTyping: boolean;
  inputValue: string;
  error: string | null;
  sessionId: string;
}

const WELCOME_MESSAGES = {
  en: {
    title: "👋 Hi! I'm EmotyBot!",
    message: "I'm here to help you create amazing emoji patterns! Ask me about pattern ideas, emoji combinations, or how to use different features. What would you like to create today?",
    suggestions: [
      "Help me create a nature pattern",
      "What emojis work well together?",
      "How do I make complex patterns?",
      "Show me pattern tips",
      "What's the difference between AI and local generation?"
    ]
  },
  fr: {
    title: "👋 Salut! Je suis EmotyBot!",
    message: "Je suis là pour vous aider à créer d'incroyables motifs d'emojis ! Demandez-moi des idées de motifs, des combinaisons d'emojis, ou comment utiliser différentes fonctionnalités. Que souhaitez-vous créer aujourd'hui ?",
    suggestions: [
      "Aidez-moi à créer un motif nature",
      "Quels emojis fonctionnent bien ensemble ?",
      "Comment faire des motifs complexes ?",
      "Montrez-moi des conseils de motifs",
      "Quelle est la différence entre IA et génération locale ?"
    ]
  }
};

const QUICK_SUGGESTIONS = {
  en: [
    "Pattern ideas for beginners",
    "How to use voice commands",
    "Accessibility features",
    "Export patterns",
    "Share with friends",
    "Unlock new levels"
  ],
  fr: [
    "Idées de motifs pour débutants",
    "Comment utiliser les commandes vocales",
    "Fonctionnalités d'accessibilité", 
    "Exporter des motifs",
    "Partager avec des amis",
    "Débloquer de nouveaux niveaux"
  ]
};

/**
 * EmotyBot Chat Assistant - Level 3+ Feature
 * Provides conversational help and guidance for pattern creation
 */
export function EmotyBot({ 
  className = '', 
  language = 'en',
  onSuggestionClick 
}: EmotyBotProps) {
  const { data: session } = useSession();
  const [chatState, setChatState] = useState<ChatState>({
    messages: [],
    isTyping: false,
    inputValue: '',
    error: null,
    sessionId: crypto.randomUUID(),
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize welcome message
  useEffect(() => {
    const welcomeMsg = WELCOME_MESSAGES[language];
    const welcomeMessage: ChatMessage = {
      id: 'welcome',
      content: welcomeMsg.message,
      role: 'assistant',
      timestamp: new Date(),
    };

    setChatState(prev => ({
      ...prev,
      messages: [welcomeMessage],
    }));
  }, [language]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatState.messages]);

  const handleSendMessage = useCallback(async (message?: string) => {
    const messageToSend = message || chatState.inputValue.trim();
    if (!messageToSend || !session?.user) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      content: messageToSend,
      role: 'user',
      timestamp: new Date(),
    };

    setChatState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      inputValue: '',
      isTyping: true,
      error: null,
    }));

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageToSend,
          sessionId: chatState.sessionId,
          language,
          userId: session.user.id,
          userLevel: session.user.userLevel,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Chat service unavailable');
      }

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        content: data.response || 'I\'m sorry, I couldn\'t process that request.',
        role: 'assistant',
        timestamp: new Date(),
      };

      setChatState(prev => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
        isTyping: false,
      }));

      // Handle suggestions if provided
      if (data.suggestions && onSuggestionClick) {
        // For now, we'll just log them - could be used to populate quick actions
        console.log('EmotyBot suggestions:', data.suggestions);
      }

    } catch (error) {
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        content: language === 'en' 
          ? "I'm sorry, I'm having trouble right now. Please try again later or use the local help system."
          : "Désolé, j'ai des difficultés en ce moment. Veuillez réessayer plus tard ou utiliser le système d'aide local.",
        role: 'assistant',
        timestamp: new Date(),
        error: true,
      };

      setChatState(prev => ({
        ...prev,
        messages: [...prev.messages, errorMessage],
        isTyping: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }, [chatState.inputValue, chatState.sessionId, language, session?.user, onSuggestionClick]);

  const handleSuggestionClick = useCallback((suggestion: string) => {
    handleSendMessage(suggestion);
  }, [handleSendMessage]);

  const handleInputKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  const formatTimestamp = useCallback((date: Date) => {
    return date.toLocaleTimeString(language === 'fr' ? 'fr-FR' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }, [language]);

  const renderMessage = useCallback((message: ChatMessage) => {
    const isUser = message.role === 'user';
    
    return (
      <div
        key={message.id}
        className={`d-flex mb-3 ${isUser ? 'justify-content-end' : 'justify-content-start'}`}
      >
        <div className={`d-flex ${isUser ? 'flex-row-reverse' : 'flex-row'} align-items-start max-width-75`}>
          {/* Avatar */}
          <div className={`flex-shrink-0 ${isUser ? 'ms-2' : 'me-2'}`}>
            {isUser ? (
              <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center" 
                   style={{ width: '32px', height: '32px', fontSize: '14px' }}>
                {session?.user?.username?.[0]?.toUpperCase() || 'U'}
              </div>
            ) : (
              <div className="bg-success text-white rounded-circle d-flex align-items-center justify-content-center"
                   style={{ width: '32px', height: '32px', fontSize: '16px' }}>
                🤖
              </div>
            )}
          </div>

          {/* Message Content */}
          <div className={`${isUser ? 'text-end' : 'text-start'} flex-grow-1`}>
            <div
              className={`p-2 rounded ${
                isUser
                  ? 'bg-primary text-white'
                  : message.error
                  ? 'bg-danger text-white'
                  : 'bg-light text-dark'
              }`}
              style={{ maxWidth: '100%' }}
            >
              {message.content}
            </div>
            <small className="text-muted d-block mt-1">
              {formatTimestamp(message.timestamp)}
            </small>
          </div>
        </div>
      </div>
    );
  }, [session?.user?.username, formatTimestamp]);

  return (
    <FeatureGate 
      feature="emoty_bot_chat" 
      className={className}
      showUpgrade={true}
    >
      <div className="emoty-bot-chat">
        <div className="card h-100">
          <div className="card-header bg-gradient" style={{ background: 'linear-gradient(135deg, #28a745, #20c997)' }}>
            <div className="d-flex align-items-center">
              <div className="me-3">
                <span style={{ fontSize: '24px' }}>🤖</span>
              </div>
              <div className="flex-grow-1">
                <h6 className="mb-0 text-white">{WELCOME_MESSAGES[language].title}</h6>
                <small className="text-white-50">
                  {language === 'en' ? 'Level 3+ Feature • Always here to help!' : 'Fonctionnalité Niveau 3+ • Toujours là pour aider!'}
                </small>
              </div>
              {chatState.isTyping && (
                <div className="text-white-50">
                  <div className="spinner-border spinner-border-sm" role="status">
                    <span className="visually-hidden">Typing...</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="card-body p-0 d-flex flex-column" style={{ height: '400px' }}>
            {/* Messages */}
            <div className="flex-grow-1 overflow-auto p-3" style={{ maxHeight: '300px' }}>
              {chatState.messages.map(renderMessage)}
              
              {/* Typing indicator */}
              {chatState.isTyping && (
                <div className="d-flex justify-content-start mb-3">
                  <div className="d-flex align-items-start">
                    <div className="me-2">
                      <div className="bg-success text-white rounded-circle d-flex align-items-center justify-content-center"
                           style={{ width: '32px', height: '32px', fontSize: '16px' }}>
                        🤖
                      </div>
                    </div>
                    <div className="bg-light p-2 rounded">
                      <div className="typing-indicator">
                        <span></span><span></span><span></span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestions */}
            {chatState.messages.length <= 1 && (
              <div className="px-3 pb-2">
                <div className="small text-muted mb-2">
                  {language === 'en' ? 'Quick suggestions:' : 'Suggestions rapides:'}
                </div>
                <div className="d-flex flex-wrap gap-1">
                  {WELCOME_MESSAGES[language].suggestions.slice(0, 3).map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      className="btn btn-outline-success btn-sm"
                      onClick={() => handleSuggestionClick(suggestion)}
                      disabled={chatState.isTyping}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="border-top p-3">
              <div className="input-group">
                <input
                  ref={inputRef}
                  type="text"
                  className="form-control"
                  placeholder={language === 'en' 
                    ? "Ask me anything about creating patterns..."
                    : "Demandez-moi tout sur la création de motifs..."
                  }
                  value={chatState.inputValue}
                  onChange={(e) => setChatState(prev => ({ ...prev, inputValue: e.target.value }))}
                  onKeyPress={handleInputKeyPress}
                  disabled={chatState.isTyping}
                  maxLength={500}
                />
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={() => handleSendMessage()}
                  disabled={!chatState.inputValue.trim() || chatState.isTyping}
                >
                  <i className="bi bi-send"></i>
                </button>
              </div>
              <div className="form-text">
                {chatState.inputValue.length}/500
              </div>
            </div>
          </div>
        </div>

        {/* Additional Quick Actions */}
        <div className="mt-2">
          <div className="d-flex flex-wrap gap-1">
            {QUICK_SUGGESTIONS[language].slice(0, 3).map((suggestion, index) => (
              <button
                key={index}
                type="button" 
                className="btn btn-outline-secondary btn-sm"
                onClick={() => handleSuggestionClick(suggestion)}
                disabled={chatState.isTyping}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        {/* Safety Notice */}
        <div className="mt-2 small text-muted">
          <i className="bi bi-shield-check me-1"></i>
          {language === 'en'
            ? 'EmotyBot is designed to be safe for all ages. Conversations are not stored permanently.'
            : 'EmotyBot est conçu pour être sûr pour tous les âges. Les conversations ne sont pas stockées de façon permanente.'
          }
        </div>
      </div>

      {/* CSS for typing indicator */}
      <style jsx>{`
        .typing-indicator {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .typing-indicator span {
          height: 6px;
          width: 6px;
          border-radius: 50%;
          background-color: #6c757d;
          opacity: 0.4;
          animation: typing 1.5s infinite ease-in-out;
        }
        .typing-indicator span:nth-child(1) {
          animation-delay: 0s;
        }
        .typing-indicator span:nth-child(2) {
          animation-delay: 0.2s;
        }
        .typing-indicator span:nth-child(3) {
          animation-delay: 0.4s;
        }
        @keyframes typing {
          0%, 60%, 100% {
            transform: initial;
            opacity: 0.4;
          }
          30% {
            transform: translateY(-4px);
            opacity: 1;
          }
        }
        .max-width-75 {
          max-width: 75%;
        }
      `}</style>
    </FeatureGate>
  );
}

export default EmotyBot;