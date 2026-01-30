import { useState, useEffect, useCallback, useRef } from 'react';

// Simple emoji map for voice commands
// In a real app, this would be more comprehensive or dynamic
const EMOJI_MAP: Record<string, string> = {
  // English
  'heart': '❤️', 'love': '❤️',
  'sun': '☀️', 'sunny': '☀️',
  'moon': '🌙',
  'star': '⭐', 'stars': '⭐',
  'fire': '🔥', 'hot': '🔥',
  'water': '💧', 'rain': '💧',
  'tree': '🌲', 'forest': '🌲',
  'flower': '🌸', 'flowers': '🌸',
  'pizza': '🍕',
  'cat': '🐱', 'kitten': '🐱',
  'dog': '🐶', 'puppy': '🐶',
  'smile': '😀', 'happy': '😀',
  'sad': '😢', 'cry': '😢',
  'cool': '😎',
  'thumbs up': '👍', 'like': '👍',
  'thumbs down': '👎', 'dislike': '👎',
  'rainbow': '🌈',
  
  // French
  'cœur': '❤️', 'amour': '❤️',
  'soleil': '☀️',
  'lune': '🌙',
  'étoile': '⭐',
  'feu': '🔥', 'chaud': '🔥',
  'eau': '💧', 'pluie': '💧',
  'arbre': '🌲', 'forêt': '🌲',
  'fleur': '🌸',
  'chat': '🐱', 'minou': '🐱',
  'chien': '🐶', 'chiot': '🐶',
  'sourire': '😀', 'heureux': '😀',
  'triste': '😢', 'pleure': '😢',
  'pouce haut': '👍', 'aime': '👍',
  'pouce bas': '👎',
  'arc-en-ciel': '🌈'
};

interface UseVoiceCommandsProps {
  language: 'en' | 'fr';
  onAddEmoji: (emoji: string) => void;
  onRemoveLast: () => void;
  onClear: () => void;
  onUndo: () => void;
  onRedo: () => void;
}

export const useVoiceCommands = ({
  language,
  onAddEmoji,
  onRemoveLast,
  onClear,
  onUndo,
  onRedo
}: UseVoiceCommandsProps) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const findAndAddEmoji = useCallback((name: string) => {
    // Clean up name (remove 'a', 'the', 'un', 'une')
    const cleanName = name.replace(/^(a|an|the|un|une|le|la)\s+/i, '');
    
    // Check map
    const mappedEmoji = EMOJI_MAP[cleanName] || EMOJI_MAP[name]; // Try both
    
    if (mappedEmoji) {
      onAddEmoji(mappedEmoji);
      setFeedback(`Added ${mappedEmoji}`);
    } else {
      setFeedback(language === 'fr' ? `Emoji inconnu: ${cleanName}` : `Unknown emoji: ${cleanName}`);
    }
  }, [language, onAddEmoji]);

  const processCommand = useCallback((text: string) => {
    // English Commands
    if (language === 'en') {
      if (text.includes('remove') || text.includes('delete')) {
        onRemoveLast();
        setFeedback('Removed last emoji');
        return;
      }
      if (text.includes('clear') || text.includes('reset')) {
        onClear();
        setFeedback('Cleared pattern');
        return;
      }
      if (text.includes('undo')) {
        onUndo();
        setFeedback('Undoing');
        return;
      }
      if (text.includes('redo')) {
        onRedo();
        setFeedback('Redoing');
        return;
      }
      
      // Add [Emoji]
      const addMatch = text.match(/(?:add|plus|insert)\s+(.+)/i);
      if (addMatch) {
        const target = addMatch[1].trim();
        findAndAddEmoji(target);
        return;
      }
      
      // Direct emoji naming (fallback)
      findAndAddEmoji(text);
    } 
    // French Commands
    else {
      if (text.includes('supprimer') || text.includes('effacer')) {
        onRemoveLast();
        setFeedback('Dernier emoji supprimé');
        return;
      }
      if (text.includes('vider') || text.includes('reset')) {
        onClear();
        setFeedback('Motif effacé');
        return;
      }
      if (text.includes('annuler') || text.includes('retour')) {
        onUndo();
        setFeedback('Annulation');
        return;
      }
      
      // Ajouter [Emoji]
      const addMatch = text.match(/(?:ajouter|ajoute|plus|mettre)\s+(.+)/i);
      if (addMatch) {
        const target = addMatch[1].trim();
        findAndAddEmoji(target);
        return;
      }

      findAndAddEmoji(text);
    }
  }, [language, onRemoveLast, onClear, onUndo, onRedo, findAndAddEmoji]);

  // Initialize SpeechRecognition
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Speech recognition not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true; // Keep listening
    recognition.interimResults = false;
    recognition.lang = language === 'fr' ? 'fr-FR' : 'en-US';

    recognition.onstart = () => {
      if (isMounted.current) {
        setIsListening(true);
        setError(null);
        setFeedback(language === 'fr' ? 'Écoute...' : 'Listening...');
      }
    };

    recognition.onend = () => {
      if (isMounted.current) {
        setIsListening(false);
        setFeedback('');
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      if (isMounted.current) {
        setError(event.error);
        setIsListening(false);
      }
    };

    recognition.onresult = (event: any) => {
      const lastResult = event.results[event.results.length - 1];
      if (lastResult.isFinal) {
        const text = lastResult[0].transcript.trim().toLowerCase();
        setTranscript(text);
        processCommand(text);
      }
    };

    recognitionRef.current = recognition;
  }, [language, processCommand]); // Re-init if language changes or handlers change

  const toggleListening = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      try {
        recognitionRef.current?.start();
      } catch (e) {
        console.error(e);
      }
    }
  }, [isListening]);

  return {
    isListening,
    toggleListening,
    transcript,
    feedback,
    error
  };
};
