/**
 * Comprehensive accessibility context and preferences management
 * WCAG 2.1 AA compliance support
 */

export interface AccessibilityPreferences {
  // Visual accessibility
  highContrast: boolean;
  largeText: boolean;
  reducedMotion: boolean;
  colorBlindnessSupport: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
  
  // Motor accessibility
  motorAssistance: boolean;
  gestureSize: 'small' | 'normal' | 'large';
  touchHoldDelay: number; // milliseconds
  doubleClickDelay: number; // milliseconds
  
  // Auditory accessibility
  audioFeedback: boolean;
  voiceNavigation: boolean;
  soundVolume: number; // 0-100
  
  // Cognitive accessibility
  simplifiedInterface: boolean;
  showTooltips: boolean;
  autoSave: boolean;
  confirmActions: boolean;
  
  // Screen reader support
  screenReader: boolean;
  announceChanges: boolean;
  verboseDescriptions: boolean;
  
  // Keyboard navigation
  keyboardOnly: boolean;
  focusIndicators: boolean;
  skipLinks: boolean;
}

export interface AccessibilityState {
  preferences: AccessibilityPreferences;
  capabilities: AccessibilityCapabilities;
  isInitialized: boolean;
}

export interface AccessibilityCapabilities {
  touchSupported: boolean;
  speechSynthesisSupported: boolean;
  speechRecognitionSupported: boolean;
  vibrationSupported: boolean;
  audioContextSupported: boolean;
  preferredColorScheme: 'light' | 'dark' | 'no-preference';
  reducedMotionPreferred: boolean;
}

export interface AccessibilityActions {
  updatePreference: <K extends keyof AccessibilityPreferences>(
    key: K, 
    value: AccessibilityPreferences[K]
  ) => void;
  togglePreference: (key: keyof AccessibilityPreferences) => void;
  resetToDefaults: () => void;
  loadUserPreferences: () => Promise<void>;
  saveUserPreferences: () => Promise<void>;
  announceToScreenReader: (message: string, priority?: 'polite' | 'assertive') => void;
  setFocusManagement: (enabled: boolean) => void;
}

const DEFAULT_PREFERENCES: AccessibilityPreferences = {
  // Visual
  highContrast: false,
  largeText: false,
  reducedMotion: false,
  colorBlindnessSupport: 'none',
  
  // Motor
  motorAssistance: false,
  gestureSize: 'normal',
  touchHoldDelay: 500,
  doubleClickDelay: 300,
  
  // Auditory
  audioFeedback: false,
  voiceNavigation: false,
  soundVolume: 70,
  
  // Cognitive
  simplifiedInterface: false,
  showTooltips: true,
  autoSave: true,
  confirmActions: false,
  
  // Screen reader
  screenReader: false,
  announceChanges: true,
  verboseDescriptions: false,
  
  // Keyboard
  keyboardOnly: false,
  focusIndicators: true,
  skipLinks: true
};

export class AccessibilityManager {
  private state: AccessibilityState;
  private listeners: Set<(state: AccessibilityState) => void> = new Set();
  private focusTracker: FocusTracker | null = null;
  private announcementQueue: string[] = [];
  private isAnnouncing = false;

  constructor() {
    this.state = {
      preferences: { ...DEFAULT_PREFERENCES },
      capabilities: this.detectCapabilities(),
      isInitialized: false
    };
  }

  /**
   * Initialize accessibility system
   */
  async initialize(): Promise<void> {
    // Detect system preferences
    await this.detectSystemPreferences();
    
    // Load user preferences
    await this.loadUserPreferences();
    
    // Apply initial settings
    this.applyAccessibilitySettings();
    
    // Set up focus management
    this.initializeFocusManagement();
    
    // Set up keyboard navigation
    this.initializeKeyboardNavigation();
    
    this.state.isInitialized = true;
    this.notifyListeners();
  }

  /**
   * Detect browser and system capabilities
   */
  private detectCapabilities(): AccessibilityCapabilities {
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const hasSpeechSynthesis = 'speechSynthesis' in window;
    const hasSpeechRecognition = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
    const hasVibration = 'vibrate' in navigator;
    const hasAudioContext = 'AudioContext' in window || 'webkitAudioContext' in window;
    
    // Detect system preferences
    const prefersColorScheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 
                              window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'no-preference';
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    return {
      touchSupported: hasTouch,
      speechSynthesisSupported: hasSpeechSynthesis,
      speechRecognitionSupported: hasSpeechRecognition,
      vibrationSupported: hasVibration,
      audioContextSupported: hasAudioContext,
      preferredColorScheme: prefersColorScheme,
      reducedMotionPreferred: prefersReducedMotion
    };
  }

  /**
   * Detect system accessibility preferences
   */
  private async detectSystemPreferences(): Promise<void> {
    // Auto-enable reduced motion if system preference is set
    if (this.state.capabilities.reducedMotionPreferred) {
      this.state.preferences.reducedMotion = true;
    }

    // Try to detect screen reader usage
    try {
      // Check for common screen reader indicators
      const hasAriaSupport = document.body && 'ariaLabel' in document.body;
      const hasScreenReaderClass = document.documentElement.classList.contains('sr-only') ||
                                  document.documentElement.classList.contains('screen-reader');
      
      if (hasAriaSupport || hasScreenReaderClass) {
        this.state.preferences.screenReader = true;
        this.state.preferences.announceChanges = true;
      }
    } catch (error) {
      console.warn('Could not detect screen reader preferences:', error);
    }
  }

  /**
   * Apply accessibility settings to DOM
   */
  private applyAccessibilitySettings(): void {
    const { preferences } = this.state;
    const root = document.documentElement;
    const body = document.body;

    // Visual preferences
    root.classList.toggle('high-contrast', preferences.highContrast);
    root.classList.toggle('large-text', preferences.largeText);
    root.classList.toggle('reduced-motion', preferences.reducedMotion);
    root.classList.toggle('motor-assistance', preferences.motorAssistance);
    root.classList.toggle('simplified-interface', preferences.simplifiedInterface);
    root.classList.toggle('keyboard-only', preferences.keyboardOnly);

    // Color blindness support
    root.setAttribute('data-colorblind-filter', preferences.colorBlindnessSupport);

    // Gesture size
    root.setAttribute('data-gesture-size', preferences.gestureSize);

    // CSS custom properties for dynamic values
    root.style.setProperty('--touch-hold-delay', `${preferences.touchHoldDelay}ms`);
    root.style.setProperty('--double-click-delay', `${preferences.doubleClickDelay}ms`);
    root.style.setProperty('--sound-volume', preferences.soundVolume.toString());

    // Focus indicators
    if (preferences.focusIndicators) {
      this.addFocusStyles();
    }

    // Skip links
    if (preferences.skipLinks) {
      this.addSkipLinks();
    }
  }

  /**
   * Add enhanced focus styles
   */
  private addFocusStyles(): void {
    const styleId = 'accessibility-focus-styles';
    let existingStyle = document.getElementById(styleId);
    
    if (!existingStyle) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        :focus-visible {
          outline: 3px solid #0066cc;
          outline-offset: 2px;
          border-radius: 3px;
        }
        
        .keyboard-only *:focus {
          outline: 3px solid #0066cc;
          outline-offset: 2px;
          border-radius: 3px;
        }
        
        .high-contrast :focus-visible {
          outline: 4px solid #ffff00;
          outline-offset: 3px;
        }
        
        .large-text :focus-visible {
          outline-width: 4px;
          outline-offset: 3px;
        }
      `;
      document.head.appendChild(style);
    }
  }

  /**
   * Add skip navigation links
   */
  private addSkipLinks(): void {
    const skipLinksId = 'accessibility-skip-links';
    let existingSkipLinks = document.getElementById(skipLinksId);
    
    if (!existingSkipLinks) {
      const skipContainer = document.createElement('div');
      skipContainer.id = skipLinksId;
      skipContainer.className = 'skip-links';
      skipContainer.innerHTML = `
        <a href="#main-content" class="skip-link">Skip to main content</a>
        <a href="#navigation" class="skip-link">Skip to navigation</a>
        <a href="#footer" class="skip-link">Skip to footer</a>
      `;
      
      // Add styles for skip links
      const style = document.createElement('style');
      style.textContent = `
        .skip-links {
          position: absolute;
          top: 0;
          left: 0;
          z-index: 10000;
        }
        
        .skip-link {
          position: absolute;
          top: -40px;
          left: 6px;
          background: #000;
          color: #fff;
          padding: 8px;
          text-decoration: none;
          border-radius: 0 0 4px 4px;
        }
        
        .skip-link:focus {
          top: 0;
        }
      `;
      document.head.appendChild(style);
      
      document.body.insertBefore(skipContainer, document.body.firstChild);
    }
  }

  /**
   * Initialize focus management system
   */
  private initializeFocusManagement(): void {
    this.focusTracker = new FocusTracker();
    this.focusTracker.initialize();
  }

  /**
   * Initialize keyboard navigation
   */
  private initializeKeyboardNavigation(): void {
    document.addEventListener('keydown', this.handleKeyboardNavigation.bind(this));
  }

  /**
   * Handle keyboard navigation events
   */
  private handleKeyboardNavigation(event: KeyboardEvent): void {
    const { preferences } = this.state;
    
    // Enhanced keyboard navigation for accessibility
    if (preferences.keyboardOnly || preferences.motorAssistance) {
      switch (event.key) {
        case 'Tab':
          this.handleTabNavigation(event);
          break;
        case 'Enter':
        case ' ':
          this.handleActivation(event);
          break;
        case 'Escape':
          this.handleEscape(event);
          break;
        case 'ArrowUp':
        case 'ArrowDown':
        case 'ArrowLeft':
        case 'ArrowRight':
          this.handleArrowNavigation(event);
          break;
      }
    }
  }

  /**
   * Handle tab navigation
   */
  private handleTabNavigation(event: KeyboardEvent): void {
    // Enhanced tab navigation logic
    const focusableElements = this.getFocusableElements();
    const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement);
    
    if (currentIndex === -1) return;
    
    const nextIndex = event.shiftKey ? 
      (currentIndex - 1 + focusableElements.length) % focusableElements.length :
      (currentIndex + 1) % focusableElements.length;
    
    const nextElement = focusableElements[nextIndex];
    if (nextElement) {
      event.preventDefault();
      nextElement.focus();
      
      // Announce focus change for screen readers
      if (this.state.preferences.announceChanges) {
        this.announceToScreenReader(`Focused on ${this.getElementDescription(nextElement)}`);
      }
    }
  }

  /**
   * Handle activation (Enter/Space)
   */
  private handleActivation(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;
    
    if (target.matches('button, [role="button"], a, [tabindex]')) {
      // Provide audio feedback if enabled
      if (this.state.preferences.audioFeedback) {
        this.playActivationSound();
      }
      
      // Announce action for screen readers
      if (this.state.preferences.announceChanges) {
        this.announceToScreenReader(`Activated ${this.getElementDescription(target)}`);
      }
    }
  }

  /**
   * Handle escape key
   */
  private handleEscape(event: KeyboardEvent): void {
    // Close modals, menus, etc.
    const openModal = document.querySelector('[role="dialog"][aria-hidden="false"]');
    if (openModal) {
      const closeButton = openModal.querySelector('[aria-label*="close"], .close, .modal-close');
      if (closeButton) {
        (closeButton as HTMLElement).click();
      }
    }
  }

  /**
   * Handle arrow key navigation
   */
  private handleArrowNavigation(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;
    
    // Handle arrow navigation in custom components
    if (target.matches('[role="grid"], [role="listbox"], [role="menu"]')) {
      event.preventDefault();
      // Custom arrow navigation logic would go here
    }
  }

  /**
   * Get all focusable elements
   */
  private getFocusableElements(): HTMLElement[] {
    const selector = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[role="button"]:not([disabled])',
      '[role="link"]:not([disabled])'
    ].join(', ');
    
    return Array.from(document.querySelectorAll(selector))
      .filter(el => this.isElementVisible(el as HTMLElement)) as HTMLElement[];
  }

  /**
   * Check if element is visible
   */
  private isElementVisible(element: HTMLElement): boolean {
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0' &&
           element.offsetWidth > 0 && 
           element.offsetHeight > 0;
  }

  /**
   * Get accessible description of element
   */
  private getElementDescription(element: HTMLElement): string {
    return element.getAttribute('aria-label') ||
           element.getAttribute('title') ||
           element.textContent?.trim() ||
           element.tagName.toLowerCase();
  }

  /**
   * Play activation sound
   */
  private playActivationSound(): void {
    if (!this.state.capabilities.audioContextSupported) return;
    
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      gainNode.gain.setValueAtTime(this.state.preferences.soundVolume / 1000, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (error) {
      console.warn('Could not play activation sound:', error);
    }
  }

  /**
   * Announce message to screen reader
   */
  announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    if (!this.state.preferences.announceChanges) return;
    
    // Queue announcement to avoid overwhelming screen readers
    this.announcementQueue.push(message);
    
    if (!this.isAnnouncing) {
      this.processAnnouncementQueue(priority);
    }
  }

  /**
   * Process announcement queue
   */
  private async processAnnouncementQueue(priority: 'polite' | 'assertive'): Promise<void> {
    if (this.announcementQueue.length === 0) return;
    
    this.isAnnouncing = true;
    
    while (this.announcementQueue.length > 0) {
      const message = this.announcementQueue.shift()!;
      
      // Create announcement element
      const announcement = document.createElement('div');
      announcement.setAttribute('aria-live', priority);
      announcement.setAttribute('aria-atomic', 'true');
      announcement.className = 'sr-only';
      announcement.textContent = message;
      
      document.body.appendChild(announcement);
      
      // Wait for screen reader to process
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Clean up
      document.body.removeChild(announcement);
      
      // Delay between announcements
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    this.isAnnouncing = false;
  }

  /**
   * Update preference
   */
  updatePreference<K extends keyof AccessibilityPreferences>(
    key: K, 
    value: AccessibilityPreferences[K]
  ): void {
    this.state.preferences[key] = value;
    this.applyAccessibilitySettings();
    this.saveUserPreferences();
    this.notifyListeners();
  }

  /**
   * Toggle boolean preference
   */
  togglePreference(key: keyof AccessibilityPreferences): void {
    const currentValue = this.state.preferences[key];
    if (typeof currentValue === 'boolean') {
      this.updatePreference(key, !currentValue as any);
    }
  }

  /**
   * Reset to default preferences
   */
  resetToDefaults(): void {
    this.state.preferences = { ...DEFAULT_PREFERENCES };
    this.applyAccessibilitySettings();
    this.saveUserPreferences();
    this.notifyListeners();
  }

  /**
   * Load user preferences from storage
   */
  async loadUserPreferences(): Promise<void> {
    try {
      const stored = localStorage.getItem('emoty-accessibility-preferences');
      if (stored) {
        const preferences = JSON.parse(stored);
        this.state.preferences = { ...DEFAULT_PREFERENCES, ...preferences };
      }
    } catch (error) {
      console.warn('Could not load accessibility preferences:', error);
    }
  }

  /**
   * Save user preferences to storage
   */
  async saveUserPreferences(): Promise<void> {
    try {
      localStorage.setItem(
        'emoty-accessibility-preferences', 
        JSON.stringify(this.state.preferences)
      );
    } catch (error) {
      console.warn('Could not save accessibility preferences:', error);
    }
  }

  /**
   * Add state change listener
   */
  addListener(listener: (state: AccessibilityState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.state);
      } catch (error) {
        console.error('Accessibility listener error:', error);
      }
    });
  }

  /**
   * Get current state
   */
  getState(): AccessibilityState {
    return { ...this.state };
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.listeners.clear();
    this.focusTracker?.dispose();
    this.announcementQueue = [];
  }
}

/**
 * Focus tracking utility
 */
class FocusTracker {
  private lastFocusedElement: HTMLElement | null = null;
  private focusHistory: HTMLElement[] = [];

  initialize(): void {
    document.addEventListener('focusin', this.handleFocusIn.bind(this));
    document.addEventListener('focusout', this.handleFocusOut.bind(this));
  }

  private handleFocusIn(event: FocusEvent): void {
    const target = event.target as HTMLElement;
    if (target && target !== this.lastFocusedElement) {
      this.lastFocusedElement = target;
      this.focusHistory.push(target);
      
      // Keep only last 10 focused elements
      if (this.focusHistory.length > 10) {
        this.focusHistory.shift();
      }
    }
  }

  private handleFocusOut(event: FocusEvent): void {
    // Focus tracking logic
  }

  getLastFocusedElement(): HTMLElement | null {
    return this.lastFocusedElement;
  }

  getFocusHistory(): HTMLElement[] {
    return [...this.focusHistory];
  }

  dispose(): void {
    document.removeEventListener('focusin', this.handleFocusIn.bind(this));
    document.removeEventListener('focusout', this.handleFocusOut.bind(this));
  }
}

// Export singleton
export const accessibilityManager = new AccessibilityManager();