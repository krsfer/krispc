/**
 * Comprehensive accessibility settings panel
 * WCAG 2.1 AA compliant configuration interface
 */
'use client';

import React, { useState } from 'react';
import { useAccessibility, useScreenReader } from '@/lib/hooks/accessibility/useAccessibility';

interface PreferenceItem {
  key: keyof typeof import('@/lib/accessibility/accessibility-context').DEFAULT_PREFERENCES;
  label: string;
  description: string;
  type: 'boolean' | 'select' | 'range';
  options?: Array<{ value: any; label: string }>;
  min?: number;
  max?: number;
  step?: number;
}

interface SettingsSection {
  id: string;
  title: string;
  description: string;
  preferences: PreferenceItem[];
}

const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    id: 'visual',
    title: 'Visual Accessibility',
    description: 'Settings for users with visual impairments or preferences',
    preferences: [
      {
        key: 'highContrast',
        label: 'High Contrast Mode',
        description: 'Increases color contrast for better visibility',
        type: 'boolean'
      },
      {
        key: 'largeText',
        label: 'Large Text',
        description: 'Increases text and UI element sizes',
        type: 'boolean'
      },
      {
        key: 'reducedMotion',
        label: 'Reduced Motion',
        description: 'Minimizes animations and transitions',
        type: 'boolean'
      },
      {
        key: 'colorBlindnessSupport',
        label: 'Color Blindness Support',
        description: 'Adjusts colors for different types of color blindness',
        type: 'select',
        options: [
          { value: 'none', label: 'None' },
          { value: 'protanopia', label: 'Protanopia (Red-blind)' },
          { value: 'deuteranopia', label: 'Deuteranopia (Green-blind)' },
          { value: 'tritanopia', label: 'Tritanopia (Blue-blind)' }
        ]
      }
    ]
  },
  {
    id: 'motor',
    title: 'Motor Accessibility',
    description: 'Settings for users with motor disabilities or mobility limitations',
    preferences: [
      {
        key: 'motorAssistance',
        label: 'Motor Assistance',
        description: 'Enables larger touch targets and gesture alternatives',
        type: 'boolean'
      },
      {
        key: 'gestureSize',
        label: 'Gesture Size',
        description: 'Size of touch and gesture areas',
        type: 'select',
        options: [
          { value: 'small', label: 'Small' },
          { value: 'normal', label: 'Normal' },
          { value: 'large', label: 'Large' }
        ]
      },
      {
        key: 'touchHoldDelay',
        label: 'Touch Hold Delay (ms)',
        description: 'Time required to register a long press',
        type: 'range',
        min: 200,
        max: 2000,
        step: 100
      },
      {
        key: 'doubleClickDelay',
        label: 'Double Click Delay (ms)',
        description: 'Maximum time between clicks for double-click',
        type: 'range',
        min: 100,
        max: 1000,
        step: 50
      }
    ]
  },
  {
    id: 'auditory',
    title: 'Auditory Accessibility',
    description: 'Settings for users with hearing impairments or audio preferences',
    preferences: [
      {
        key: 'audioFeedback',
        label: 'Audio Feedback',
        description: 'Provides sound cues for interactions',
        type: 'boolean'
      },
      {
        key: 'voiceNavigation',
        label: 'Voice Navigation',
        description: 'Enables voice command support',
        type: 'boolean'
      },
      {
        key: 'soundVolume',
        label: 'Sound Volume',
        description: 'Volume level for audio feedback',
        type: 'range',
        min: 0,
        max: 100,
        step: 5
      }
    ]
  },
  {
    id: 'cognitive',
    title: 'Cognitive Accessibility',
    description: 'Settings for users with cognitive disabilities or learning differences',
    preferences: [
      {
        key: 'simplifiedInterface',
        label: 'Simplified Interface',
        description: 'Reduces complexity and removes non-essential elements',
        type: 'boolean'
      },
      {
        key: 'showTooltips',
        label: 'Show Tooltips',
        description: 'Displays helpful tooltips and explanations',
        type: 'boolean'
      },
      {
        key: 'autoSave',
        label: 'Auto Save',
        description: 'Automatically saves work to prevent data loss',
        type: 'boolean'
      },
      {
        key: 'confirmActions',
        label: 'Confirm Actions',
        description: 'Asks for confirmation before destructive actions',
        type: 'boolean'
      }
    ]
  },
  {
    id: 'screenReader',
    title: 'Screen Reader Support',
    description: 'Settings for users who rely on screen reading software',
    preferences: [
      {
        key: 'screenReader',
        label: 'Screen Reader Mode',
        description: 'Optimizes interface for screen reader usage',
        type: 'boolean'
      },
      {
        key: 'announceChanges',
        label: 'Announce Changes',
        description: 'Announces interface changes and updates',
        type: 'boolean'
      },
      {
        key: 'verboseDescriptions',
        label: 'Verbose Descriptions',
        description: 'Provides detailed descriptions of visual elements',
        type: 'boolean'
      }
    ]
  },
  {
    id: 'keyboard',
    title: 'Keyboard Navigation',
    description: 'Settings for users who navigate primarily with keyboard',
    preferences: [
      {
        key: 'keyboardOnly',
        label: 'Keyboard Only Mode',
        description: 'Optimizes interface for keyboard-only navigation',
        type: 'boolean'
      },
      {
        key: 'focusIndicators',
        label: 'Enhanced Focus Indicators',
        description: 'Shows clear visual indicators for focused elements',
        type: 'boolean'
      },
      {
        key: 'skipLinks',
        label: 'Skip Navigation Links',
        description: 'Provides shortcuts to jump to main content areas',
        type: 'boolean'
      }
    ]
  }
];

export const AccessibilitySettings: React.FC = () => {
  const { 
    preferences, 
    capabilities, 
    updatePreference, 
    resetToDefaults, 
    saveUserPreferences 
  } = useAccessibility();
  
  const { announce, announceAction } = useScreenReader();
  const [activeSection, setActiveSection] = useState<string>('visual');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const handlePreferenceChange = (key: any, value: any) => {
    updatePreference(key, value);
    setHasUnsavedChanges(true);
    announce(`Changed ${key} to ${value}`, 'polite');
  };

  const handleSave = async () => {
    try {
      await saveUserPreferences();
      setHasUnsavedChanges(false);
      announceAction('Settings saved successfully');
    } catch (error) {
      announceAction('Failed to save settings');
    }
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all accessibility settings to defaults?')) {
      resetToDefaults();
      setHasUnsavedChanges(false);
      announceAction('Settings reset to defaults');
    }
  };

  const renderPreference = (pref: PreferenceItem) => {
    const currentValue = preferences[pref.key as keyof typeof preferences];
    const prefId = `pref-${pref.key}`;

    switch (pref.type) {
      case 'boolean':
        return (
          <div key={pref.key} className="preference-item">
            <div className="preference-control">
              <input
                type="checkbox"
                id={prefId}
                checked={currentValue as boolean}
                onChange={(e) => handlePreferenceChange(pref.key, e.target.checked)}
                aria-describedby={`${prefId}-desc`}
                className="preference-checkbox"
              />
              <label htmlFor={prefId} className="preference-label">
                {pref.label}
              </label>
            </div>
            <div id={`${prefId}-desc`} className="preference-description">
              {pref.description}
            </div>
          </div>
        );

      case 'select':
        return (
          <div key={pref.key} className="preference-item">
            <label htmlFor={prefId} className="preference-label">
              {pref.label}
            </label>
            <select
              id={prefId}
              value={currentValue as string}
              onChange={(e) => handlePreferenceChange(pref.key, e.target.value)}
              aria-describedby={`${prefId}-desc`}
              className="preference-select"
            >
              {pref.options?.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <div id={`${prefId}-desc`} className="preference-description">
              {pref.description}
            </div>
          </div>
        );

      case 'range':
        return (
          <div key={pref.key} className="preference-item">
            <label htmlFor={prefId} className="preference-label">
              {pref.label}: {currentValue}
            </label>
            <input
              type="range"
              id={prefId}
              min={pref.min}
              max={pref.max}
              step={pref.step}
              value={currentValue as number}
              onChange={(e) => handlePreferenceChange(pref.key, parseInt(e.target.value))}
              aria-describedby={`${prefId}-desc`}
              className="preference-range"
            />
            <div id={`${prefId}-desc`} className="preference-description">
              {pref.description}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="accessibility-settings">
      <header className="settings-header">
        <h1>Accessibility Settings</h1>
        <p>
          Configure the app to meet your specific accessibility needs. 
          These settings help ensure the best possible experience for users with disabilities.
        </p>
      </header>

      {/* Capabilities Info */}
      <section className="capabilities-info" aria-labelledby="capabilities-heading">
        <h2 id="capabilities-heading">Browser Capabilities</h2>
        <div className="capabilities-grid">
          <div className="capability">
            <span className="capability-label">Touch Support:</span>
            <span className={`capability-status ${capabilities.touchSupported ? 'supported' : 'not-supported'}`}>
              {capabilities.touchSupported ? 'Available' : 'Not Available'}
            </span>
          </div>
          <div className="capability">
            <span className="capability-label">Speech Recognition:</span>
            <span className={`capability-status ${capabilities.speechRecognitionSupported ? 'supported' : 'not-supported'}`}>
              {capabilities.speechRecognitionSupported ? 'Available' : 'Not Available'}
            </span>
          </div>
          <div className="capability">
            <span className="capability-label">Speech Synthesis:</span>
            <span className={`capability-status ${capabilities.speechSynthesisSupported ? 'supported' : 'not-supported'}`}>
              {capabilities.speechSynthesisSupported ? 'Available' : 'Not Available'}
            </span>
          </div>
          <div className="capability">
            <span className="capability-label">Vibration:</span>
            <span className={`capability-status ${capabilities.vibrationSupported ? 'supported' : 'not-supported'}`}>
              {capabilities.vibrationSupported ? 'Available' : 'Not Available'}
            </span>
          </div>
        </div>
      </section>

      <div className="settings-content">
        {/* Navigation */}
        <nav className="settings-navigation" aria-label="Settings sections">
          <ul role="tablist">
            {SETTINGS_SECTIONS.map((section) => (
              <li key={section.id} role="presentation">
                <button
                  role="tab"
                  aria-selected={activeSection === section.id}
                  aria-controls={`panel-${section.id}`}
                  id={`tab-${section.id}`}
                  onClick={() => {
                    setActiveSection(section.id);
                    announce(`Switched to ${section.title} settings`, 'polite');
                  }}
                  className={`section-tab ${activeSection === section.id ? 'active' : ''}`}
                >
                  {section.title}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Settings Panels */}
        <div className="settings-panels">
          {SETTINGS_SECTIONS.map((section) => (
            <div
              key={section.id}
              id={`panel-${section.id}`}
              role="tabpanel"
              aria-labelledby={`tab-${section.id}`}
              hidden={activeSection !== section.id}
              className="settings-panel"
            >
              <h3>{section.title}</h3>
              <p className="section-description">{section.description}</p>
              
              <div className="preferences-list">
                {section.preferences.map(renderPreference)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <footer className="settings-footer">
        {hasUnsavedChanges && (
          <div className="unsaved-changes-notice" role="status" aria-live="polite">
            You have unsaved changes
          </div>
        )}
        
        <div className="settings-actions">
          <button 
            onClick={handleSave}
            disabled={!hasUnsavedChanges}
            className="save-button primary"
            aria-describedby="save-description"
          >
            Save Settings
          </button>
          <span id="save-description" className="sr-only">
            Save your accessibility preferences
          </span>
          
          <button 
            onClick={handleReset}
            className="reset-button secondary"
            aria-describedby="reset-description"
          >
            Reset to Defaults
          </button>
          <span id="reset-description" className="sr-only">
            Reset all accessibility settings to their default values
          </span>
        </div>
      </footer>

      {/* Live region for announcements */}
      <div 
        aria-live="polite" 
        aria-atomic="true" 
        className="sr-only"
        id="settings-announcements"
      />
    </div>
  );
};

export default AccessibilitySettings;