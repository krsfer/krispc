# Emoty Web App - Component Library

## Overview

This document outlines the comprehensive component library for the Emoty web application, built on Bootstrap 5 with custom extensions for emoji pattern creation, accessibility, and advanced user interactions.

## Design System Foundation

### 1. Bootstrap 5 Customization

#### Custom Theme Variables

Create `styles/theme.scss`:

```scss
// Custom color palette
$primary: #6366f1;       // Indigo for primary actions
$secondary: #64748b;     // Slate for secondary elements
$success: #10b981;       // Emerald for success states
$info: #06b6d4;          // Cyan for information
$warning: #f59e0b;       // Amber for warnings
$danger: #ef4444;        // Red for errors
$light: #f8fafc;         // Very light gray
$dark: #1e293b;          // Dark slate

// Emoji-specific colors
$emoji-bg: #fef3c7;      // Light amber for emoji backgrounds
$pattern-border: #d1d5db; // Gray for pattern borders
$palette-active: #ddd6fe; // Light purple for active palette

// Accessibility colors (WCAG AA compliant)
$focus-color: #2563eb;   // Blue for focus indicators
$error-color: #dc2626;   // Red for error states
$success-color: #059669; // Green for success states

// Typography
$font-family-base: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
$font-family-emoji: 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif;

// Spacing for touch targets (accessibility)
$touch-target-min: 44px;

// Border radius
$border-radius: 0.5rem;
$border-radius-sm: 0.25rem;
$border-radius-lg: 0.75rem;

// Shadows
$box-shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
$box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
$box-shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);

// Custom breakpoints for emoji patterns
$grid-breakpoints: (
  xs: 0,
  sm: 576px,
  md: 768px,
  lg: 992px,
  xl: 1200px,
  xxl: 1400px,
  emoji-sm: 480px,  // Custom breakpoint for small emoji grids
  emoji-lg: 1024px  // Custom breakpoint for large emoji grids
);
```

#### Accessibility Enhancements

```scss
// High contrast mode support
@media (prefers-contrast: high) {
  :root {
    --bs-body-color: #000;
    --bs-body-bg: #fff;
    --bs-border-color: #000;
  }
  
  .btn {
    border-width: 2px;
  }
  
  .pattern-cell {
    border-width: 2px;
    border-color: #000;
  }
}

// Reduced motion support
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

// Focus management
.focus-visible {
  outline: 2px solid $focus-color;
  outline-offset: 2px;
}

// Screen reader only content
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

## Core Components

### 1. Layout Components

#### App Layout

```tsx
interface AppLayoutProps {
  children: React.ReactNode;
  showNavigation?: boolean;
  showFooter?: boolean;
}

const AppLayout: React.FC<AppLayoutProps> = ({ 
  children, 
  showNavigation = true, 
  showFooter = true 
}) => {
  return (
    <div className="app-layout min-vh-100 d-flex flex-column">
      {showNavigation && <Navigation />}
      
      <main 
        className="flex-grow-1" 
        role="main" 
        aria-label="Main content"
      >
        {children}
      </main>
      
      {showFooter && <Footer />}
      
      {/* Accessibility features */}
      <SkipLink />
      <VoiceNavigationOverlay />
    </div>
  );
};
```

#### Navigation Component

```tsx
interface NavigationProps {
  currentPage?: string;
  showVoiceToggle?: boolean;
}

const Navigation: React.FC<NavigationProps> = ({ 
  currentPage,
  showVoiceToggle = true 
}) => {
  const { theme, toggleTheme } = useTheme();
  const { voiceEnabled, toggleVoice } = useVoice();
  
  return (
    <nav 
      className="navbar navbar-expand-lg navbar-light bg-light border-bottom"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="container-fluid">
        <Link href="/" className="navbar-brand d-flex align-items-center">
          <span className="emoji-logo me-2" role="img" aria-label="Emoty logo">
            🎨
          </span>
          <span>Emoty</span>
        </Link>
        
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav me-auto">
            <NavItem href="/" active={currentPage === 'home'}>
              Create Pattern
            </NavItem>
            <NavItem href="/patterns" active={currentPage === 'patterns'}>
              My Patterns
            </NavItem>
            <NavItem href="/palettes" active={currentPage === 'palettes'}>
              Palettes
            </NavItem>
          </ul>
          
          <div className="navbar-nav">
            {showVoiceToggle && (
              <VoiceToggleButton 
                enabled={voiceEnabled} 
                onToggle={toggleVoice} 
              />
            )}
            
            <ThemeToggleButton 
              theme={theme} 
              onToggle={toggleTheme} 
            />
            
            <AccessibilityMenuButton />
          </div>
        </div>
      </div>
    </nav>
  );
};
```

### 2. Pattern Components

#### Pattern Canvas

```tsx
interface PatternCanvasProps {
  pattern: GridCell[][];
  onCellClick?: (row: number, col: number) => void;
  readonly?: boolean;
  showGrid?: boolean;
  animationEnabled?: boolean;
  className?: string;
}

const PatternCanvas: React.FC<PatternCanvasProps> = ({
  pattern,
  onCellClick,
  readonly = false,
  showGrid = true,
  animationEnabled = true,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { accessibility } = useAccessibility();
  
  useEffect(() => {
    if (canvasRef.current) {
      const renderer = new PatternRenderer(canvasRef.current, {
        showGrid,
        animationEnabled: animationEnabled && !accessibility.reducedMotion,
        highContrast: accessibility.highContrast
      });
      
      renderer.render(pattern);
    }
  }, [pattern, showGrid, animationEnabled, accessibility]);
  
  const handleCanvasClick = (event: React.MouseEvent) => {
    if (readonly || !onCellClick) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const cellSize = canvas.width / pattern[0].length;
    const row = Math.floor(y / cellSize);
    const col = Math.floor(x / cellSize);
    
    onCellClick(row, col);
  };
  
  return (
    <div className={`pattern-canvas-container ${className}`}>
      <canvas
        ref={canvasRef}
        className="pattern-canvas"
        onClick={handleCanvasClick}
        role="img"
        aria-label={`Emoji pattern with ${pattern.length}x${pattern[0]?.length || 0} grid`}
        tabIndex={readonly ? -1 : 0}
        onKeyDown={handleKeyboardNavigation}
      />
      
      {/* Alternative representation for screen readers */}
      <div className="sr-only">
        <PatternTextRepresentation pattern={pattern} />
      </div>
    </div>
  );
};
```

#### Sequence Editor

```tsx
interface SequenceEditorProps {
  sequence: string[];
  insertionIndex: number;
  onSequenceChange: (sequence: string[]) => void;
  onInsertionIndexChange: (index: number) => void;
  maxLength?: number;
}

const SequenceEditor: React.FC<SequenceEditorProps> = ({
  sequence,
  insertionIndex,
  onSequenceChange,
  onInsertionIndexChange,
  maxLength = 10
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };
  
  const handleDrop = (targetIndex: number) => {
    if (draggedIndex === null) return;
    
    const newSequence = [...sequence];
    const draggedEmoji = newSequence.splice(draggedIndex, 1)[0];
    newSequence.splice(targetIndex, 0, draggedEmoji);
    
    onSequenceChange(newSequence);
    setDraggedIndex(null);
  };
  
  return (
    <div 
      className="sequence-editor card"
      role="region"
      aria-label="Emoji sequence editor"
    >
      <div className="card-header d-flex justify-content-between align-items-center">
        <h3 className="card-title h5 mb-0">Emoji Sequence</h3>
        <small className="text-muted">
          {sequence.length}/{maxLength} emojis
        </small>
      </div>
      
      <div className="card-body">
        <div 
          className="sequence-container d-flex flex-wrap gap-2"
          role="list"
          aria-label="Emoji sequence"
        >
          {sequence.map((emoji, index) => (
            <SequenceItem
              key={`${emoji}-${index}`}
              emoji={emoji}
              index={index}
              isActive={index === insertionIndex}
              onRemove={() => {
                const newSequence = sequence.filter((_, i) => i !== index);
                onSequenceChange(newSequence);
              }}
              onInsertionClick={() => onInsertionIndexChange(index)}
              onDragStart={() => handleDragStart(index)}
              onDrop={() => handleDrop(index)}
            />
          ))}
          
          {sequence.length < maxLength && (
            <AddEmojiButton 
              onInsertionClick={() => onInsertionIndexChange(sequence.length)}
            />
          )}
        </div>
        
        {/* Keyboard navigation instructions */}
        <div className="mt-3 small text-muted">
          <kbd>Tab</kbd> to navigate, <kbd>Space</kbd> to select insertion point, 
          <kbd>Delete</kbd> to remove emoji
        </div>
      </div>
    </div>
  );
};
```

### 3. Emoji Components

#### Emoji Palette Carousel

```tsx
interface EmojiPaletteCarouselProps {
  palettes: EmojiPalette[];
  activePalette: string;
  onPaletteChange: (paletteId: string) => void;
  onEmojiSelect: (emoji: string) => void;
  language: 'en' | 'fr';
}

const EmojiPaletteCarousel: React.FC<EmojiPaletteCarouselProps> = ({
  palettes,
  activePalette,
  onPaletteChange,
  onEmojiSelect,
  language
}) => {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const activeIndex = palettes.findIndex(p => p.id === activePalette);
  
  useEffect(() => {
    if (activeIndex !== -1 && activeIndex !== currentIndex) {
      setCurrentIndex(activeIndex);
    }
  }, [activeIndex]);
  
  const navigateToPalette = (direction: 'prev' | 'next') => {
    const newIndex = direction === 'prev' 
      ? Math.max(0, currentIndex - 1)
      : Math.min(palettes.length - 1, currentIndex + 1);
    
    setCurrentIndex(newIndex);
    onPaletteChange(palettes[newIndex].id);
  };
  
  return (
    <div 
      className="emoji-palette-carousel"
      role="region"
      aria-label="Emoji palette selection"
    >
      {/* Palette Navigation */}
      <div className="palette-header d-flex justify-content-between align-items-center mb-3">
        <button
          className="btn btn-outline-secondary"
          onClick={() => navigateToPalette('prev')}
          disabled={currentIndex === 0}
          aria-label="Previous palette"
        >
          <i className="fas fa-chevron-left"></i>
        </button>
        
        <div className="palette-info text-center">
          <h3 className="h5 mb-1">
            {palettes[currentIndex]?.name[language]}
          </h3>
          <small className="text-muted">
            {currentIndex + 1} of {palettes.length}
          </small>
        </div>
        
        <button
          className="btn btn-outline-secondary"
          onClick={() => navigateToPalette('next')}
          disabled={currentIndex === palettes.length - 1}
          aria-label="Next palette"
        >
          <i className="fas fa-chevron-right"></i>
        </button>
      </div>
      
      {/* Emoji Grid */}
      <div 
        ref={carouselRef}
        className="palette-content"
        style={{ 
          transform: `translateX(-${currentIndex * 100}%)`,
          transition: 'transform 0.3s ease-in-out'
        }}
      >
        {palettes.map((palette, index) => (
          <EmojiPaletteGrid
            key={palette.id}
            palette={palette}
            onEmojiSelect={onEmojiSelect}
            isActive={index === currentIndex}
          />
        ))}
      </div>
      
      {/* Palette Indicators */}
      <div className="palette-indicators d-flex justify-content-center mt-3">
        {palettes.map((palette, index) => (
          <button
            key={palette.id}
            className={`palette-indicator ${index === currentIndex ? 'active' : ''}`}
            onClick={() => {
              setCurrentIndex(index);
              onPaletteChange(palette.id);
            }}
            aria-label={`Switch to ${palette.name[language]} palette`}
          />
        ))}
      </div>
    </div>
  );
};
```

#### Emoji Picker Button

```tsx
interface EmojiPickerButtonProps {
  emoji: string;
  size?: 'sm' | 'md' | 'lg';
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}

const EmojiPickerButton: React.FC<EmojiPickerButtonProps> = ({
  emoji,
  size = 'md',
  selected = false,
  disabled = false,
  onClick,
  className = ''
}) => {
  const sizeClasses = {
    sm: 'emoji-btn-sm',
    md: 'emoji-btn-md', 
    lg: 'emoji-btn-lg'
  };
  
  return (
    <button
      className={`
        emoji-picker-btn 
        ${sizeClasses[size]} 
        ${selected ? 'selected' : ''} 
        ${className}
      `}
      onClick={onClick}
      disabled={disabled}
      aria-label={`Select ${emoji} emoji`}
      role="button"
      tabIndex={disabled ? -1 : 0}
    >
      <span 
        className="emoji-content"
        role="img"
        aria-hidden="true"
      >
        {emoji}
      </span>
    </button>
  );
};
```

### 4. AI Integration Components

#### AI Chat Interface

```tsx
interface AIChatInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
  currentPattern?: PatternState;
  onPatternSuggestion: (pattern: string[]) => void;
}

const AIChatInterface: React.FC<AIChatInterfaceProps> = ({
  isOpen,
  onClose,
  currentPattern,
  onPatternSuggestion
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: inputValue,
          context: { currentPattern }
        })
      });
      
      const data = await response.json();
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        suggestions: data.suggestions
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div 
      className={`ai-chat-interface offcanvas offcanvas-end ${isOpen ? 'show' : ''}`}
      tabIndex={-1}
      role="dialog"
      aria-labelledby="ai-chat-title"
      aria-hidden={!isOpen}
    >
      <div className="offcanvas-header border-bottom">
        <h5 className="offcanvas-title" id="ai-chat-title">
          🤖 EmotyBot Assistant
        </h5>
        <button
          type="button"
          className="btn-close"
          onClick={onClose}
          aria-label="Close AI chat"
        />
      </div>
      
      <div className="offcanvas-body d-flex flex-column">
        {/* Chat Messages */}
        <div className="chat-messages flex-grow-1 overflow-auto mb-3">
          {messages.length === 0 && (
            <div className="text-center text-muted py-4">
              <p>Hello! I'm here to help you create amazing emoji patterns.</p>
              <p>Ask me for suggestions or describe what you'd like to create!</p>
            </div>
          )}
          
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              onSuggestionClick={onPatternSuggestion}
            />
          ))}
          
          {isLoading && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>
        
        {/* Input Area */}
        <div className="chat-input-area">
          <div className="input-group">
            <input
              type="text"
              className="form-control"
              placeholder="Ask for pattern suggestions..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              disabled={isLoading}
              aria-label="Chat message input"
            />
            <button
              className="btn btn-primary"
              onClick={sendMessage}
              disabled={!inputValue.trim() || isLoading}
              aria-label="Send message"
            >
              <i className="fas fa-paper-plane"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
```

#### AI Pattern Generator Modal

```tsx
interface AIPatternGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  onPatternGenerated: (pattern: string[], rationale: string) => void;
  language: 'en' | 'fr';
}

const AIPatternGenerator: React.FC<AIPatternGeneratorProps> = ({
  isOpen,
  onClose,
  onPatternGenerated,
  language
}) => {
  const [prompt, setPrompt] = useState('');
  const [suggestions, setSuggestions] = useState<AIPatternSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const generatePatterns = async () => {
    if (!prompt.trim()) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/ai/generate-pattern', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          language
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setSuggestions(data.patterns || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate patterns');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handlePatternSelect = (suggestion: AIPatternSuggestion) => {
    onPatternGenerated(suggestion.sequence, suggestion.rationale);
    onClose();
  };
  
  return (
    <div
      className={`modal fade ${isOpen ? 'show d-block' : ''}`}
      tabIndex={-1}
      role="dialog"
      aria-labelledby="ai-generator-title"
      aria-hidden={!isOpen}
      style={{ backgroundColor: isOpen ? 'rgba(0,0,0,0.5)' : 'transparent' }}
    >
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id="ai-generator-title">
              ✨ AI Pattern Generator
            </h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              aria-label="Close"
            />
          </div>
          
          <div className="modal-body">
            {/* Prompt Input */}
            <div className="mb-4">
              <label htmlFor="ai-prompt" className="form-label">
                Describe your pattern idea:
              </label>
              <textarea
                id="ai-prompt"
                className="form-control"
                rows={3}
                placeholder="E.g., 'ocean waves', 'birthday celebration', 'peaceful garden'"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={isLoading}
              />
              <div className="form-text">
                Be creative! Describe emotions, scenes, or concepts.
              </div>
            </div>
            
            {/* Generate Button */}
            <div className="mb-4">
              <button
                className="btn btn-primary"
                onClick={generatePatterns}
                disabled={!prompt.trim() || isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" />
                    Generating...
                  </>
                ) : (
                  'Generate Patterns'
                )}
              </button>
            </div>
            
            {/* Error Display */}
            {error && (
              <div className="alert alert-danger" role="alert">
                <i className="fas fa-exclamation-triangle me-2"></i>
                {error}
              </div>
            )}
            
            {/* Pattern Suggestions */}
            {suggestions.length > 0 && (
              <div className="pattern-suggestions">
                <h6 className="mb-3">AI Generated Patterns:</h6>
                <div className="row g-3">
                  {suggestions.map((suggestion, index) => (
                    <div key={index} className="col-12">
                      <AIPatternSuggestionCard
                        suggestion={suggestion}
                        onSelect={() => handlePatternSelect(suggestion)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
```

### 5. Accessibility Components

#### Voice Control Button

```tsx
interface VoiceControlButtonProps {
  isActive: boolean;
  isListening: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

const VoiceControlButton: React.FC<VoiceControlButtonProps> = ({
  isActive,
  isListening,
  onToggle,
  disabled = false
}) => {
  const getButtonState = () => {
    if (disabled) return 'disabled';
    if (isListening) return 'listening';
    if (isActive) return 'active';
    return 'inactive';
  };
  
  const getAriaLabel = () => {
    if (disabled) return 'Voice control not available';
    if (isListening) return 'Stop voice recognition';
    if (isActive) return 'Start voice recognition';
    return 'Enable voice control';
  };
  
  const state = getButtonState();
  
  return (
    <button
      className={`
        voice-control-btn btn 
        ${state === 'listening' ? 'btn-danger' : 'btn-outline-primary'}
        ${state === 'active' ? 'active' : ''}
      `}
      onClick={onToggle}
      disabled={disabled}
      aria-label={getAriaLabel()}
      aria-pressed={isActive}
    >
      <i 
        className={`
          fas 
          ${isListening ? 'fa-stop' : 'fa-microphone'}
          ${state === 'listening' ? 'pulse' : ''}
        `}
      />
      
      {isListening && (
        <span className="ms-2 d-none d-sm-inline">
          Listening...
        </span>
      )}
      
      {/* Visual indicator for voice activity */}
      {isListening && (
        <div className="voice-activity-indicator">
          <div className="sound-wave"></div>
        </div>
      )}
    </button>
  );
};
```

#### Skip Link Component

```tsx
const SkipLink: React.FC = () => {
  return (
    <a
      href="#main-content"
      className="skip-link position-absolute top-0 start-0 z-index-9999 btn btn-primary"
      style={{
        transform: 'translateY(-100%)',
        transition: 'transform 0.3s ease-in-out'
      }}
      onFocus={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
      }}
      onBlur={(e) => {
        e.currentTarget.style.transform = 'translateY(-100%)';
      }}
    >
      Skip to main content
    </a>
  );
};
```

## Component Styling

### CSS Custom Properties

```scss
:root {
  // Component-specific variables
  --emoji-size-sm: 24px;
  --emoji-size-md: 32px;
  --emoji-size-lg: 48px;
  --emoji-size-xl: 64px;
  
  --pattern-cell-size: 40px;
  --pattern-gap: 2px;
  --pattern-border-width: 1px;
  
  --touch-target-size: 44px;
  --focus-outline-width: 2px;
  --focus-outline-offset: 2px;
  
  // Animation variables
  --animation-duration-fast: 150ms;
  --animation-duration-normal: 300ms;
  --animation-duration-slow: 500ms;
  
  // Z-index scale
  --z-dropdown: 1000;
  --z-modal: 1050;
  --z-tooltip: 1070;
  --z-toast: 1080;
}
```

### Component-Specific Styles

```scss
// Pattern Canvas
.pattern-canvas-container {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  
  .pattern-canvas {
    border: var(--pattern-border-width) solid var(--bs-border-color);
    border-radius: var(--bs-border-radius);
    max-width: 100%;
    height: auto;
    
    &:focus {
      outline: var(--focus-outline-width) solid var(--bs-focus-ring-color);
      outline-offset: var(--focus-outline-offset);
    }
  }
}

// Emoji Picker Button
.emoji-picker-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: var(--touch-target-size);
  min-height: var(--touch-target-size);
  border: 1px solid transparent;
  border-radius: var(--bs-border-radius);
  background: transparent;
  transition: all var(--animation-duration-fast) ease;
  
  &:hover:not(:disabled) {
    background-color: var(--bs-light);
    transform: scale(1.05);
  }
  
  &:focus-visible {
    outline: var(--focus-outline-width) solid var(--bs-focus-ring-color);
    outline-offset: var(--focus-outline-offset);
  }
  
  &.selected {
    background-color: var(--bs-primary);
    color: white;
    border-color: var(--bs-primary);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .emoji-content {
    font-size: var(--emoji-size-md);
    line-height: 1;
    font-family: var(--font-family-emoji);
  }
  
  // Size variants
  &.emoji-btn-sm .emoji-content {
    font-size: var(--emoji-size-sm);
  }
  
  &.emoji-btn-lg .emoji-content {
    font-size: var(--emoji-size-lg);
  }
}

// Voice Control Button
.voice-control-btn {
  position: relative;
  min-width: var(--touch-target-size);
  min-height: var(--touch-target-size);
  
  .voice-activity-indicator {
    position: absolute;
    bottom: -2px;
    left: 50%;
    transform: translateX(-50%);
    width: 20px;
    height: 3px;
    
    .sound-wave {
      width: 100%;
      height: 100%;
      background: linear-gradient(
        90deg,
        transparent,
        var(--bs-danger),
        transparent
      );
      animation: soundWave 1s ease-in-out infinite;
    }
  }
}

@keyframes soundWave {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
}

// High Contrast Mode
@media (prefers-contrast: high) {
  .emoji-picker-btn {
    border-width: 2px;
    border-color: var(--bs-dark);
    
    &.selected {
      background-color: var(--bs-dark);
      border-color: var(--bs-dark);
    }
  }
  
  .pattern-canvas {
    border-width: 2px;
    border-color: var(--bs-dark);
  }
}

// Reduced Motion
@media (prefers-reduced-motion: reduce) {
  .emoji-picker-btn {
    transition: none;
    
    &:hover:not(:disabled) {
      transform: none;
    }
  }
  
  .sound-wave {
    animation: none;
  }
}
```

## Usage Examples

### Basic Pattern Creation

```tsx
const PatternCreationPage: React.FC = () => {
  const [pattern, setPattern] = useState<PatternState>(initialPattern);
  const [selectedPalette, setSelectedPalette] = useState('hearts-flowers');
  
  return (
    <AppLayout>
      <div className="container-fluid py-4">
        <div className="row">
          {/* Pattern Display */}
          <div className="col-lg-8">
            <div className="card">
              <div className="card-header">
                <h2 className="h4 mb-0">Your Pattern</h2>
              </div>
              <div className="card-body">
                <PatternCanvas
                  pattern={generatePatternGrid(pattern)}
                  readonly={false}
                  showGrid={true}
                />
              </div>
            </div>
            
            <div className="mt-4">
              <SequenceEditor
                sequence={pattern.sequence}
                insertionIndex={pattern.insertionIndex}
                onSequenceChange={(sequence) => 
                  setPattern(prev => ({ ...prev, sequence }))
                }
                onInsertionIndexChange={(index) =>
                  setPattern(prev => ({ ...prev, insertionIndex: index }))
                }
              />
            </div>
          </div>
          
          {/* Emoji Palettes */}
          <div className="col-lg-4">
            <EmojiPaletteCarousel
              palettes={emojiPalettes}
              activePalette={selectedPalette}
              onPaletteChange={setSelectedPalette}
              onEmojiSelect={(emoji) => {
                // Add emoji to sequence at insertion point
                const newSequence = [...pattern.sequence];
                newSequence.splice(pattern.insertionIndex, 0, emoji);
                setPattern(prev => ({
                  ...prev,
                  sequence: newSequence,
                  insertionIndex: prev.insertionIndex + 1
                }));
              }}
              language="en"
            />
          </div>
        </div>
      </div>
    </AppLayout>
  );
};
```

---

*This component library provides a comprehensive foundation for building accessible, performant, and beautiful emoji pattern creation interfaces using Bootstrap 5 and modern React patterns.*