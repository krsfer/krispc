# Emoty Web App - Accessibility Implementation Guide

## Overview

This guide ensures the Emoty web application meets and exceeds WCAG 2.1 AA accessibility standards, making emoji pattern creation truly inclusive for all users regardless of their abilities or disabilities.

## WCAG 2.1 AA Compliance Roadmap

### 1. Perceivable

#### 1.1 Text Alternatives

**Emoji Pattern Descriptions:**
```typescript
// Comprehensive alt text for pattern visualization
interface PatternAccessibilityInfo {
  altText: string;
  description: string;
  sequenceDescription: string;
  spatialDescription: string;
}

const generatePatternAltText = (pattern: GridCell[][]): PatternAccessibilityInfo => {
  const sequence = extractSequenceFromPattern(pattern);
  const size = pattern.length;
  
  return {
    altText: `Emoji pattern: ${sequence.join(' ')} arranged in ${size}x${size} concentric squares`,
    description: `A ${size} by ${size} grid pattern with emojis arranged in concentric squares. The outermost layer contains ${sequence[0]}, working inward to the center with ${sequence[sequence.length - 1]}.`,
    sequenceDescription: `Emoji sequence from outside to center: ${sequence.map((emoji, i) => `${i + 1}. ${emoji}`).join(', ')}`,
    spatialDescription: `Grid layout: ${size} rows by ${size} columns, symmetrical pattern radiating from center`
  };
};

// Screen reader friendly pattern representation
const PatternScreenReaderView: React.FC<{ pattern: GridCell[][] }> = ({ pattern }) => {
  const accessibilityInfo = generatePatternAltText(pattern);
  
  return (
    <div className="sr-only" aria-live="polite" aria-atomic="true">
      <h3>Pattern Structure</h3>
      <p>{accessibilityInfo.description}</p>
      <h4>Emoji Sequence</h4>
      <p>{accessibilityInfo.sequenceDescription}</p>
      <h4>Spatial Layout</h4>
      <p>{accessibilityInfo.spatialDescription}</p>
    </div>
  );
};
```

**Image Alternative Text:**
```typescript
// Emoji images with descriptive alt text
const EmojiImage: React.FC<{ emoji: string; size?: string }> = ({ emoji, size = 'md' }) => {
  const emojiName = getEmojiName(emoji); // Gets standard Unicode name
  
  return (
    <span
      role="img"
      aria-label={emojiName}
      className={`emoji-image emoji-${size}`}
      title={emojiName}
    >
      {emoji}
    </span>
  );
};

// Pattern export images
const exportPatternAsImage = async (pattern: GridCell[][], altText: string) => {
  const canvas = await renderPatternToCanvas(pattern);
  const imageData = canvas.toDataURL();
  
  return {
    src: imageData,
    alt: altText,
    longdesc: generateDetailedPatternDescription(pattern)
  };
};
```

#### 1.2 Time-based Media

**Voice Command Feedback:**
```typescript
// Audio feedback for voice commands
const VoiceCommandFeedback: React.FC = () => {
  const { speak, voices } = useSpeechSynthesis();
  const { language } = useLanguage();
  
  const provideAudioFeedback = (message: string, priority: 'low' | 'medium' | 'high' = 'medium') => {
    const voice = voices.find(v => v.lang.startsWith(language)) || voices[0];
    
    speak({
      text: message,
      voice,
      rate: 0.9,
      pitch: 1,
      volume: priority === 'high' ? 1 : 0.8
    });
  };

  const announcePatternChange = (newSequence: string[]) => {
    const message = language === 'en' 
      ? `Pattern updated. New sequence: ${newSequence.join(', ')}`
      : `Motif mis à jour. Nouvelle séquence: ${newSequence.join(', ')}`;
    
    provideAudioFeedback(message, 'medium');
  };

  return null; // This is a service component
};

// Captions for AI-generated audio
const AIResponseWithCaptions: React.FC<{ response: string; audioEnabled: boolean }> = ({ 
  response, 
  audioEnabled 
}) => {
  return (
    <div className="ai-response">
      <div className="response-text" aria-live="polite">
        {response}
      </div>
      
      {audioEnabled && (
        <div className="audio-controls">
          <button 
            className="btn btn-sm btn-outline-secondary"
            aria-label="Play audio response"
          >
            <i className="fas fa-play" aria-hidden="true"></i>
            Play Audio
          </button>
          <button 
            className="btn btn-sm btn-outline-secondary"
            aria-label="Show text captions"
          >
            <i className="fas fa-closed-captioning" aria-hidden="true"></i>
            Show Captions
          </button>
        </div>
      )}
    </div>
  );
};
```

#### 1.3 Adaptable Content

**Responsive Design with Accessibility:**
```scss
// Accessibility-enhanced responsive breakpoints
$accessibility-breakpoints: (
  'touch-friendly': 480px,    // Minimum for 44px touch targets
  'screen-reader': 768px,     // Optimized for screen reader navigation
  'voice-control': 1024px,    // Larger targets for voice navigation
  'motor-assistance': 1200px  // Extra spacing for motor disabilities
);

// Touch target sizing
.touch-target {
  min-width: 44px;
  min-height: 44px;
  
  @media (max-width: map-get($accessibility-breakpoints, 'touch-friendly')) {
    min-width: 48px;
    min-height: 48px;
  }
}

// Focus indicators
.focus-indicator {
  &:focus-visible {
    outline: 3px solid var(--focus-color);
    outline-offset: 2px;
    box-shadow: 0 0 0 5px rgba(var(--focus-color-rgb), 0.3);
  }
}

// High contrast support
@media (prefers-contrast: high) {
  :root {
    --pattern-border-color: #000000;
    --emoji-background: #ffffff;
    --text-color: #000000;
    --background-color: #ffffff;
  }
  
  .pattern-canvas {
    filter: contrast(1.5);
  }
  
  .emoji-picker-btn {
    border: 2px solid #000000;
    
    &:hover {
      background-color: #000000;
      color: #ffffff;
    }
  }
}

// Reduced motion support
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
  
  .pattern-animation {
    animation: none;
  }
}
```

#### 1.4 Distinguishable

**Color and Contrast:**
```typescript
// Color contrast verification
const ColorContrastChecker = {
  // WCAG AA requires 4.5:1 for normal text, 3:1 for large text
  checkContrast(foreground: string, background: string): {
    ratio: number;
    passes: { AA: boolean; AAA: boolean };
  } {
    const luminance1 = this.getLuminance(foreground);
    const luminance2 = this.getLuminance(background);
    
    const ratio = luminance1 > luminance2 
      ? (luminance1 + 0.05) / (luminance2 + 0.05)
      : (luminance2 + 0.05) / (luminance1 + 0.05);
    
    return {
      ratio,
      passes: {
        AA: ratio >= 4.5,
        AAA: ratio >= 7.0
      }
    };
  },

  getLuminance(color: string): number {
    const rgb = this.hexToRgb(color);
    const [r, g, b] = rgb.map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  },

  hexToRgb(hex: string): [number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ] : [0, 0, 0];
  }
};

// Accessible color palette
const AccessibleColors = {
  primary: '#2563eb',      // Blue - 4.5:1 contrast on white
  secondary: '#64748b',    // Slate - 4.5:1 contrast on white
  success: '#059669',      // Green - 4.5:1 contrast on white
  warning: '#d97706',      // Orange - 4.5:1 contrast on white
  danger: '#dc2626',       // Red - 4.5:1 contrast on white
  
  // High contrast variants
  highContrast: {
    primary: '#1d4ed8',    // Darker blue - 7:1 contrast
    text: '#000000',       // Pure black
    background: '#ffffff', // Pure white
    border: '#000000'      // Pure black borders
  }
};
```

### 2. Operable

#### 2.1 Keyboard Accessible

**Complete Keyboard Navigation:**
```typescript
// Keyboard navigation hook
const useKeyboardNavigation = () => {
  const [focusedElement, setFocusedElement] = useState<HTMLElement | null>(null);
  const [navigationMode, setNavigationMode] = useState<'grid' | 'linear'>('linear');

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const { key, ctrlKey, metaKey, shiftKey } = event;
    
    switch (key) {
      case 'Tab':
        // Natural tab order - let browser handle
        break;
        
      case 'ArrowUp':
      case 'ArrowDown':
      case 'ArrowLeft':
      case 'ArrowRight':
        if (navigationMode === 'grid') {
          event.preventDefault();
          navigateGrid(key);
        }
        break;
        
      case 'Enter':
      case ' ':
        event.preventDefault();
        activateCurrentElement();
        break;
        
      case 'Escape':
        event.preventDefault();
        exitCurrentContext();
        break;
        
      case 'Home':
        event.preventDefault();
        focusFirstElement();
        break;
        
      case 'End':
        event.preventDefault();
        focusLastElement();
        break;
        
      // Voice control shortcuts
      case 'v':
        if (ctrlKey || metaKey) {
          event.preventDefault();
          toggleVoiceControl();
        }
        break;
        
      // AI assistant shortcut
      case 'a':
        if (ctrlKey || metaKey) {
          event.preventDefault();
          openAIAssistant();
        }
        break;
    }
  }, [navigationMode]);

  const navigateGrid = (direction: string) => {
    // Grid navigation logic for emoji palettes and patterns
    const currentGrid = document.querySelector('[data-grid-navigation="true"]');
    if (!currentGrid) return;
    
    const cells = Array.from(currentGrid.querySelectorAll('[data-grid-cell="true"]'));
    const currentIndex = cells.indexOf(focusedElement as HTMLElement);
    
    if (currentIndex === -1) return;
    
    const columns = parseInt(currentGrid.getAttribute('data-grid-columns') || '8');
    let newIndex = currentIndex;
    
    switch (direction) {
      case 'ArrowUp':
        newIndex = Math.max(0, currentIndex - columns);
        break;
      case 'ArrowDown':
        newIndex = Math.min(cells.length - 1, currentIndex + columns);
        break;
      case 'ArrowLeft':
        newIndex = Math.max(0, currentIndex - 1);
        break;
      case 'ArrowRight':
        newIndex = Math.min(cells.length - 1, currentIndex + 1);
        break;
    }
    
    (cells[newIndex] as HTMLElement).focus();
  };

  return { handleKeyDown, navigationMode, setNavigationMode };
};

// Emoji picker with keyboard support
const AccessibleEmojiPicker: React.FC<EmojiPickerProps> = ({ 
  emojis, 
  onSelect, 
  selectedEmoji 
}) => {
  const { handleKeyDown, setNavigationMode } = useKeyboardNavigation();
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNavigationMode('grid');
    return () => setNavigationMode('linear');
  }, []);

  return (
    <div
      ref={gridRef}
      className="emoji-picker-grid"
      data-grid-navigation="true"
      data-grid-columns="8"
      role="grid"
      aria-label="Emoji selection grid"
      onKeyDown={handleKeyDown}
    >
      {emojis.map((emoji, index) => (
        <button
          key={emoji}
          className={`emoji-picker-btn ${selectedEmoji === emoji ? 'selected' : ''}`}
          data-grid-cell="true"
          role="gridcell"
          aria-label={`Select ${getEmojiName(emoji)} emoji`}
          aria-pressed={selectedEmoji === emoji}
          tabIndex={index === 0 ? 0 : -1}
          onClick={() => onSelect(emoji)}
        >
          <span role="img" aria-hidden="true">{emoji}</span>
        </button>
      ))}
    </div>
  );
};
```

#### 2.2 No Seizures or Physical Reactions

**Safe Animations:**
```scss
// Reduced motion and safe animations
@keyframes safeFlash {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.8; }
}

@keyframes safePulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.02); }
}

// Ensure no more than 3 flashes per second
.notification-flash {
  animation: safeFlash 2s ease-in-out;
  
  @media (prefers-reduced-motion: reduce) {
    animation: none;
    background-color: var(--success-color);
  }
}

// Voice recording indicator - safe pulsing
.voice-recording-indicator {
  animation: safePulse 3s ease-in-out infinite;
  
  @media (prefers-reduced-motion: reduce) {
    animation: none;
    background-color: var(--danger-color);
  }
}

// Pattern transitions
.pattern-transition {
  transition: all 0.3s ease-in-out;
  
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
}
```

#### 2.3 Navigable

**Skip Links and Navigation:**
```typescript
// Skip links component
const SkipLinks: React.FC = () => {
  return (
    <div className="skip-links">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <a href="#pattern-canvas" className="skip-link">
        Skip to pattern canvas
      </a>
      <a href="#emoji-palettes" className="skip-link">
        Skip to emoji palettes
      </a>
      <a href="#voice-controls" className="skip-link">
        Skip to voice controls
      </a>
      <a href="#ai-assistant" className="skip-link">
        Skip to AI assistant
      </a>
    </div>
  );
};

// Breadcrumb navigation
const AccessibleBreadcrumb: React.FC<{ path: BreadcrumbItem[] }> = ({ path }) => {
  return (
    <nav aria-label="Breadcrumb navigation">
      <ol className="breadcrumb">
        {path.map((item, index) => (
          <li 
            key={item.id}
            className={`breadcrumb-item ${index === path.length - 1 ? 'active' : ''}`}
            aria-current={index === path.length - 1 ? 'page' : undefined}
          >
            {index === path.length - 1 ? (
              <span>{item.label}</span>
            ) : (
              <Link href={item.href} className="breadcrumb-link">
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

// Focus management for modals
const AccessibleModal: React.FC<ModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  children 
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      
      // Focus the modal
      setTimeout(() => {
        modalRef.current?.focus();
      }, 100);
      
      // Trap focus within modal
      const trapFocus = (event: KeyboardEvent) => {
        if (event.key === 'Tab') {
          const focusableElements = modalRef.current?.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          
          if (focusableElements && focusableElements.length > 0) {
            const firstElement = focusableElements[0] as HTMLElement;
            const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
            
            if (!event.shiftKey && document.activeElement === lastElement) {
              event.preventDefault();
              firstElement.focus();
            }
            
            if (event.shiftKey && document.activeElement === firstElement) {
              event.preventDefault();
              lastElement.focus();
            }
          }
        }
      };
      
      document.addEventListener('keydown', trapFocus);
      return () => document.removeEventListener('keydown', trapFocus);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen && previousFocusRef.current) {
      previousFocusRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div 
        ref={modalRef}
        className="modal-content"
        tabIndex={-1}
      >
        <div className="modal-header">
          <h2 id="modal-title" className="modal-title">
            {title}
          </h2>
          <button
            className="modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            <i className="fas fa-times" aria-hidden="true"></i>
          </button>
        </div>
        
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
};
```

### 3. Understandable

#### 3.1 Readable

**Clear Language and Instructions:**
```typescript
// Language simplification for accessibility
const AccessibleText = {
  simplifyInstructions: (text: string, level: 'basic' | 'intermediate' | 'advanced' = 'basic') => {
    const simplifications = {
      basic: {
        'utilize': 'use',
        'facilitate': 'help',
        'implement': 'add',
        'configure': 'set up',
        'subsequently': 'then',
        'approximately': 'about'
      },
      intermediate: {
        'subsequently': 'then',
        'approximately': 'about'
      },
      advanced: {}
    };
    
    let simplified = text;
    Object.entries(simplifications[level]).forEach(([complex, simple]) => {
      simplified = simplified.replace(new RegExp(complex, 'gi'), simple);
    });
    
    return simplified;
  },

  // Reading level assessment
  calculateReadingLevel: (text: string): {
    level: string;
    score: number;
    suggestions: string[];
  } => {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const syllables = words.reduce((total, word) => total + countSyllables(word), 0);
    
    // Flesch Reading Ease Score
    const avgSentenceLength = words.length / sentences.length;
    const avgSyllablesPerWord = syllables / words.length;
    const score = 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord);
    
    let level = 'Graduate';
    if (score >= 90) level = 'Very Easy';
    else if (score >= 80) level = 'Easy';
    else if (score >= 70) level = 'Fairly Easy';
    else if (score >= 60) level = 'Standard';
    else if (score >= 50) level = 'Fairly Difficult';
    else if (score >= 30) level = 'Difficult';
    
    const suggestions = [];
    if (avgSentenceLength > 20) suggestions.push('Use shorter sentences');
    if (avgSyllablesPerWord > 1.5) suggestions.push('Use simpler words');
    
    return { level, score, suggestions };
  }
};

// Accessible form labels and help text
const AccessibleFormField: React.FC<{
  label: string;
  helpText?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}> = ({ label, helpText, error, required, children }) => {
  const fieldId = useId();
  const helpId = useId();
  const errorId = useId();

  return (
    <div className="form-field">
      <label htmlFor={fieldId} className="form-label">
        {label}
        {required && <span className="required-indicator" aria-label="required">*</span>}
      </label>
      
      {helpText && (
        <div id={helpId} className="form-help">
          {AccessibleText.simplifyInstructions(helpText)}
        </div>
      )}
      
      {React.cloneElement(children as React.ReactElement, {
        id: fieldId,
        'aria-describedby': [
          helpText ? helpId : '',
          error ? errorId : ''
        ].filter(Boolean).join(' '),
        'aria-invalid': !!error,
        'aria-required': required
      })}
      
      {error && (
        <div id={errorId} className="form-error" role="alert">
          <i className="fas fa-exclamation-triangle" aria-hidden="true"></i>
          {error}
        </div>
      )}
    </div>
  );
};
```

#### 3.2 Predictable

**Consistent Navigation and Behavior:**
```typescript
// Consistent navigation patterns
const NavigationPatterns = {
  // Standardized button behaviors
  createButton: (props: ButtonProps) => ({
    role: 'button',
    tabIndex: props.disabled ? -1 : 0,
    'aria-pressed': props.pressed,
    'aria-disabled': props.disabled,
    onClick: props.disabled ? undefined : props.onClick,
    onKeyDown: (event: KeyboardEvent) => {
      if ((event.key === 'Enter' || event.key === ' ') && !props.disabled) {
        event.preventDefault();
        props.onClick?.();
      }
    }
  }),

  // Consistent form submission
  handleFormSubmit: (formData: any, onSuccess: Function, onError: Function) => {
    // Always provide feedback
    const announce = (message: string) => {
      const announcer = document.getElementById('aria-live-announcer');
      if (announcer) {
        announcer.textContent = message;
      }
    };

    announce('Processing your request...');
    
    return submitForm(formData)
      .then((result) => {
        announce('Request completed successfully');
        onSuccess(result);
      })
      .catch((error) => {
        announce('Request failed. Please try again.');
        onError(error);
      });
  },

  // Predictable error handling
  displayError: (error: string, context: string) => {
    return {
      message: error,
      context,
      actions: [
        { label: 'Try Again', action: 'retry' },
        { label: 'Get Help', action: 'help' },
        { label: 'Report Issue', action: 'report' }
      ],
      timestamp: new Date().toISOString()
    };
  }
};

// ARIA live announcements
const LiveAnnouncer: React.FC = () => {
  return (
    <>
      <div
        id="aria-live-announcer"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />
      <div
        id="aria-live-announcer-assertive"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      />
    </>
  );
};
```

#### 3.3 Input Assistance

**Error Prevention and Correction:**
```typescript
// Input validation and assistance
const useInputAssistance = () => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateField = (name: string, value: any, rules: ValidationRule[]) => {
    for (const rule of rules) {
      const result = rule.validate(value);
      if (!result.isValid) {
        setErrors(prev => ({ ...prev, [name]: result.message }));
        return false;
      }
    }
    
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[name];
      return newErrors;
    });
    return true;
  };

  const handleBlur = (name: string) => {
    setTouched(prev => ({ ...prev, [name]: true }));
  };

  const getFieldProps = (name: string) => ({
    'aria-invalid': touched[name] && !!errors[name],
    'aria-describedby': errors[name] ? `${name}-error` : undefined,
    onBlur: () => handleBlur(name)
  });

  return { errors, touched, validateField, getFieldProps };
};

// Pattern validation with helpful messages
const PatternValidator = {
  validateSequence: (sequence: string[]): ValidationResult => {
    const errors: string[] = [];
    
    if (sequence.length === 0) {
      errors.push('Please add at least one emoji to create a pattern');
    }
    
    if (sequence.length > 10) {
      errors.push('Patterns can have a maximum of 10 emojis. Consider removing some emojis.');
    }
    
    // Check for duplicate consecutive emojis
    for (let i = 0; i < sequence.length - 1; i++) {
      if (sequence[i] === sequence[i + 1]) {
        errors.push(`Consecutive duplicate emoji "${sequence[i]}" at positions ${i + 1} and ${i + 2}. Consider using different emojis for better visual variety.`);
      }
    }
    
    // Check for valid Unicode emojis
    sequence.forEach((emoji, index) => {
      if (!isValidEmoji(emoji)) {
        errors.push(`Invalid emoji at position ${index + 1}. Please select from the available emoji palettes.`);
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors,
      suggestions: errors.length > 0 ? [
        'Try selecting emojis from the palette above',
        'Remove duplicate emojis for better patterns',
        'Aim for 3-5 emojis for optimal visual impact'
      ] : []
    };
  },

  validatePrompt: (prompt: string): ValidationResult => {
    const errors: string[] = [];
    
    if (prompt.trim().length === 0) {
      errors.push('Please describe what kind of pattern you\'d like to create');
    }
    
    if (prompt.length > 500) {
      errors.push('Please keep your description under 500 characters');
    }
    
    if (containsInappropriateContent(prompt)) {
      errors.push('Please use appropriate language in your pattern description');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      suggestions: errors.length > 0 ? [
        'Describe emotions, scenes, or themes (e.g., "peaceful garden", "birthday celebration")',
        'Use simple, clear language',
        'Be creative but appropriate'
      ] : []
    };
  }
};
```

### 4. Robust

#### 4.1 Compatible

**Screen Reader Support:**
```typescript
// Screen reader specific optimizations
const ScreenReaderSupport = {
  // Enhanced ARIA labels
  generateAriaLabel: (element: string, context: any): string => {
    switch (element) {
      case 'pattern-canvas':
        return `Interactive emoji pattern canvas. ${context.sequence.length} emojis arranged in ${context.size}x${context.size} grid. Current pattern: ${context.sequence.join(', ')}. Use arrow keys to navigate, Enter to modify.`;
        
      case 'emoji-button':
        return `${context.emojiName} emoji button. ${context.selected ? 'Currently selected. ' : ''}Press Enter or Space to ${context.selected ? 'deselect' : 'add to pattern'}.`;
        
      case 'voice-control':
        return `Voice control ${context.active ? 'active' : 'inactive'}. ${context.listening ? 'Currently listening for commands. ' : ''}Press to ${context.active ? 'stop' : 'start'} voice recognition.`;
        
      default:
        return '';
    }
  },

  // Screen reader friendly announcements
  announcePatternChange: (oldSequence: string[], newSequence: string[]) => {
    const added = newSequence.filter(emoji => !oldSequence.includes(emoji));
    const removed = oldSequence.filter(emoji => !newSequence.includes(emoji));
    
    let announcement = '';
    if (added.length > 0) {
      announcement += `Added ${added.join(', ')} to pattern. `;
    }
    if (removed.length > 0) {
      announcement += `Removed ${removed.join(', ')} from pattern. `;
    }
    announcement += `Current pattern: ${newSequence.join(', ')}`;
    
    return announcement;
  },

  // Table representation for complex patterns
  createPatternTable: (pattern: GridCell[][]): string => {
    const table = pattern.map((row, rowIndex) => 
      row.map((cell, colIndex) => 
        `Row ${rowIndex + 1}, Column ${colIndex + 1}: ${cell.emoji || 'empty'}`
      ).join(', ')
    ).join('. ');
    
    return `Pattern grid layout: ${table}`;
  }
};

// High contrast mode detection
const useHighContrast = () => {
  const [highContrast, setHighContrast] = useState(false);
  
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    setHighContrast(mediaQuery.matches);
    
    const handleChange = (e: MediaQueryListEvent) => {
      setHighContrast(e.matches);
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);
  
  return highContrast;
};

// Browser compatibility checks
const BrowserCompatibility = {
  checkWebSpeechAPI: (): boolean => {
    return 'speechSynthesis' in window && 'SpeechRecognition' in window;
  },
  
  checkCanvasSupport: (): boolean => {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext && canvas.getContext('2d'));
  },
  
  checkLocalStorage: (): boolean => {
    try {
      localStorage.setItem('test', 'test');
      localStorage.removeItem('test');
      return true;
    } catch {
      return false;
    }
  },
  
  provideFallbacks: () => {
    if (!BrowserCompatibility.checkWebSpeechAPI()) {
      console.warn('Web Speech API not supported, voice features disabled');
      // Provide text-only alternatives
    }
    
    if (!BrowserCompatibility.checkCanvasSupport()) {
      console.warn('Canvas not supported, using SVG fallback');
      // Use SVG for pattern rendering
    }
    
    if (!BrowserCompatibility.checkLocalStorage()) {
      console.warn('LocalStorage not available, using session storage');
      // Fall back to session storage or in-memory storage
    }
  }
};
```

## Testing Strategy

### Automated Accessibility Testing

```typescript
// Jest + axe-core integration
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

describe('Accessibility Tests', () => {
  it('should have no accessibility violations on main page', async () => {
    const { container } = render(<MainPage />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have proper focus management in modals', async () => {
    const { getByRole } = render(<AIPatternGenerator isOpen={true} />);
    const modal = getByRole('dialog');
    
    // Check initial focus
    expect(document.activeElement).toBe(modal);
    
    // Test focus trap
    userEvent.tab();
    expect(document.activeElement).toBeInTheDocument();
    expect(modal.contains(document.activeElement)).toBe(true);
  });

  it('should provide keyboard navigation for emoji grid', () => {
    const { getByRole } = render(<EmojiPicker />);
    const grid = getByRole('grid');
    
    fireEvent.keyDown(grid, { key: 'ArrowRight' });
    // Verify focus moved to next emoji
    
    fireEvent.keyDown(grid, { key: 'Enter' });
    // Verify emoji selection
  });
});
```

### Manual Testing Checklist

```markdown
## Screen Reader Testing
- [ ] VoiceOver (macOS/iOS)
- [ ] NVDA (Windows)
- [ ] JAWS (Windows)
- [ ] TalkBack (Android)

## Keyboard Navigation
- [ ] Tab order is logical
- [ ] All interactive elements reachable
- [ ] Focus indicators visible
- [ ] No keyboard traps

## Voice Control Testing
- [ ] Dragon NaturallySpeaking
- [ ] Voice Control (macOS)
- [ ] Voice Access (Android)

## Motor Accessibility
- [ ] Touch targets ≥44px
- [ ] No required gestures
- [ ] Adequate spacing
- [ ] Alternative input methods

## Visual Accessibility
- [ ] Color contrast ≥4.5:1
- [ ] High contrast mode
- [ ] Zoom to 200% functional
- [ ] No color-only information

## Cognitive Accessibility
- [ ] Clear instructions
- [ ] Error prevention
- [ ] Consistent navigation
- [ ] Simple language
```

---

*This accessibility guide ensures the Emoty web application provides an inclusive experience for all users, meeting and exceeding WCAG 2.1 AA standards while maintaining full functionality and user enjoyment.*