'use client';

import { useState, useEffect } from 'react';
import { useUser, useActionTracker } from '@/contexts/user-context';
import type { UserLevel } from '@/db/types';

interface TutorialStep {
  id: string;
  title: string;
  content: string;
  target?: string; // CSS selector for element to highlight
  position?: 'top' | 'bottom' | 'left' | 'right';
  action?: string; // Action to track when step is completed
}

interface TutorialConfig {
  id: string;
  title: string;
  description: string;
  userLevel: UserLevel;
  steps: TutorialStep[];
  required: boolean; // Whether tutorial is required for progression
}

// Tutorial configurations for different user levels
const TUTORIALS: TutorialConfig[] = [
  {
    id: 'beginner_basics',
    title: 'Welcome to Emoty!',
    description: 'Learn the basics of creating emoji patterns',
    userLevel: 'beginner',
    required: true,
    steps: [
      {
        id: 'welcome',
        title: 'Welcome to Emoty!',
        content: 'Create beautiful emoji patterns with our easy-to-use interface. Let\'s get started!',
      },
      {
        id: 'emoji_selection',
        title: 'Select Emojis',
        content: 'Click on emojis from the palette to add them to your pattern.',
        target: '.emoji-palette',
        position: 'top',
      },
      {
        id: 'pattern_preview',
        title: 'Preview Your Pattern',
        content: 'Watch your pattern come to life in the preview area as you select emojis.',
        target: '.pattern-preview',
        position: 'bottom',
      },
      {
        id: 'save_pattern',
        title: 'Save Your Creation',
        content: 'When you\'re happy with your pattern, click Save to add it to your collection.',
        target: '.save-button',
        position: 'left',
        action: 'complete_tutorial',
      },
    ],
  },
  {
    id: 'intermediate_ai',
    title: 'AI Pattern Generation',
    description: 'Discover how to create patterns with AI assistance',
    userLevel: 'intermediate',
    required: false,
    steps: [
      {
        id: 'ai_intro',
        title: 'Meet Your AI Assistant',
        content: 'AI can help you create unique patterns based on text descriptions.',
      },
      {
        id: 'ai_prompt',
        title: 'Describe Your Pattern',
        content: 'Type a description like "happy birthday celebration" and let AI create a pattern for you.',
        target: '.ai-prompt-input',
        position: 'top',
      },
      {
        id: 'ai_generation',
        title: 'Generate and Refine',
        content: 'Click Generate to create your pattern. You can generate multiple variations until you find the perfect one.',
        target: '.ai-generate-button',
        position: 'bottom',
        action: 'use_ai_generation',
      },
    ],
  },
  {
    id: 'advanced_voice',
    title: 'Voice Commands',
    description: 'Learn to control Emoty with your voice',
    userLevel: 'advanced',
    required: false,
    steps: [
      {
        id: 'voice_intro',
        title: 'Voice Control',
        content: 'Use voice commands to create patterns hands-free. Perfect for accessibility!',
      },
      {
        id: 'voice_activation',
        title: 'Activate Voice Mode',
        content: 'Click the microphone button or say "Hey Emoty" to start voice control.',
        target: '.voice-button',
        position: 'top',
      },
      {
        id: 'voice_commands',
        title: 'Try Voice Commands',
        content: 'Try saying: "Add happy emoji", "Create pattern", "Save pattern", or "Show me food emojis".',
        action: 'use_voice_command',
      },
    ],
  },
];

interface TutorialSystemProps {
  className?: string;
}

export function TutorialSystem({ className = '' }: TutorialSystemProps) {
  const { user } = useUser();
  const { trackAction } = useActionTracker();
  const [currentTutorial, setCurrentTutorial] = useState<TutorialConfig | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [completedTutorials, setCompletedTutorials] = useState<string[]>([]);

  // Load completed tutorials from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('emoty_completed_tutorials');
    if (saved) {
      setCompletedTutorials(JSON.parse(saved));
    }
  }, []);

  // Check if user needs tutorial when level changes
  useEffect(() => {
    if (!user) return;

    const availableTutorials = TUTORIALS.filter(
      tutorial => tutorial.userLevel === user.userLevel && 
      !completedTutorials.includes(tutorial.id)
    );

    // Show required tutorial first, then optional ones
    const nextTutorial = availableTutorials.find(t => t.required) || 
                         availableTutorials[0];

    if (nextTutorial && !currentTutorial) {
      setCurrentTutorial(nextTutorial);
      setCurrentStep(0);
      setIsVisible(true);
    }
  }, [user?.userLevel, completedTutorials, currentTutorial]);

  const handleNext = () => {
    if (!currentTutorial) return;

    const currentStepData = currentTutorial.steps[currentStep];
    
    // Track action if specified
    if (currentStepData.action) {
      trackAction(currentStepData.action, {
        tutorial: currentTutorial.id,
        step: currentStepData.id,
      });
    }

    if (currentStep < currentTutorial.steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    if (!currentTutorial) return;

    // Mark tutorial as completed
    const updatedCompleted = [...completedTutorials, currentTutorial.id];
    setCompletedTutorials(updatedCompleted);
    localStorage.setItem('emoty_completed_tutorials', JSON.stringify(updatedCompleted));

    // Track completion
    trackAction('complete_tutorial', {
      tutorial: currentTutorial.id,
      userLevel: user?.userLevel,
    });

    // Hide tutorial
    setIsVisible(false);
    setCurrentTutorial(null);
    setCurrentStep(0);
  };

  const handleSkip = () => {
    if (!currentTutorial) return;

    // Track skip
    trackAction('skip_tutorial', {
      tutorial: currentTutorial.id,
      step: currentStep,
    });

    setIsVisible(false);
    setCurrentTutorial(null);
    setCurrentStep(0);
  };

  const handleRestart = (tutorialId: string) => {
    const tutorial = TUTORIALS.find(t => t.id === tutorialId);
    if (tutorial) {
      setCurrentTutorial(tutorial);
      setCurrentStep(0);
      setIsVisible(true);
    }
  };

  if (!isVisible || !currentTutorial || !user) {
    return null;
  }

  const currentStepData = currentTutorial.steps[currentStep];
  const progress = ((currentStep + 1) / currentTutorial.steps.length) * 100;

  return (
    <div className={`tutorial-system ${className}`}>
      {/* Tutorial overlay */}
      <div className="tutorial-overlay" onClick={() => {}} />

      {/* Tutorial popover */}
      <div 
        className="tutorial-popover"
        style={getPopoverPosition(currentStepData.target, currentStepData.position)}
      >
        {/* Header */}
        <div className="tutorial-header">
          <div className="tutorial-title-section">
            <h5 className="tutorial-title mb-1">{currentStepData.title}</h5>
            <small className="text-muted">
              {currentTutorial.title} • Step {currentStep + 1} of {currentTutorial.steps.length}
            </small>
          </div>
          <button
            type="button"
            className="btn-close"
            aria-label="Close tutorial"
            onClick={handleSkip}
          />
        </div>

        {/* Progress bar */}
        <div className="tutorial-progress mb-3">
          <div className="progress" style={{ height: '3px' }}>
            <div
              className="progress-bar bg-primary"
              role="progressbar"
              style={{ width: `${progress}%` }}
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>

        {/* Content */}
        <div className="tutorial-content">
          <p>{currentStepData.content}</p>
        </div>

        {/* Actions */}
        <div className="tutorial-actions d-flex justify-content-between align-items-center">
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={handlePrevious}
            disabled={currentStep === 0}
          >
            <i className="bi bi-arrow-left me-1"></i>
            Previous
          </button>

          <div className="tutorial-dots">
            {currentTutorial.steps.map((_, index) => (
              <span
                key={index}
                className={`tutorial-dot ${index === currentStep ? 'active' : ''} ${index < currentStep ? 'completed' : ''}`}
              />
            ))}
          </div>

          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleNext}
          >
            {currentStep === currentTutorial.steps.length - 1 ? (
              <>
                Complete
                <i className="bi bi-check-lg ms-1"></i>
              </>
            ) : (
              <>
                Next
                <i className="bi bi-arrow-right ms-1"></i>
              </>
            )}
          </button>
        </div>

        {/* Skip option */}
        <div className="tutorial-skip text-center mt-2">
          <button
            type="button"
            className="btn btn-link btn-sm text-muted"
            onClick={handleSkip}
          >
            Skip tutorial
          </button>
        </div>
      </div>

      {/* Spotlight effect for targeted elements */}
      {currentStepData.target && (
        <div className="tutorial-spotlight" />
      )}
    </div>
  );
}

/**
 * Tutorial manager component - allows users to restart tutorials
 */
interface TutorialManagerProps {
  className?: string;
}

export function TutorialManager({ className = '' }: TutorialManagerProps) {
  const { user } = useUser();
  const [completedTutorials, setCompletedTutorials] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('emoty_completed_tutorials');
    if (saved) {
      setCompletedTutorials(JSON.parse(saved));
    }
  }, []);

  if (!user) return null;

  const availableTutorials = TUTORIALS.filter(
    tutorial => tutorial.userLevel <= user.userLevel // Show tutorials for current level and below
  );

  const handleRestartTutorial = (tutorialId: string) => {
    // Remove from completed list
    const updated = completedTutorials.filter(id => id !== tutorialId);
    setCompletedTutorials(updated);
    localStorage.setItem('emoty_completed_tutorials', JSON.stringify(updated));

    // Tutorial system will automatically show it
    window.location.reload();
  };

  return (
    <div className={`tutorial-manager ${className}`}>
      <h5>
        <i className="bi bi-mortarboard me-2"></i>
        Tutorials
      </h5>
      <p className="text-muted">Review tutorials to master Emoty features.</p>

      <div className="tutorial-list">
        {availableTutorials.map(tutorial => {
          const isCompleted = completedTutorials.includes(tutorial.id);
          const isAvailable = tutorial.userLevel <= user.userLevel;

          return (
            <div key={tutorial.id} className="tutorial-item card">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start">
                  <div className="tutorial-info">
                    <h6 className="tutorial-name">
                      {tutorial.title}
                      {isCompleted && (
                        <i className="bi bi-check-circle-fill text-success ms-2"></i>
                      )}
                      {tutorial.required && (
                        <span className="badge bg-warning text-dark ms-2">Required</span>
                      )}
                    </h6>
                    <p className="text-muted small mb-2">{tutorial.description}</p>
                    <small className="text-muted">
                      Level: <span className="text-capitalize">{tutorial.userLevel}</span> • 
                      {tutorial.steps.length} steps
                    </small>
                  </div>
                  <div className="tutorial-actions">
                    {isAvailable ? (
                      <button
                        type="button"
                        className="btn btn-outline-primary btn-sm"
                        onClick={() => handleRestartTutorial(tutorial.id)}
                      >
                        {isCompleted ? 'Review' : 'Start'}
                      </button>
                    ) : (
                      <span className="badge bg-secondary">Locked</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Helper function to calculate popover position
function getPopoverPosition(target?: string, position: string = 'bottom'): React.CSSProperties {
  if (!target) {
    // Center on screen
    return {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 9999,
    };
  }

  // TODO: Calculate position based on target element
  // This would require more complex logic to find the element and position the popover
  return {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 9999,
  };
}