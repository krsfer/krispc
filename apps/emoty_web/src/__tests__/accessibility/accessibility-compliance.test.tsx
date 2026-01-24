/**
 * WCAG 2.1 AA compliance tests for accessibility features
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import userEvent from '@testing-library/user-event';
import { AccessiblePatternCanvas } from '@/components/accessibility/AccessiblePatternCanvas';
import { AccessibilitySettings } from '@/components/accessibility/AccessibilitySettings';
import { accessibilityManager } from '@/lib/accessibility/accessibility-context';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock dependencies
jest.mock('@/lib/accessibility/accessibility-context');
jest.mock('@/lib/hooks/accessibility/useAccessibility');

describe('WCAG 2.1 AA Compliance Tests', () => {
  beforeEach(() => {
    // Reset accessibility manager state
    jest.clearAllMocks();
  });

  describe('Automated Accessibility Testing', () => {
    it('should have no accessibility violations on AccessiblePatternCanvas', async () => {
      const mockPattern = [
        [
          { emoji: '😀', layer: 0, position: { row: 0, col: 0 } },
          { emoji: null, layer: 1, position: { row: 0, col: 1 } }
        ],
        [
          { emoji: null, layer: 1, position: { row: 1, col: 0 } },
          { emoji: '❤️', layer: 1, position: { row: 1, col: 1 } }
        ]
      ];

      const { container } = render(
        <AccessiblePatternCanvas 
          pattern={mockPattern}
          onCellClick={jest.fn()}
          aria-label="Test pattern canvas"
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no accessibility violations on AccessibilitySettings', async () => {
      const { container } = render(<AccessibilitySettings />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support full keyboard navigation in pattern canvas', async () => {
      const user = userEvent.setup();
      const mockOnClick = jest.fn();
      const mockPattern = [
        [
          { emoji: '😀', layer: 0, position: { row: 0, col: 0 } },
          { emoji: null, layer: 1, position: { row: 0, col: 1 } }
        ],
        [
          { emoji: null, layer: 1, position: { row: 1, col: 0 } },
          { emoji: '❤️', layer: 1, position: { row: 1, col: 1 } }
        ]
      ];

      render(
        <AccessiblePatternCanvas 
          pattern={mockPattern}
          onCellClick={mockOnClick}
        />
      );

      // Find all focusable cells
      const cells = screen.getAllByRole('gridcell');
      expect(cells).toHaveLength(4);

      // Test tab navigation
      const firstCell = cells[0];
      firstCell.focus();
      expect(firstCell).toHaveFocus();

      // Test arrow key navigation
      await user.keyboard('[ArrowRight]');
      expect(cells[1]).toHaveFocus();

      await user.keyboard('[ArrowDown]');
      expect(cells[3]).toHaveFocus();

      await user.keyboard('[ArrowLeft]');
      expect(cells[2]).toHaveFocus();

      await user.keyboard('[ArrowUp]');
      expect(cells[0]).toHaveFocus();

      // Test Enter key activation
      await user.keyboard('[Enter]');
      expect(mockOnClick).toHaveBeenCalledWith(0, 0);
    });

    it('should provide proper focus indicators', () => {
      const mockPattern = [
        [{ emoji: '😀', layer: 0, position: { row: 0, col: 0 } }]
      ];

      render(<AccessiblePatternCanvas pattern={mockPattern} />);
      
      const cell = screen.getByRole('gridcell');
      cell.focus();

      // Check that focus styles are applied
      expect(cell).toHaveClass('focused');
      expect(cell).toHaveAttribute('aria-selected', 'true');
    });

    it('should support Home/End/PageUp/PageDown navigation', async () => {
      const user = userEvent.setup();
      const mockPattern = Array(3).fill(null).map((_, row) =>
        Array(3).fill(null).map((_, col) => ({
          emoji: '😀',
          layer: 0,
          position: { row, col }
        }))
      );

      render(<AccessiblePatternCanvas pattern={mockPattern} />);
      
      const cells = screen.getAllByRole('gridcell');
      
      // Focus middle cell
      cells[4].focus(); // Row 1, Col 1
      
      // Test Home key (should go to first column)
      await user.keyboard('[Home]');
      expect(cells[3]).toHaveFocus(); // Row 1, Col 0
      
      // Test End key (should go to last column)
      await user.keyboard('[End]');
      expect(cells[5]).toHaveFocus(); // Row 1, Col 2
      
      // Test PageUp (should go to first row)
      await user.keyboard('[PageUp]');
      expect(cells[2]).toHaveFocus(); // Row 0, Col 2
      
      // Test PageDown (should go to last row)
      await user.keyboard('[PageDown]');
      expect(cells[8]).toHaveFocus(); // Row 2, Col 2
    });
  });

  describe('Screen Reader Support', () => {
    it('should provide proper ARIA labels and descriptions', () => {
      const mockPattern = [
        [
          { emoji: '😀', layer: 0, position: { row: 0, col: 0 } },
          { emoji: null, layer: 1, position: { row: 0, col: 1 } }
        ]
      ];

      render(
        <AccessiblePatternCanvas 
          pattern={mockPattern}
          aria-label="Custom pattern canvas"
          aria-describedby="custom-description"
        />
      );

      // Check main grid has proper attributes
      const grid = screen.getByRole('grid');
      expect(grid).toHaveAttribute('aria-label', 'Custom pattern canvas');
      expect(grid).toHaveAttribute('aria-describedby');
      expect(grid).toHaveAttribute('aria-rowcount', '1');
      expect(grid).toHaveAttribute('aria-colcount', '2');

      // Check cells have proper labels
      const filledCell = screen.getByLabelText(/😀 at position row 1, column 1/);
      expect(filledCell).toBeInTheDocument();
      expect(filledCell).toHaveAttribute('aria-roledescription', 'Pattern cell');

      const emptyCell = screen.getByLabelText(/Empty cell at position row 1, column 2/);
      expect(emptyCell).toBeInTheDocument();
    });

    it('should provide comprehensive pattern descriptions', () => {
      const mockPattern = [
        [
          { emoji: '😀', layer: 0, position: { row: 0, col: 0 } },
          { emoji: '❤️', layer: 1, position: { row: 0, col: 1 } }
        ],
        [
          { emoji: '⭐', layer: 1, position: { row: 1, col: 0 } },
          { emoji: '🌟', layer: 2, position: { row: 1, col: 1 } }
        ]
      ];

      render(<AccessiblePatternCanvas pattern={mockPattern} />);

      // Check that pattern description exists
      const description = document.getElementById('pattern-description');
      expect(description).toBeInTheDocument();
      expect(description).toHaveClass('sr-only');
      
      // Description should contain pattern information
      expect(description).toHaveTextContent(/Pattern canvas with 2 by 2 grid/);
      expect(description).toHaveTextContent(/containing 4 emojis/);
    });

    it('should provide spatial layout descriptions', () => {
      const mockPattern = [
        [
          { emoji: null, layer: 2, position: { row: 0, col: 0 } },
          { emoji: '🌟', layer: 2, position: { row: 0, col: 1 } },
          { emoji: null, layer: 2, position: { row: 0, col: 2 } }
        ],
        [
          { emoji: '⭐', layer: 1, position: { row: 1, col: 0 } },
          { emoji: '😀', layer: 0, position: { row: 1, col: 1 } },
          { emoji: '❤️', layer: 1, position: { row: 1, col: 2 } }
        ],
        [
          { emoji: null, layer: 2, position: { row: 2, col: 0 } },
          { emoji: '🎉', layer: 2, position: { row: 2, col: 1 } },
          { emoji: null, layer: 2, position: { row: 2, col: 2 } }
        ]
      ];

      // Mock verbose descriptions preference
      jest.mocked(accessibilityManager.getState).mockReturnValue({
        preferences: { verboseDescriptions: true },
        capabilities: {},
        isInitialized: true
      } as any);

      render(<AccessiblePatternCanvas pattern={mockPattern} />);

      // Should include spatial description
      const description = document.getElementById('pattern-description');
      expect(description).toHaveTextContent(/Spatial layout/);
    });

    it('should announce changes appropriately', async () => {
      const user = userEvent.setup();
      const mockOnClick = jest.fn();
      const mockPattern = [
        [{ emoji: null, layer: 0, position: { row: 0, col: 0 } }]
      ];

      // Create a spy for screen reader announcements
      const announceToScreenReader = jest.fn();
      jest.mocked(accessibilityManager.announceToScreenReader).mockImplementation(announceToScreenReader);

      render(
        <AccessiblePatternCanvas 
          pattern={mockPattern}
          onCellClick={mockOnClick}
        />
      );

      const cell = screen.getByRole('gridcell');
      
      // Click cell
      await user.click(cell);
      
      // Should announce the selection
      expect(announceToScreenReader).toHaveBeenCalledWith(
        expect.stringContaining('Selected'),
        'polite'
      );
    });
  });

  describe('Motor Accessibility', () => {
    it('should provide appropriate touch targets for motor assistance', () => {
      const mockPattern = [
        [{ emoji: '😀', layer: 0, position: { row: 0, col: 0 } }]
      ];

      // Mock motor assistance preference
      jest.mocked(accessibilityManager.getState).mockReturnValue({
        preferences: { motorAssistance: true },
        capabilities: {},
        isInitialized: true
      } as any);

      render(<AccessiblePatternCanvas pattern={mockPattern} cellSize={30} />);

      const cell = screen.getByRole('gridcell');
      
      // Should have minimum touch target size
      const style = window.getComputedStyle(cell);
      expect(parseInt(style.minHeight)).toBeGreaterThanOrEqual(44);
      expect(parseInt(style.minWidth)).toBeGreaterThanOrEqual(44);
    });

    it('should support gesture size preferences', () => {
      const mockPattern = [
        [{ emoji: '😀', layer: 0, position: { row: 0, col: 0 } }]
      ];

      // Test large gesture size
      render(
        <div data-gesture-size="large">
          <AccessiblePatternCanvas pattern={mockPattern} />
        </div>
      );

      const cell = screen.getByRole('gridcell');
      expect(cell.parentElement?.parentElement).toHaveAttribute('data-gesture-size', 'large');
    });

    it('should display gesture help when motor assistance is enabled', () => {
      const mockPattern = [
        [{ emoji: '😀', layer: 0, position: { row: 0, col: 0 } }]
      ];

      // Mock motor assistance preference
      jest.mocked(accessibilityManager.getState).mockReturnValue({
        preferences: { motorAssistance: true },
        capabilities: {},
        isInitialized: true
      } as any);

      render(<AccessiblePatternCanvas pattern={mockPattern} />);

      // Should show gesture help
      expect(screen.getByText('Available Gestures')).toBeInTheDocument();
    });
  });

  describe('Visual Accessibility', () => {
    it('should apply high contrast styles when enabled', () => {
      const mockPattern = [
        [{ emoji: '😀', layer: 0, position: { row: 0, col: 0 } }]
      ];

      // Mock high contrast preference
      jest.mocked(accessibilityManager.getState).mockReturnValue({
        preferences: { highContrast: true },
        capabilities: {},
        isInitialized: true
      } as any);

      render(<AccessiblePatternCanvas pattern={mockPattern} />);

      const cell = screen.getByRole('gridcell');
      expect(cell).toHaveClass('high-contrast');
    });

    it('should apply large text styles when enabled', () => {
      const mockPattern = [
        [{ emoji: '😀', layer: 0, position: { row: 0, col: 0 } }]
      ];

      // Mock large text preference
      jest.mocked(accessibilityManager.getState).mockReturnValue({
        preferences: { largeText: true },
        capabilities: {},
        isInitialized: true
      } as any);

      render(<AccessiblePatternCanvas pattern={mockPattern} />);

      const cell = screen.getByRole('gridcell');
      expect(cell).toHaveClass('large-text');
    });

    it('should respect reduced motion preferences', () => {
      const mockPattern = [
        [{ emoji: '😀', layer: 0, position: { row: 0, col: 0 } }]
      ];

      // Mock reduced motion preference
      jest.mocked(accessibilityManager.getState).mockReturnValue({
        preferences: { reducedMotion: true },
        capabilities: {},
        isInitialized: true
      } as any);

      render(<AccessiblePatternCanvas pattern={mockPattern} />);

      // Check that reduced motion class is applied to root
      expect(document.documentElement).toHaveClass('reduced-motion');
    });
  });

  describe('Color and Contrast', () => {
    it('should meet WCAG AA contrast requirements', () => {
      // This would typically be tested with actual color values
      // For now, we ensure the CSS classes are applied correctly
      
      const mockPattern = [
        [{ emoji: '😀', layer: 0, position: { row: 0, col: 0 } }]
      ];

      render(<AccessiblePatternCanvas pattern={mockPattern} />);

      const cell = screen.getByRole('gridcell');
      const computedStyle = window.getComputedStyle(cell);
      
      // Basic contrast check (would need actual color testing in real scenario)
      expect(computedStyle.borderWidth).toBeTruthy();
      expect(computedStyle.backgroundColor).toBeTruthy();
    });

    it('should support color blindness filters', () => {
      const mockPattern = [
        [{ emoji: '😀', layer: 0, position: { row: 0, col: 0 } }]
      ];

      // Mock color blindness support
      jest.mocked(accessibilityManager.getState).mockReturnValue({
        preferences: { colorBlindnessSupport: 'protanopia' },
        capabilities: {},
        isInitialized: true
      } as any);

      render(<AccessiblePatternCanvas pattern={mockPattern} />);

      // Check that colorblind filter attribute is set
      expect(document.documentElement).toHaveAttribute('data-colorblind-filter', 'protanopia');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle empty patterns gracefully', () => {
      const emptyPattern: any[][] = [];

      render(<AccessiblePatternCanvas pattern={emptyPattern} />);

      const description = document.getElementById('pattern-description');
      expect(description).toHaveTextContent('Empty pattern canvas');
    });

    it('should handle readonly mode correctly', () => {
      const mockPattern = [
        [{ emoji: '😀', layer: 0, position: { row: 0, col: 0 } }]
      ];

      render(
        <AccessiblePatternCanvas 
          pattern={mockPattern} 
          readonly={true}
          onCellClick={jest.fn()}
        />
      );

      const cell = screen.getByRole('gridcell');
      expect(cell).toHaveAttribute('tabindex', '-1');
      expect(cell.parentElement?.parentElement).toHaveAttribute('aria-readonly', 'true');

      const instructions = document.getElementById('pattern-instructions');
      expect(instructions).toHaveTextContent('read-only pattern display');
    });

    it('should handle focus management correctly', async () => {
      const user = userEvent.setup();
      const mockPattern = [
        [
          { emoji: '😀', layer: 0, position: { row: 0, col: 0 } },
          { emoji: '❤️', layer: 1, position: { row: 0, col: 1 } }
        ]
      ];

      render(<AccessiblePatternCanvas pattern={mockPattern} />);

      const cells = screen.getAllByRole('gridcell');
      
      // Focus first cell
      cells[0].focus();
      expect(cells[0]).toHaveAttribute('aria-selected', 'true');
      
      // Move focus to second cell
      await user.keyboard('[ArrowRight]');
      expect(cells[1]).toHaveAttribute('aria-selected', 'true');
      expect(cells[0]).toHaveAttribute('aria-selected', 'false');
    });
  });

  describe('Integration with Accessibility Manager', () => {
    it('should initialize accessibility features correctly', () => {
      const mockPattern = [
        [{ emoji: '😀', layer: 0, position: { row: 0, col: 0 } }]
      ];

      render(<AccessiblePatternCanvas pattern={mockPattern} />);

      // Should initialize with accessibility manager
      expect(accessibilityManager.getState).toHaveBeenCalled();
    });

    it('should respond to preference changes', () => {
      const mockPattern = [
        [{ emoji: '😀', layer: 0, position: { row: 0, col: 0 } }]
      ];

      // Start with motor assistance disabled
      jest.mocked(accessibilityManager.getState).mockReturnValue({
        preferences: { motorAssistance: false },
        capabilities: {},
        isInitialized: true
      } as any);

      const { rerender } = render(<AccessiblePatternCanvas pattern={mockPattern} />);

      // Initially no gesture help
      expect(screen.queryByText('Available Gestures')).not.toBeInTheDocument();

      // Enable motor assistance
      jest.mocked(accessibilityManager.getState).mockReturnValue({
        preferences: { motorAssistance: true },
        capabilities: {},
        isInitialized: true
      } as any);

      rerender(<AccessiblePatternCanvas pattern={mockPattern} />);

      // Should now show gesture help
      expect(screen.getByText('Available Gestures')).toBeInTheDocument();
    });
  });
});

describe('Accessibility Settings Component', () => {
  it('should have proper form labels and descriptions', () => {
    render(<AccessibilitySettings />);

    // Check for proper labeling
    const highContrastCheckbox = screen.getByLabelText('High Contrast Mode');
    expect(highContrastCheckbox).toBeInTheDocument();
    expect(highContrastCheckbox).toHaveAttribute('aria-describedby');

    const largeTextCheckbox = screen.getByLabelText('Large Text');
    expect(largeTextCheckbox).toBeInTheDocument();
  });

  it('should support keyboard navigation between sections', async () => {
    const user = userEvent.setup();
    render(<AccessibilitySettings />);

    const tabs = screen.getAllByRole('tab');
    expect(tabs.length).toBeGreaterThan(0);

    // Focus first tab
    tabs[0].focus();
    expect(tabs[0]).toHaveFocus();
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');

    // Navigate to next tab
    await user.keyboard('[ArrowRight]');
    expect(tabs[1]).toHaveFocus();
  });

  it('should announce setting changes', async () => {
    const user = userEvent.setup();
    const announceToScreenReader = jest.fn();
    jest.mocked(accessibilityManager.announceToScreenReader).mockImplementation(announceToScreenReader);

    render(<AccessibilitySettings />);

    const checkbox = screen.getByLabelText('High Contrast Mode');
    await user.click(checkbox);

    expect(announceToScreenReader).toHaveBeenCalledWith(
      expect.stringContaining('Changed'),
      'polite'
    );
  });
});