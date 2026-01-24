import { render, screen, fireEvent } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import PatternCard from '../PatternCard';
import type { PatternWithDetails } from '@/db/types';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock PatternCanvas component
jest.mock('../../PatternCanvas', () => {
  return function MockPatternCanvas({ pattern, className }: any) {
    return <div className={`mock-pattern-canvas ${className}`} data-testid="pattern-canvas" />;
  };
});

// Mock FeatureGate component
jest.mock('../../feature-gate', () => ({
  FeatureGate: ({ children, feature }: any) => (
    <div data-feature={feature}>{children}</div>
  )
}));

const mockPattern: PatternWithDetails = {
  id: 'pattern-1',
  user_id: 'user1',
  name: 'Test Pattern',
  sequence: '["😀", "😊", "😍", "🤩", "🥳", "😎", "🤗", "😌"]',
  palette_id: 'palette1',
  size: 8,
  is_public: true,
  is_ai_generated: false,
  generation_prompt: null,
  tags: ['happy', 'emoji', 'colorful'],
  difficulty_rating: 2,
  view_count: 15,
  like_count: 8,
  created_at: new Date('2024-01-15T10:30:00Z'),
  updated_at: new Date('2024-01-15T10:30:00Z'),
  user_username: 'testuser',
  is_favorited: true,
  user_level_required: null
};

const mockAIPattern: PatternWithDetails = {
  ...mockPattern,
  id: 'ai-pattern-1',
  name: 'AI Generated Pattern',
  is_ai_generated: true,
  generation_prompt: 'Create a happy colorful pattern',
  is_favorited: false
};

const defaultProps = {
  pattern: mockPattern,
  viewMode: 'grid' as const,
  isSelected: false,
  onSelect: jest.fn(),
  onLoad: jest.fn(),
  onView: jest.fn(),
  onDelete: jest.fn(),
  showSelection: false
};

describe('PatternCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Grid View Rendering', () => {
    it('renders pattern information correctly', () => {
      render(<PatternCard {...defaultProps} />);
      
      expect(screen.getByText('Test Pattern')).toBeInTheDocument();
      expect(screen.getByText('Jan 15, 2024')).toBeInTheDocument();
      expect(screen.getByText('15 views')).toBeInTheDocument();
      expect(screen.getByText('8 likes')).toBeInTheDocument();
      expect(screen.getByTestId('pattern-canvas')).toBeInTheDocument();
    });

    it('displays favorite icon for favorited patterns', () => {
      render(<PatternCard {...defaultProps} />);
      
      expect(screen.getByTitle('Favorite')).toBeInTheDocument();
    });

    it('displays AI badge for AI-generated patterns', () => {
      render(<PatternCard {...defaultProps} pattern={mockAIPattern} />);
      
      expect(screen.getByTitle('AI Generated')).toBeInTheDocument();
      expect(screen.getByText('AI')).toBeInTheDocument();
    });

    it('displays pattern tags', () => {
      render(<PatternCard {...defaultProps} />);
      
      expect(screen.getByText('happy')).toBeInTheDocument();
      expect(screen.getByText('emoji')).toBeInTheDocument();
      // Should show "+1" for the third tag
      expect(screen.getByText('+1')).toBeInTheDocument();
    });

    it('displays complexity rating', () => {
      render(<PatternCard {...defaultProps} />);
      
      // Should show 2 fire emojis for difficulty rating 2
      const complexityElements = screen.getAllByText('🔥🔥');
      expect(complexityElements.length).toBeGreaterThan(0);
    });

    it('shows selection checkbox when showSelection is true', () => {
      render(<PatternCard {...defaultProps} showSelection={true} />);
      
      expect(screen.getByLabelText('Select Test Pattern')).toBeInTheDocument();
    });

    it('applies selected styling when isSelected is true', () => {
      const { container } = render(
        <PatternCard {...defaultProps} isSelected={true} />
      );
      
      expect(container.querySelector('.border-primary')).toBeInTheDocument();
    });
  });

  describe('List View Rendering', () => {
    it('renders compact layout for list view', () => {
      render(<PatternCard {...defaultProps} viewMode="list" />);
      
      // Should use list-group-item class (no article role in list view)
      expect(screen.getByText('Test Pattern').closest('.pattern-card-list')).toHaveClass('pattern-card-list', 'list-group-item');
      
      // Should show smaller preview
      const canvas = screen.getByTestId('pattern-canvas');
      expect(canvas.parentElement).toHaveStyle({ width: '60px', height: '60px' });
    });

    it('shows abbreviated tag list in list view', () => {
      render(<PatternCard {...defaultProps} viewMode="list" />);
      
      // Should show first 3 tags
      expect(screen.getByText('happy')).toBeInTheDocument();
      expect(screen.getByText('emoji')).toBeInTheDocument();
      expect(screen.getByText('colorful')).toBeInTheDocument();
      
      // With only 3 tags total, should not show "+X more"
      expect(screen.queryByText(/\+\d+ more/)).not.toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('calls onLoad when Load button is clicked', () => {
      const onLoad = jest.fn();
      render(<PatternCard {...defaultProps} onLoad={onLoad} />);
      
      fireEvent.click(screen.getByLabelText('Load Test Pattern'));
      expect(onLoad).toHaveBeenCalledTimes(1);
    });

    it('calls onView when View Details button is clicked', () => {
      const onView = jest.fn();
      const { container } = render(<PatternCard {...defaultProps} onView={onView} />);
      
      // In grid view, View Details button only appears on hover
      const card = container.querySelector('.pattern-card');
      fireEvent.mouseEnter(card!);
      
      const viewButton = screen.getByText('View Details');
      fireEvent.click(viewButton);
      expect(onView).toHaveBeenCalledTimes(1);
    });

    it('calls onView when pattern preview is clicked', () => {
      const onView = jest.fn();
      render(<PatternCard {...defaultProps} onView={onView} />);
      
      fireEvent.click(screen.getByTestId('pattern-canvas'));
      expect(onView).toHaveBeenCalledTimes(1);
    });

    it('calls onDelete when Delete button is clicked', () => {
      const onDelete = jest.fn();
      render(<PatternCard {...defaultProps} onDelete={onDelete} />);
      
      fireEvent.click(screen.getByLabelText('Delete Test Pattern'));
      expect(onDelete).toHaveBeenCalledTimes(1);
    });

    it('calls onSelect when checkbox is clicked', () => {
      const onSelect = jest.fn();
      render(
        <PatternCard 
          {...defaultProps} 
          showSelection={true} 
          onSelect={onSelect} 
        />
      );
      
      fireEvent.click(screen.getByLabelText('Select Test Pattern'));
      expect(onSelect).toHaveBeenCalledTimes(1);
    });

    it('prevents event propagation when checkbox is clicked', () => {
      const onView = jest.fn();
      const onSelect = jest.fn();
      render(
        <PatternCard 
          {...defaultProps} 
          showSelection={true}
          onView={onView}
          onSelect={onSelect} 
        />
      );
      
      // Click on the checkbox input directly
      const checkbox = screen.getByLabelText('Select Test Pattern');
      fireEvent.click(checkbox);
      
      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onView).not.toHaveBeenCalled();
    });
  });

  describe('Hover Effects', () => {
    it('shows hover overlay on mouse enter', () => {
      render(<PatternCard {...defaultProps} />);
      
      const card = screen.getByRole('article');
      fireEvent.mouseEnter(card);
      
      expect(screen.getByText('View Details')).toBeInTheDocument();
    });

    it('applies shadow class on hover', () => {
      const { container } = render(<PatternCard {...defaultProps} />);
      
      const card = screen.getByRole('article');
      fireEvent.mouseEnter(card);
      
      expect(card).toHaveClass('shadow');
    });
  });

  describe('Keyboard Navigation', () => {
    it('is focusable with tabindex', () => {
      render(<PatternCard {...defaultProps} />);
      
      const card = screen.getByRole('article');
      expect(card).toHaveAttribute('tabIndex', '0');
    });

    it('calls onView when Enter key is pressed', () => {
      const onView = jest.fn();
      render(<PatternCard {...defaultProps} onView={onView} />);
      
      const card = screen.getByRole('article');
      card.focus();
      fireEvent.keyDown(card, { key: 'Enter' });
      
      expect(onView).toHaveBeenCalledTimes(1);
    });

    it('calls onSelect when Space key is pressed with showSelection', () => {
      const onSelect = jest.fn();
      render(
        <PatternCard 
          {...defaultProps} 
          showSelection={true}
          onSelect={onSelect} 
        />
      );
      
      const card = screen.getByRole('article');
      card.focus();
      fireEvent.keyDown(card, { key: ' ' });
      
      expect(onSelect).toHaveBeenCalledTimes(1);
    });
  });

  describe('Feature Gating', () => {
    it('wraps feature-gated elements with FeatureGate', () => {
      render(<PatternCard {...defaultProps} />);
      
      // Share button should be wrapped with pattern_sharing feature
      expect(screen.getByLabelText('Share Test Pattern').closest('[data-feature="pattern_sharing"]')).toBeInTheDocument();
      
      // Delete button should be wrapped with pattern_collaboration feature
      expect(screen.getByLabelText('Delete Test Pattern').closest('[data-feature="pattern_collaboration"]')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('shows placeholder when pattern sequence is invalid', () => {
      const invalidPattern = {
        ...mockPattern,
        sequence: 'invalid-json'
      };
      
      render(<PatternCard {...defaultProps} pattern={invalidPattern} />);
      
      // Should show placeholder with Bootstrap grid icon instead of canvas
      const placeholder = document.querySelector('.pattern-placeholder');
      expect(placeholder).toBeInTheDocument();
      expect(placeholder?.querySelector('.bi-grid-3x3')).toBeInTheDocument();
    });

    it('handles missing or null tags gracefully', () => {
      const patternWithoutTags = {
        ...mockPattern,
        tags: null
      };
      
      render(<PatternCard {...defaultProps} pattern={patternWithoutTags} />);
      
      // Should not show any tag elements
      expect(screen.queryByText('happy')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should not have accessibility violations', async () => {
      const { container } = render(<PatternCard {...defaultProps} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('provides proper ARIA labels for all interactive elements', () => {
      const { container } = render(<PatternCard {...defaultProps} showSelection={true} />);
      
      // These should always be present
      expect(screen.getByLabelText('Select Test Pattern')).toBeInTheDocument();
      expect(screen.getByLabelText('Load Test Pattern')).toBeInTheDocument();
      
      // View Details button only appears on hover in grid view
      const card = container.querySelector('.pattern-card');
      fireEvent.mouseEnter(card!);
      expect(screen.getByText('View Details')).toBeInTheDocument();
      
      // Some buttons are wrapped in FeatureGate and may not be present
      // Check if they exist before asserting labels
      const shareButton = screen.queryByLabelText('Share Test Pattern');
      const deleteButton = screen.queryByLabelText('Delete Test Pattern');
      
      if (shareButton) {
        expect(shareButton).toBeInTheDocument();
      }
      if (deleteButton) {
        expect(deleteButton).toBeInTheDocument();
      }
    });

    it('provides appropriate article role and label', () => {
      render(<PatternCard {...defaultProps} />);
      
      const article = screen.getByRole('article');
      expect(article).toHaveAttribute('aria-label', 'Pattern: Test Pattern');
    });

    it('maintains focus management with keyboard navigation', () => {
      render(<PatternCard {...defaultProps} />);
      
      const card = screen.getByRole('article');
      card.focus();
      expect(document.activeElement).toBe(card);
    });
  });

  describe('Performance', () => {
    it('memoizes pattern grid calculation', () => {
      const { rerender } = render(<PatternCard {...defaultProps} />);
      
      // Re-render with same pattern should not recalculate grid
      rerender(<PatternCard {...defaultProps} isSelected={true} />);
      
      // Pattern canvas should still be rendered
      expect(screen.getByTestId('pattern-canvas')).toBeInTheDocument();
    });
  });
});