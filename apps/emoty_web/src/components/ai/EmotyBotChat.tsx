'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useUser } from '@/contexts/user-context';
import { emotyBot } from '@/lib/ai/emotybot';
import { useVoiceCommands } from '@/lib/hooks/useVoiceCommands';
import type { EmotyBotSession, EmotyBotMessage, GeneratedPattern } from '@/types/ai';

interface EmotyBotChatProps {
  onPatternSelect?: (pattern: GeneratedPattern) => void;
  onClose?: () => void;
  className?: string;
}

export default function EmotyBotChat({ 
  onPatternSelect, 
  onClose,
  className = '' 
}: EmotyBotChatProps) {
  const { data: session } = useSession();
  const { user, actions } = useUser();
  const [chatSession, setChatSession] = useState<EmotyBotSession | null>(null);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Voice command handlers
  const voiceHandlers = {
    onGeneratePattern: (params: any) => {
      let message = 'Generate a pattern';
      if (params.theme) message += ` with ${params.theme} theme`;
      if (params.mood) message += ` that feels ${params.mood}`;
      if (params.customText) message += ` ${params.customText}`;
      
      setCurrentMessage(message);
      handleSendMessage(message, true);
    },
    onChangeTheme: (theme: string) => {
      handleSendMessage(`Change theme to ${theme}`, true);
    },
    onChangeMood: (mood: string) => {
      handleSendMessage(`Change mood to ${mood}`, true);
    },
    onHelp: () => {
      handleSendMessage('Help', true);
    }
  };

  const {
    isListening,
    isSupported: voiceSupported,
    toggleListening,
    error: voiceError
  } = useVoiceCommands(voiceHandlers);

  /**
   * Initialize chat session
   */
  useEffect(() => {
    if (session?.user?.id && user) {
      const initializeSession = async () => {
        try {
          const newSession = await emotyBot.startSession(
            session.user.id,
            user.userLevel,
            user.languagePreference || 'en'
          );
          setChatSession(newSession);
        } catch (error) {
          console.error('Failed to initialize EmotyBot session:', error);
        }
      };

      initializeSession();
    }

    return () => {
      // Cleanup on unmount
      if (chatSession) {
        emotyBot.endSession(chatSession.id);
      }
    };
  }, [session?.user?.id, user]);

  /**
   * Scroll to bottom of messages
   */
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [chatSession?.messages, scrollToBottom]);

  /**
   * Handle sending a message
   */
  const handleSendMessage = useCallback(async (
    message: string = currentMessage, 
    isVoice: boolean = false
  ) => {
    if (!chatSession || !message.trim() || isLoading) return;

    setIsLoading(true);
    
    try {
      const response = await emotyBot.sendMessage(chatSession.id, message.trim(), isVoice);
      
      // Update session state
      const updatedSession = emotyBot.getSession(chatSession.id);
      if (updatedSession) {
        setChatSession({ ...updatedSession });
      }

      if (!isVoice) {
        setCurrentMessage('');
      }

      // Track interaction
      actions.trackAction('ai_chat_message', {
        messageLength: message.length,
        hasPatterns: Boolean(response.patterns?.length),
        isVoiceCommand: isVoice
      });

    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsLoading(false);
    }
  }, [chatSession, currentMessage, isLoading, actions]);

  /**
   * Handle pattern selection
   */
  const handlePatternSelect = useCallback((pattern: GeneratedPattern) => {
    onPatternSelect?.(pattern);
    
    // Send feedback to bot
    if (chatSession) {
      handleSendMessage(`I like the "${pattern.name}" pattern!`);
    }
  }, [onPatternSelect, chatSession, handleSendMessage]);

  /**
   * Handle voice toggle
   */
  const handleVoiceToggle = useCallback(async () => {
    if (!voiceSupported) return;

    try {
      const success = await toggleListening({
        language: user?.languagePreference || 'en',
        continuous: false,
        interimResults: false
      });
      
      setIsVoiceMode(success && isListening);
    } catch (error) {
      console.error('Voice toggle error:', error);
    }
  }, [voiceSupported, toggleListening, isListening, user?.languagePreference]);

  /**
   * Handle keyboard events
   */
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  if (!chatSession) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
        <span className="ml-2 text-gray-600">Initializing EmotyBot...</span>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full bg-white rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
            <span className="text-white text-lg">🤖</span>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">EmotyBot</h3>
            <p className="text-sm text-gray-600">Your Pattern Assistant</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {voiceSupported && (
            <button
              onClick={handleVoiceToggle}
              className={`p-2 rounded-full transition-colors ${
                isListening 
                  ? 'bg-red-100 text-red-600 animate-pulse' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title={isListening ? 'Stop listening' : 'Start voice commands'}
              aria-label={isListening ? 'Stop voice recognition' : 'Start voice recognition'}
            >
              {isListening ? '🔴' : '🎤'}
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
              aria-label="Close chat"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-96">
        {chatSession.messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            onPatternSelect={handlePatternSelect}
          />
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl px-4 py-2 max-w-xs">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Voice Error */}
      {voiceError && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-200">
          <p className="text-sm text-red-600">
            Voice: {voiceError.message}
          </p>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t bg-gray-50">
        <div className="flex space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={currentMessage}
            onChange={(e) => setCurrentMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              isListening 
                ? "Listening for voice commands..." 
                : "Type your message or try voice commands..."
            }
            className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading || isListening}
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={isLoading || !currentMessage.trim() || isListening}
            className="px-6 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Send message"
          >
            {isLoading ? '...' : '→'}
          </button>
        </div>
        
        {voiceSupported && (
          <p className="text-xs text-gray-500 mt-2 text-center">
            Try voice commands like "Create a nature pattern" or "Make something happy"
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Message bubble component
 */
function MessageBubble({ 
  message, 
  onPatternSelect 
}: { 
  message: EmotyBotMessage; 
  onPatternSelect: (pattern: GeneratedPattern) => void;
}) {
  const isUser = message.role === 'user';
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-xs lg:max-w-md ${isUser ? 'order-2' : 'order-1'}`}>
        {/* Avatar */}
        <div className={`flex items-end space-x-2 ${isUser ? 'flex-row-reverse space-x-reverse' : 'flex-row'}`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
            isUser ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            {isUser ? '👤' : '🤖'}
          </div>
          
          {/* Message bubble */}
          <div className={`rounded-2xl px-4 py-2 ${
            isUser 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-100 text-gray-900'
          }`}>
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            
            {/* Voice command indicator */}
            {message.voiceCommand && (
              <div className="flex items-center mt-1 text-xs opacity-70">
                <span>🎤 Voice command</span>
              </div>
            )}
          </div>
        </div>

        {/* Patterns */}
        {message.patterns && message.patterns.length > 0 && (
          <div className="mt-3 space-y-2">
            {message.patterns.map((pattern, index) => (
              <PatternCard
                key={index}
                pattern={pattern}
                onSelect={() => onPatternSelect(pattern)}
              />
            ))}
          </div>
        )}

        {/* Timestamp */}
        <p className="text-xs text-gray-500 mt-1 px-2">
          {message.timestamp.toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}

/**
 * Pattern card component
 */
function PatternCard({ 
  pattern, 
  onSelect 
}: { 
  pattern: GeneratedPattern; 
  onSelect: () => void;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
         onClick={onSelect}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-sm text-gray-900">{pattern.name}</h4>
        <div className="flex items-center text-xs text-gray-500">
          {pattern.metadata.aiGenerated ? '🤖' : '✨'}
          <span className="ml-1">{pattern.difficulty}</span>
        </div>
      </div>
      
      {/* Pattern preview */}
      <div className="flex flex-wrap gap-1 mb-2">
        {pattern.sequence.slice(0, 8).map((emoji, index) => (
          <span key={index} className="text-lg">{emoji}</span>
        ))}
        {pattern.sequence.length > 8 && (
          <span className="text-gray-400">+{pattern.sequence.length - 8}</span>
        )}
      </div>
      
      <p className="text-xs text-gray-600 mb-2">{pattern.description}</p>
      
      {/* Tags */}
      <div className="flex flex-wrap gap-1">
        {pattern.tags.slice(0, 3).map((tag, index) => (
          <span key={index} className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">
            {tag}
          </span>
        ))}
      </div>
      
      <button className="w-full mt-2 text-sm text-blue-600 hover:text-blue-800 transition-colors">
        Use This Pattern →
      </button>
    </div>
  );
}