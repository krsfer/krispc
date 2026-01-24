import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent, expect } from '@storybook/test';
import PatternLibrary from './PatternLibrary';
import type { PatternWithDetails } from '@/db/types';

// Mock patterns data
const mockPatterns: PatternWithDetails[] = [
  {
    id: '1',
    user_id: 'user1',
    name: 'Happy Faces',
    sequence: '["😀", "😊", "😍", "🤩", "🥳", "😎", "🤗", "😌"]',
    palette_id: 'happy-palette',
    size: 8,
    is_public: true,
    is_ai_generated: false,
    generation_prompt: null,
    tags: ['happy', 'emoji', 'colorful'],
    difficulty_rating: 1,
    view_count: 42,
    like_count: 12,
    created_at: new Date('2024-01-15'),
    updated_at: new Date('2024-01-15'),
    user_username: 'happyuser',
    is_favorited: true,
    user_level_required: null
  },
  {
    id: '2',
    user_id: 'user2',
    name: 'Tech Revolution',
    sequence: '["🤖", "⚡", "🚀", "🌟", "💻", "🔬", "🧬", "🔮"]',
    palette_id: 'tech-palette',
    size: 8,
    is_public: true,
    is_ai_generated: true,
    generation_prompt: 'Create a futuristic technology-themed pattern with robots and energy',
    tags: ['tech', 'ai', 'future', 'science'],
    difficulty_rating: 3,
    view_count: 89,
    like_count: 24,
    created_at: new Date('2024-01-20'),
    updated_at: new Date('2024-01-20'),
    user_username: 'techguru',
    is_favorited: false,
    user_level_required: null
  },
  {
    id: '3',
    user_id: 'user3',
    name: 'Nature Harmony',
    sequence: '["🌿", "🌸", "🦋", "🌞", "🌊", "🏔️", "🌙", "⭐"]',
    palette_id: 'nature-palette',
    size: 8,
    is_public: true,
    is_ai_generated: false,
    generation_prompt: null,
    tags: ['nature', 'peaceful', 'organic'],
    difficulty_rating: 2,
    view_count: 67,
    like_count: 18,
    created_at: new Date('2024-01-18'),
    updated_at: new Date('2024-01-18'),
    user_username: 'naturelover',
    is_favorited: true,
    user_level_required: null
  },
  {
    id: '4',
    user_id: 'user4',
    name: 'Food Fiesta',
    sequence: '["🍕", "🍔", "🍰", "🍦", "🥗", "🍜", "🥘", "🧁"]',
    palette_id: 'food-palette',
    size: 8,
    is_public: true,
    is_ai_generated: true,
    generation_prompt: 'Design a delicious food pattern with variety and colors',
    tags: ['food', 'delicious', 'colorful', 'fun'],
    difficulty_rating: 2,
    view_count: 156,
    like_count: 45,
    created_at: new Date('2024-01-22'),
    updated_at: new Date('2024-01-22'),
    user_username: 'foodie',
    is_favorited: false,
    user_level_required: null
  },
  {
    id: '5',
    user_id: 'user5',
    name: 'Expert Algorithm',
    sequence: '["⚛️", "🔢", "∞", "π", "∑", "∆", "∇", "∫"]',
    palette_id: 'math-palette',
    size: 8,
    is_public: true,
    is_ai_generated: false,
    generation_prompt: null,
    tags: ['math', 'science', 'complex', 'expert'],
    difficulty_rating: 4,
    view_count: 23,
    like_count: 7,
    created_at: new Date('2024-01-25'),
    updated_at: new Date('2024-01-25'),
    user_username: 'mathexpert',
    is_favorited: false,
    user_level_required: null
  }
];

// Mock user context
const mockUserContext = {
  user: {
    id: 'current-user',
    email: 'user@example.com',
    userLevel: 'intermediate',
    reputationScore: 50,
    totalPatternsCreated: 8,
    languagePreference: 'en',
    accessibilityPreferences: null
  },
  actions: {
    checkFeatureAccess: (feature: string) => true,
    trackAction: () => Promise.resolve(),
    refreshProgression: () => Promise.resolve(),
    updateAccessibilityPreferences: () => Promise.resolve(),
    updateLanguagePreference: () => Promise.resolve()
  }
};

const meta: Meta<typeof PatternLibrary> = {
  title: 'Components/PatternLibrary/PatternLibrary',
  component: PatternLibrary,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
The PatternLibrary component provides a comprehensive interface for browsing, searching, and managing user patterns. It features:

- **Responsive grid/list views** with smooth transitions
- **Advanced filtering** by tags, complexity, AI generation, and favorites
- **Progressive enhancement** showing features based on user level
- **Accessibility-first design** with screen reader support
- **Batch operations** for power users
- **Real-time search** with debouncing
- **Infinite scroll** pagination

The component adapts its interface based on the user's progression level, hiding advanced features for beginners while providing full functionality for expert users.
        `
      }
    },
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#F5F5F7' },
        { name: 'dark', value: '#1C1C1E' }
      ]
    }
  },
  decorators: [
    (Story) => (
      <div className="container-fluid p-4" style={{ minHeight: '100vh' }}>
        <Story />
      </div>
    )
  ],
  args: {
    initialPatterns: mockPatterns,
  },
  argTypes: {
    onPatternLoad: { action: 'pattern-loaded' },
    className: { control: 'text' }
  }
};

export default meta;
type Story = StoryObj<typeof PatternLibrary>;

// Default story - Full featured library
export const Default: Story = {
  args: {
    initialPatterns: mockPatterns
  }
};

// Empty state
export const EmptyLibrary: Story = {
  args: {
    initialPatterns: []
  },
  parameters: {
    docs: {
      description: {
        story: 'Empty state shown when user has no patterns yet, with clear calls-to-action for creating first patterns.'
      }
    }
  }
};

// Loading state
export const Loading: Story = {
  args: {
    initialPatterns: undefined
  },
  parameters: {
    docs: {
      description: {
        story: 'Loading state with skeleton placeholders while patterns are being fetched.'
      }
    }
  }
};

// Grid view (default)
export const GridView: Story = {
  args: {
    initialPatterns: mockPatterns
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    
    // Verify grid view is active by default
    const gridButton = canvas.getByLabelText('Grid view');
    await expect(gridButton).toHaveClass('active');
    
    // Check that patterns are displayed in grid format
    const patternCards = canvas.getAllByRole('article');
    await expect(patternCards.length).toBeGreaterThan(0);
  }
};

// List view
export const ListView: Story = {
  args: {
    initialPatterns: mockPatterns
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    
    // Switch to list view
    const listButton = canvas.getByLabelText('List view');
    await userEvent.click(listButton);
    
    // Verify list view is active
    await expect(listButton).toHaveClass('active');
  }
};

// Search functionality
export const WithSearch: Story = {
  args: {
    initialPatterns: mockPatterns
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    
    // Search for "tech" patterns
    const searchInput = canvas.getByPlaceholderText('Search patterns...');
    await userEvent.type(searchInput, 'tech');
    
    // Should filter to show only tech-related patterns
    await expect(searchInput).toHaveValue('tech');
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates real-time search functionality with debouncing for optimal performance.'
      }
    }
  }
};

// Filtered by favorites
export const FavoritesOnly: Story = {
  args: {
    initialPatterns: mockPatterns
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    
    // Toggle favorites filter
    const favoritesToggle = canvas.getByLabelText('Show favorites only');
    await userEvent.click(favoritesToggle);
    
    await expect(favoritesToggle).toBeChecked();
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows only favorited patterns when the favorites filter is enabled.'
      }
    }
  }
};

// AI Generated patterns only
export const AIGeneratedOnly: Story = {
  args: {
    initialPatterns: mockPatterns
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    
    // Toggle AI generated filter
    const aiToggle = canvas.getByLabelText('Show AI generated patterns only');
    await userEvent.click(aiToggle);
    
    await expect(aiToggle).toBeChecked();
  },
  parameters: {
    docs: {
      description: {
        story: 'Filters to show only AI-generated patterns, useful for exploring algorithmic creativity.'
      }
    }
  }
};

// Complex patterns only
export const HighComplexity: Story = {
  args: {
    initialPatterns: mockPatterns
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    
    // Adjust complexity slider to show only complex patterns
    const minSlider = canvas.getByLabelText('Minimum complexity level');
    await userEvent.click(minSlider);
    // Set to high complexity (would need specific slider interaction)
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates complexity filtering to help users find patterns matching their skill level.'
      }
    }
  }
};

// Beginner user view (limited features)
export const BeginnerView: Story = {
  args: {
    initialPatterns: mockPatterns.slice(0, 2) // Fewer patterns for beginners
  },
  parameters: {
    docs: {
      description: {
        story: 'Simplified interface for beginner users with advanced features hidden to reduce cognitive load.'
      }
    }
  }
};

// Expert user view (all features)
export const ExpertView: Story = {
  args: {
    initialPatterns: mockPatterns
  },
  parameters: {
    docs: {
      description: {
        story: 'Full-featured interface for expert users with all advanced tools and batch operations available.'
      }
    }
  }
};

// Mobile responsive
export const MobileView: Story = {
  args: {
    initialPatterns: mockPatterns
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1'
    },
    docs: {
      description: {
        story: 'Mobile-optimized layout with touch-friendly controls and collapsible filters.'
      }
    }
  }
};

// Tablet view
export const TabletView: Story = {
  args: {
    initialPatterns: mockPatterns
  },
  parameters: {
    viewport: {
      defaultViewport: 'tablet'
    },
    docs: {
      description: {
        story: 'Tablet layout balancing mobile usability with desktop functionality.'
      }
    }
  }
};

// Dark theme
export const DarkTheme: Story = {
  args: {
    initialPatterns: mockPatterns
  },
  parameters: {
    backgrounds: { default: 'dark' },
    docs: {
      description: {
        story: 'Dark theme variant with appropriate contrast adjustments for comfortable night viewing.'
      }
    }
  },
  decorators: [
    (Story) => (
      <div className="container-fluid p-4" data-theme="dark" style={{ minHeight: '100vh', backgroundColor: '#1C1C1E' }}>
        <Story />
      </div>
    )
  ]
};

// High contrast mode
export const HighContrast: Story = {
  args: {
    initialPatterns: mockPatterns
  },
  parameters: {
    docs: {
      description: {
        story: 'High contrast mode for users with visual impairments, ensuring WCAG AAA compliance.'
      }
    }
  },
  decorators: [
    (Story) => (
      <div className="container-fluid p-4 high-contrast" style={{ minHeight: '100vh' }}>
        <Story />
      </div>
    )
  ]
};

// Large text mode
export const LargeText: Story = {
  args: {
    initialPatterns: mockPatterns
  },
  parameters: {
    docs: {
      description: {
        story: 'Large text mode for better readability, scaling all text elements appropriately.'
      }
    }
  },
  decorators: [
    (Story) => (
      <div className="container-fluid p-4 large-text" style={{ minHeight: '100vh', fontSize: '1.25rem' }}>
        <Story />
      </div>
    )
  ]
};

// Reduced motion
export const ReducedMotion: Story = {
  args: {
    initialPatterns: mockPatterns
  },
  parameters: {
    docs: {
      description: {
        story: 'Reduced motion variant for users sensitive to animations, with static transitions.'
      }
    }
  },
  decorators: [
    (Story) => (
      <div className="container-fluid p-4 reduced-motion" style={{ minHeight: '100vh' }}>
        <Story />
      </div>
    )
  ]
};