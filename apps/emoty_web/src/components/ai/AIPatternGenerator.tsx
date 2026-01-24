'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { FeatureGate, useFeatureAccess } from '@/components/feature-gate';
import type { PatternSequence } from '@/db/types';

interface AIPatternGeneratorProps {
  onPatternGenerated?: (pattern: PatternSequence, name: string, explanation?: string) => void;
  onError?: (error: string) => void;
  className?: string;
  language?: 'en' | 'fr';
}

interface GenerationState {
  isGenerating: boolean;
  error: string | null;
  suggestions: Array<{
    pattern: PatternSequence;
    name: string;
    explanation: string;
    service: 'claude' | 'local';
  }>;
  currentIndex: number;
}

const EXAMPLE_PROMPTS = {
  en: [
    'A peaceful garden with flowers',
    'Ocean waves on a sunny beach',
    'Cosmic stars and planets',
    'Delicious food party',
    'Cute animals playing',
    'Technology and gadgets',
    'Colorful rainbow celebration',
    'Winter wonderland scene',
  ],
  fr: [
    'Un jardin paisible avec des fleurs',
    'Vagues océan sur une plage ensoleillée',
    'Étoiles cosmiques et planètes',
    'Délicieuse fête de nourriture',
    'Animaux mignons qui jouent',
    'Technologie et gadgets',
    'Célébration arc-en-ciel coloré',
    'Scène de pays des merveilles hivernal',
  ],
};

const DIFFICULTY_OPTIONS = {
  en: {
    simple: { label: 'Simple', description: '2-3 emoji types, clear patterns' },
    medium: { label: 'Medium', description: '3-5 emoji types, interesting variation' },
    complex: { label: 'Complex', description: '4+ emoji types, intricate design' },
  },
  fr: {
    simple: { label: 'Simple', description: '2-3 types d\'emojis, motifs clairs' },
    medium: { label: 'Moyen', description: '3-5 types d\'emojis, variation intéressante' },
    complex: { label: 'Complexe', description: '4+ types d\'emojis, design complexe' },
  },
};

/**
 * AI Pattern Generator Component - Level 2+ Feature
 * Provides AI-powered pattern generation with fallback to local service
 */
export function AIPatternGenerator({ 
  onPatternGenerated, 
  onError,
  className = '',
  language = 'en'
}: AIPatternGeneratorProps) {
  const { data: session } = useSession();
  const featureAccess = useFeatureAccess('ai_pattern_generation');
  
  const [prompt, setPrompt] = useState('');
  const [difficulty, setDifficulty] = useState<'simple' | 'medium' | 'complex'>('medium');
  const [size, setSize] = useState(5);
  const [generationState, setGenerationState] = useState<GenerationState>({
    isGenerating: false,
    error: null,
    suggestions: [],
    currentIndex: 0,
  });
  const [usageStats, setUsageStats] = useState({
    requestsRemaining: 0,
    tokensRemaining: 0,
    dailyCost: 0,
  });

  // Load usage statistics
  const loadUsageStats = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      const response = await fetch(`/api/ai/usage/${session.user.id}`);
      if (response.ok) {
        const stats = await response.json();
        setUsageStats(stats);
      }
    } catch (error) {
      console.error('Failed to load usage stats:', error);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    loadUsageStats();
  }, [loadUsageStats]);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || !session?.user) return;

    setGenerationState(prev => ({
      ...prev,
      isGenerating: true,
      error: null,
      suggestions: [],
    }));

    try {
      const response = await fetch('/api/ai/generate-pattern', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          difficulty,
          size,
          language,
          userId: session.user.id,
          userLevel: session.user.userLevel,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Pattern generation failed');
      }

      if (data.success && data.data) {
        const suggestion = {
          pattern: data.data,
          name: data.name || 'AI Generated Pattern',
          explanation: data.explanation || '',
          service: data.service,
        };

        setGenerationState(prev => ({
          ...prev,
          isGenerating: false,
          suggestions: [suggestion],
          currentIndex: 0,
        }));

        // Update usage stats
        await loadUsageStats();

        // Notify parent component
        onPatternGenerated?.(suggestion.pattern, suggestion.name, suggestion.explanation);
      } else {
        throw new Error(data.error || 'Pattern generation failed');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setGenerationState(prev => ({
        ...prev,
        isGenerating: false,
        error: errorMessage,
      }));
      onError?.(errorMessage);
    }
  }, [prompt, difficulty, size, language, session?.user, onPatternGenerated, onError, loadUsageStats]);

  const handleExampleClick = useCallback((examplePrompt: string) => {
    setPrompt(examplePrompt);
    setGenerationState(prev => ({
      ...prev,
      error: null,
    }));
  }, []);

  const handleRegenerateNames = useCallback(async () => {
    const currentSuggestion = generationState.suggestions[generationState.currentIndex];
    if (!currentSuggestion || !session?.user) return;

    try {
      const response = await fetch('/api/ai/generate-names', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pattern: currentSuggestion.pattern,
          language,
          style: 'creative',
          userId: session.user.id,
          userLevel: session.user.userLevel,
        }),
      });

      const data = await response.json();
      if (data.success && data.names?.length > 0) {
        // Update current suggestion with new name
        const newName = data.names[0];
        setGenerationState(prev => ({
          ...prev,
          suggestions: prev.suggestions.map((suggestion, index) => 
            index === prev.currentIndex 
              ? { ...suggestion, name: newName }
              : suggestion
          ),
        }));

        // Notify parent component
        onPatternGenerated?.(currentSuggestion.pattern, newName, currentSuggestion.explanation);
      }
    } catch (error) {
      console.error('Name generation failed:', error);
    }
  }, [generationState, language, session?.user, onPatternGenerated]);

  const currentSuggestion = generationState.suggestions[generationState.currentIndex];
  const canGenerate = prompt.trim().length >= 3 && !generationState.isGenerating;
  const hasReachedLimit = usageStats.requestsRemaining <= 0;

  return (
    <FeatureGate 
      feature="ai_pattern_generation" 
      className={className}
      showUpgrade={true}
    >
      <div className="ai-pattern-generator">
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5 className="mb-0">
              <i className="bi bi-magic me-2"></i>
              {language === 'en' ? 'AI Pattern Generator' : 'Générateur de Motifs IA'}
            </h5>
            <div className="small text-muted">
              {language === 'en' ? 'Level 2+ Feature' : 'Fonctionnalité Niveau 2+'}
            </div>
          </div>

          <div className="card-body">
            {/* Usage Statistics */}
            {featureAccess.hasAccess && (
              <div className="row mb-3">
                <div className="col-md-4">
                  <div className="small text-muted">
                    {language === 'en' ? 'Requests Remaining' : 'Requêtes Restantes'}
                  </div>
                  <div className="fw-bold">{usageStats.requestsRemaining}</div>
                </div>
                <div className="col-md-4">
                  <div className="small text-muted">
                    {language === 'en' ? 'Tokens Remaining' : 'Tokens Restants'}
                  </div>
                  <div className="fw-bold">{usageStats.tokensRemaining}</div>
                </div>
                <div className="col-md-4">
                  <div className="small text-muted">
                    {language === 'en' ? 'Daily Cost' : 'Coût Quotidien'}
                  </div>
                  <div className="fw-bold">${usageStats.dailyCost.toFixed(3)}</div>
                </div>
              </div>
            )}

            {/* Pattern Prompt Input */}
            <div className="mb-3">
              <label htmlFor="ai-prompt" className="form-label">
                {language === 'en' ? 'Describe your pattern:' : 'Décrivez votre motif:'}
              </label>
              <textarea
                id="ai-prompt"
                className="form-control"
                rows={3}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={language === 'en' 
                  ? 'e.g., "A peaceful garden with colorful flowers and butterflies"'
                  : 'ex. "Un jardin paisible avec des fleurs colorées et des papillons"'
                }
                maxLength={500}
                disabled={generationState.isGenerating || hasReachedLimit}
              />
              <div className="form-text">
                {prompt.length}/500 • {language === 'en' 
                  ? 'Minimum 3 characters' 
                  : 'Minimum 3 caractères'
                }
              </div>
            </div>

            {/* Example Prompts */}
            <div className="mb-3">
              <div className="small text-muted mb-2">
                {language === 'en' ? 'Example ideas:' : 'Idées d\'exemples:'}
              </div>
              <div className="d-flex flex-wrap gap-2">
                {EXAMPLE_PROMPTS[language].slice(0, 4).map((example, index) => (
                  <button
                    key={index}
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => handleExampleClick(example)}
                    disabled={generationState.isGenerating}
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>

            {/* Generation Options */}
            <div className="row mb-3">
              <div className="col-md-6">
                <label htmlFor="difficulty" className="form-label">
                  {language === 'en' ? 'Difficulty:' : 'Difficulté:'}
                </label>
                <select
                  id="difficulty"
                  className="form-select"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as any)}
                  disabled={generationState.isGenerating}
                >
                  {Object.entries(DIFFICULTY_OPTIONS[language]).map(([key, option]) => (
                    <option key={key} value={key}>
                      {option.label} - {option.description}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-6">
                <label htmlFor="size" className="form-label">
                  {language === 'en' ? 'Pattern Size:' : 'Taille du Motif:'}
                </label>
                <select
                  id="size"
                  className="form-select"
                  value={size}
                  onChange={(e) => setSize(parseInt(e.target.value))}
                  disabled={generationState.isGenerating}
                >
                  <option value={3}>3×3 (Small / Petit)</option>
                  <option value={5}>5×5 (Medium / Moyen)</option>
                  <option value={7}>7×7 (Large / Grand)</option>
                </select>
              </div>
            </div>

            {/* Generate Button */}
            <div className="d-grid mb-3">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleGenerate}
                disabled={!canGenerate || hasReachedLimit}
              >
                {generationState.isGenerating && (
                  <span className="spinner-border spinner-border-sm me-2" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </span>
                )}
                <i className="bi bi-magic me-2"></i>
                {language === 'en' 
                  ? (generationState.isGenerating ? 'Generating...' : 'Generate Pattern')
                  : (generationState.isGenerating ? 'Génération...' : 'Générer le Motif')
                }
              </button>
            </div>

            {/* Rate Limit Warning */}
            {hasReachedLimit && (
              <div className="alert alert-warning">
                <i className="bi bi-exclamation-triangle me-2"></i>
                {language === 'en'
                  ? 'You have reached your daily AI generation limit. Limits reset at midnight.'
                  : 'Vous avez atteint votre limite quotidienne de génération IA. Les limites se réinitialisent à minuit.'
                }
              </div>
            )}

            {/* Error Display */}
            {generationState.error && (
              <div className="alert alert-danger">
                <i className="bi bi-exclamation-circle me-2"></i>
                {generationState.error}
              </div>
            )}

            {/* Generated Pattern Info */}
            {currentSuggestion && (
              <div className="card mt-3">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <h6 className="card-title mb-0">{currentSuggestion.name}</h6>
                    <div className="d-flex gap-2">
                      <span className={`badge ${currentSuggestion.service === 'claude' ? 'bg-primary' : 'bg-secondary'}`}>
                        {currentSuggestion.service === 'claude' ? 'Claude AI' : 'Local AI'}
                      </span>
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm"
                        onClick={handleRegenerateNames}
                        title={language === 'en' ? 'Generate new name' : 'Générer un nouveau nom'}
                      >
                        <i className="bi bi-arrow-clockwise"></i>
                      </button>
                    </div>
                  </div>
                  {currentSuggestion.explanation && (
                    <p className="card-text small text-muted mb-0">
                      {currentSuggestion.explanation}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* AI Disclaimer */}
            <div className="mt-3 small text-muted">
              <i className="bi bi-info-circle me-1"></i>
              {language === 'en'
                ? 'AI-generated patterns are suggestions. Results may vary and fallback to local generation if needed.'
                : 'Les motifs générés par IA sont des suggestions. Les résultats peuvent varier et basculer vers la génération locale si nécessaire.'
              }
            </div>
          </div>
        </div>
      </div>
    </FeatureGate>
  );
}

export default AIPatternGenerator;