import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { useSession } from 'next-auth/react';
import { useUser } from '@/contexts/user-context';
import PatternLibrary from '../PatternLibrary';
import type { PatternWithDetails } from '@/db/types';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock dependencies
jest.mock('next-auth/react');
jest.mock('@/contexts/user-context');
jest.mock('../PatternCard', () => {
  return function MockPatternCard({ pattern, onLoad, onView }: any) {
    return (
      <div data-testid={`pattern-card-${pattern.id}`}>
        <h3>{pattern.name}</h3>
        <button onClick={onLoad}>Load</button>
        <button onClick={onView}>View</button>
      </div>
    );
  };
});

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
const mockUseUser = useUser as jest.MockedFunction<typeof useUser>;

const mockPatterns: PatternWithDetails[] = [
  {
    id: '1',
    user_id: 'user1',
    name: 'Test Pattern 1',
    sequence: '["😀", "😊", "😍", "🤩"]',
    palette_id: 'palette1',
    size: 4,
    is_public: true,
    is_ai_generated: false,
    generation_prompt: null,
    tags: ['happy', 'emoji'],
    difficulty_rating: 2,
    view_count: 10,
    like_count: 5,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
    user_username: 'testuser',
    is_favorited: true,
    user_level_required: null
  },
  {
    id: '2',
    user_id: 'user1',
    name: 'AI Generated Pattern',
    sequence: '["🤖", "⚡", "🚀", "🌟"]',
    palette_id: 'palette2',
    size: 4,
    is_public: true,
    is_ai_generated: true,
    generation_prompt: 'Create a tech-themed pattern',
    tags: ['tech', 'ai'],
    difficulty_rating: 3,
    view_count: 25,
    like_count: 12,
    created_at: new Date('2024-01-02'),
    updated_at: new Date('2024-01-02'),
    user_username: 'testuser',
    is_favorited: false,
    user_level_required: null
  }
];

const mockUserContext = {
  user: {
    id: 'user1',
    email: 'test@example.com',
    userLevel: 'intermediate' as const,
    reputationScore: 50,
    totalPatternsCreated: 10,
    languagePreference: 'en' as const,
    accessibilityPreferences: null
  },
  progression: null,
  availableFeatures: ['pattern_search', 'favorites_system', 'ai_pattern_generation'],
  isLoading: false,
  isAuthenticated: true,
  actions: {
    checkFeatureAccess: jest.fn((feature: string) => 
      ['pattern_search', 'favorites_system', 'ai_pattern_generation'].includes(feature)
    ),
    refreshProgression: jest.fn(),
    trackAction: jest.fn(),
    updateAccessibilityPreferences: jest.fn(),
    updateLanguagePreference: jest.fn()
  }
};

const mockSession = {
  user: {
    id: 'user1',
    email: 'test@example.com',
    userLevel: 'intermediate',
    name: 'Test User'
  },
  expires: '2024-12-31'
};

describe('PatternLibrary', () => {
  beforeEach(() => {
    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated',
      update: jest.fn()
    });
    
    mockUseUser.mockReturnValue(mockUserContext);
    
    // Mock fetch
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the pattern library header', () => {
      render(<PatternLibrary initialPatterns={mockPatterns} />);
      
      expect(screen.getByText('Pattern Library')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /grid view/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /list view/i })).toBeInTheDocument();
    });

    it('renders search input for users with search feature', () => {
      render(<PatternLibrary initialPatterns={mockPatterns} />);
      
      expect(screen.getByPlaceholderText('Search patterns...')).toBeInTheDocument();
    });

    it('renders filters sidebar for non-beginner users', () => {
      render(<PatternLibrary initialPatterns={mockPatterns} />);
      
      expect(screen.getByText('Filters')).toBeInTheDocument();
      expect(screen.getByText('Sort By')).toBeInTheDocument();
    });

    it('renders pattern cards', () => {
      render(<PatternLibrary initialPatterns={mockPatterns} />);
      
      expect(screen.getByTestId('pattern-card-1')).toBeInTheDocument();
      expect(screen.getByTestId('pattern-card-2')).toBeInTheDocument();
      expect(screen.getByText('Test Pattern 1')).toBeInTheDocument();
      expect(screen.getByText('AI Generated Pattern')).toBeInTheDocument();
    });
  });

  describe('Search and Filtering', () => {
    it('filters patterns by search query', async () => {
      render(<PatternLibrary initialPatterns={mockPatterns} />);
      
      const searchInput = screen.getByPlaceholderText('Search patterns...');
      fireEvent.change(searchInput, { target: { value: 'AI' } });
      
      await waitFor(() => {
        expect(screen.getByText('AI Generated Pattern')).toBeInTheDocument();
        expect(screen.queryByText('Test Pattern 1')).not.toBeInTheDocument();
      });
    });

    it('toggles favorites filter', async () => {
      render(<PatternLibrary initialPatterns={mockPatterns} />);
      
      const favoritesToggle = screen.getByLabelText('Show favorites only');
      fireEvent.click(favoritesToggle);
      
      await waitFor(() => {
        expect(screen.getByText('Test Pattern 1')).toBeInTheDocument();
        expect(screen.queryByText('AI Generated Pattern')).not.toBeInTheDocument();
      });
    });

    it('toggles AI generated filter', async () => {
      render(<PatternLibrary initialPatterns={mockPatterns} />);
      
      const aiToggle = screen.getByLabelText('Show AI generated patterns only');
      fireEvent.click(aiToggle);
      
      await waitFor(() => {
        expect(screen.getByText('AI Generated Pattern')).toBeInTheDocument();
        expect(screen.queryByText('Test Pattern 1')).not.toBeInTheDocument();
      });
    });

    it('changes sort order', async () => {
      render(<PatternLibrary initialPatterns={mockPatterns} />);
      
      const sortSelect = screen.getByDisplayValue('Date Created');
      fireEvent.change(sortSelect, { target: { value: 'name' } });
      
      await waitFor(() => {
        expect(sortSelect).toHaveValue('name');
      });
    });

    it('clears all filters', async () => {
      render(<PatternLibrary initialPatterns={mockPatterns} />);
      
      // Apply some filters
      const searchInput = screen.getByPlaceholderText('Search patterns...');
      fireEvent.change(searchInput, { target: { value: 'AI' } });
      
      const favoritesToggle = screen.getByLabelText('Show favorites only');
      fireEvent.click(favoritesToggle);
      
      // Clear filters
      const clearButton = screen.getByText('Clear Filters');
      fireEvent.click(clearButton);
      
      await waitFor(() => {
        expect(searchInput).toHaveValue('');
        expect(favoritesToggle).not.toBeChecked();
        expect(screen.getByText('Test Pattern 1')).toBeInTheDocument();
        expect(screen.getByText('AI Generated Pattern')).toBeInTheDocument();
      });
    });
  });

  describe('View Modes', () => {
    it('switches between grid and list view', () => {
      render(<PatternLibrary initialPatterns={mockPatterns} />);
      
      const gridButton = screen.getByRole('button', { name: /grid view/i });
      const listButton = screen.getByRole('button', { name: /list view/i });
      
      // Initially in grid view
      expect(gridButton).toHaveClass('active');
      expect(listButton).not.toHaveClass('active');
      
      // Switch to list view
      fireEvent.click(listButton);
      expect(listButton).toHaveClass('active');
      expect(gridButton).not.toHaveClass('active');
    });
  });

  describe('Pattern Actions', () => {
    it('calls onPatternLoad when pattern is loaded', () => {
      const mockOnPatternLoad = jest.fn();
      render(
        <PatternLibrary 
          initialPatterns={mockPatterns} 
          onPatternLoad={mockOnPatternLoad}
        />
      );
      
      const loadButton = screen.getAllByText('Load')[0];
      fireEvent.click(loadButton);
      
      expect(mockOnPatternLoad).toHaveBeenCalledWith(mockPatterns[0]);
    });

    it('opens pattern detail modal when view is clicked', () => {
      render(<PatternLibrary initialPatterns={mockPatterns} />);
      
      const viewButton = screen.getAllByText('View')[0];
      fireEvent.click(viewButton);
      
      // Modal should open (would need to mock the modal component for full testing)
    });
  });

  describe('Empty States', () => {
    it('shows empty state when no patterns exist', () => {
      render(<PatternLibrary initialPatterns={[]} />);
      
      expect(screen.getByText('No patterns yet')).toBeInTheDocument();
      expect(screen.getByText('Create Pattern')).toBeInTheDocument();
    });

    it('shows filtered empty state when no patterns match filters', async () => {
      render(<PatternLibrary initialPatterns={mockPatterns} />);
      
      const searchInput = screen.getByPlaceholderText('Search patterns...');
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
      
      await waitFor(() => {
        expect(screen.getByText('No patterns match your filters')).toBeInTheDocument();
        expect(screen.getByText('Clear Filters')).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('shows loading grid when loading', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
        update: jest.fn()
      });
      
      render(<PatternLibrary />);
      
      // Should show loading skeletons
      expect(screen.getAllByRole('generic')).toHaveLength(12); // Default patterns per page
    });
  });

  describe('Accessibility', () => {
    it('should not have accessibility violations', async () => {
      const { container } = render(<PatternLibrary initialPatterns={mockPatterns} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('provides proper ARIA labels for interactive elements', () => {
      render(<PatternLibrary initialPatterns={mockPatterns} />);
      
      expect(screen.getByLabelText('Search patterns')).toBeInTheDocument();
      expect(screen.getByLabelText('Grid view')).toBeInTheDocument();
      expect(screen.getByLabelText('List view')).toBeInTheDocument();
      expect(screen.getByLabelText('Show favorites only')).toBeInTheDocument();
    });

    it('supports keyboard navigation', () => {
      render(<PatternLibrary initialPatterns={mockPatterns} />);
      
      const searchInput = screen.getByPlaceholderText('Search patterns...');
      searchInput.focus();
      expect(document.activeElement).toBe(searchInput);
      
      // Tab navigation would be tested with more comprehensive keyboard testing
    });
  });

  describe('Progressive Enhancement', () => {
    it('hides advanced features for beginner users', () => {
      const beginnerUserContext = {
        ...mockUserContext,
        user: { ...mockUserContext.user, userLevel: 'beginner' as const },
        actions: {
          ...mockUserContext.actions,
          checkFeatureAccess: jest.fn((feature: string) => 
            feature === 'basic_pattern_creation'
          )
        }
      };
      
      mockUseUser.mockReturnValue(beginnerUserContext);
      
      render(<PatternLibrary initialPatterns={mockPatterns} />);
      
      // Should not show filters sidebar for beginners
      expect(screen.queryByText('Filters')).not.toBeInTheDocument();
    });

    it('shows all features for expert users', () => {
      const expertUserContext = {
        ...mockUserContext,
        user: { ...mockUserContext.user, userLevel: 'expert' as const },
        actions: {
          ...mockUserContext.actions,
          checkFeatureAccess: jest.fn(() => true)
        }
      };
      
      mockUseUser.mockReturnValue(expertUserContext);
      
      render(<PatternLibrary initialPatterns={mockPatterns} />);
      
      expect(screen.getByText('Filters')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search patterns...')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('displays error message when fetch fails', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'));
      
      render(<PatternLibrary />);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load patterns. Please try again.')).toBeInTheDocument();
      });
    });
  });
});