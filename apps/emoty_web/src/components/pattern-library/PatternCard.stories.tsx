import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent, expect } from '@storybook/test';
import PatternCard from './PatternCard';
import type { PatternWithDetails } from '@/db/types';

// Mock pattern data
const basePattern: PatternWithDetails = {
  id: 'pattern-1',
  user_id: 'user1',
  name: 'Happy Emoji Pattern',
  sequence: '["😀", "😊", "😍", "🤩", "🥳", "😎", "🤗", "😌"]',
  palette_id: 'happy-palette',
  size: 8,
  is_public: true,
  is_ai_generated: false,
  generation_prompt: null,
  tags: ['happy', 'emoji', 'colorful', 'fun'],
  difficulty_rating: 2,
  view_count: 42,
  like_count: 12,
  created_at: new Date('2024-01-15T10:30:00Z'),
  updated_at: new Date('2024-01-15T10:30:00Z'),
  user_username: 'happyuser',
  is_favorited: false,
  user_level_required: null
};

const aiPattern: PatternWithDetails = {
  ...basePattern,
  id: 'ai-pattern-1',
  name: 'AI Tech Revolution',
  sequence: '["🤖", "⚡", "🚀", "🌟", "💻", "🔬", "🧬", "🔮"]',
  is_ai_generated: true,
  generation_prompt: 'Create a futuristic technology pattern with robots and energy',
  tags: ['tech', 'ai', 'future'],
  difficulty_rating: 3,
  view_count: 89,
  like_count: 24
};

const favoritePattern: PatternWithDetails = {
  ...basePattern,
  id: 'favorite-pattern-1',
  name: 'My Favorite Pattern',
  is_favorited: true,
  view_count: 156,
  like_count: 45
};

const complexPattern: PatternWithDetails = {
  ...basePattern,
  id: 'complex-pattern-1',
  name: 'Expert Mathematical Symbols',
  sequence: '["⚛️", "🔢", "∞", "π", "∑", "∆", "∇", "∫"]',
  tags: ['math', 'science', 'complex', 'expert'],
  difficulty_rating: 4,
  view_count: 23,
  like_count: 7
};

const longNamePattern: PatternWithDetails = {
  ...basePattern,
  id: 'long-name-pattern',
  name: 'This is a Very Long Pattern Name That Should Be Truncated Properly in the UI',
  tags: ['long', 'name', 'truncation', 'test', 'ui', 'design', 'responsive']
};

const noTagsPattern: PatternWithDetails = {
  ...basePattern,
  id: 'no-tags-pattern',
  name: 'Pattern Without Tags',
  tags: null
};

const meta: Meta<typeof PatternCard> = {
  title: 'Components/PatternLibrary/PatternCard',
  component: PatternCard,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
The PatternCard component displays individual patterns in both grid and list views. It features:

- **Dual view modes** (grid/list) with optimized layouts
- **Interactive preview** with hover effects and animations
- **Progressive actions** based on user permissions
- **Accessibility-first design** with ARIA labels and keyboard navigation
- **Visual indicators** for AI-generated patterns, favorites, and complexity
- **Touch-friendly** controls for mobile devices
- **Batch selection** support for advanced operations

The component adapts its appearance and available actions based on the user's level and feature access.
        `
      }
    }
  },
  args: {
    pattern: basePattern,
    viewMode: 'grid',
    isSelected: false,
    showSelection: false,
    onSelect: () => {},
    onLoad: () => {},
    onView: () => {},
    onDelete: () => {}
  },
  argTypes: {
    pattern: { control: false },
    viewMode: {
      control: { type: 'radio' },
      options: ['grid', 'list']
    },
    isSelected: { control: 'boolean' },
    showSelection: { control: 'boolean' },
    onSelect: { action: 'selected' },
    onLoad: { action: 'loaded' },
    onView: { action: 'viewed' },
    onDelete: { action: 'deleted' },
    className: { control: 'text' }
  }
};

export default meta;
type Story = StoryObj<typeof PatternCard>;

// Basic grid view
export const GridView: Story = {
  args: {
    viewMode: 'grid'
  }
};

// Basic list view
export const ListView: Story = {
  args: {
    viewMode: 'list'
  }
};

// AI Generated pattern
export const AIGenerated: Story = {
  args: {
    pattern: aiPattern,
    viewMode: 'grid'
  },
  parameters: {
    docs: {
      description: {
        story: 'Pattern card showing AI-generated content with special badge and styling.'
      }
    }
  }
};

// Favorite pattern
export const Favorite: Story = {
  args: {
    pattern: favoritePattern,
    viewMode: 'grid'
  },
  parameters: {
    docs: {
      description: {
        story: 'Pattern card marked as favorite with heart icon indicator.'
      }
    }
  }
};

// Complex/Expert pattern
export const HighComplexity: Story = {
  args: {
    pattern: complexPattern,
    viewMode: 'grid'
  },
  parameters: {
    docs: {
      description: {
        story: 'High complexity pattern with 4-flame difficulty rating for expert users.'
      }
    }
  }
};

// Selected state
export const Selected: Story = {
  args: {
    isSelected: true,
    showSelection: true,
    viewMode: 'grid'
  },
  parameters: {
    docs: {
      description: {
        story: 'Pattern card in selected state for batch operations.'
      }
    }
  }
};

// With selection checkbox
export const WithSelection: Story = {
  args: {
    showSelection: true,
    viewMode: 'grid'
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    
    // Verify selection checkbox is visible
    const checkbox = canvas.getByLabelText(/Select/);
    await expect(checkbox).toBeInTheDocument();
    
    // Test selection interaction
    await userEvent.click(checkbox);
  }
};

// Long pattern name (truncation test)
export const LongName: Story = {
  args: {
    pattern: longNamePattern,
    viewMode: 'grid'
  },
  parameters: {
    docs: {
      description: {
        story: 'Tests text truncation for patterns with very long names.'
      }
    }
  }
};

// No tags
export const NoTags: Story = {
  args: {
    pattern: noTagsPattern,
    viewMode: 'grid'
  },
  parameters: {
    docs: {
      description: {
        story: 'Pattern card without any tags, showing graceful empty state handling.'
      }
    }
  }
};

// Hover state demonstration
export const HoverState: Story = {
  args: {
    viewMode: 'grid'
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    
    // Hover over the card to show overlay
    const card = canvas.getByRole('article');
    await userEvent.hover(card);
    
    // Should show "View Details" overlay
    await expect(canvas.getByText('View Details')).toBeVisible();
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates hover effects and overlay interactions.'
      }
    }
  }
};

// Keyboard navigation
export const KeyboardNavigation: Story = {
  args: {
    showSelection: true,
    viewMode: 'grid'
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    
    // Focus the card
    const card = canvas.getByRole('article');
    card.focus();
    
    // Test Enter key for viewing
    await userEvent.keyboard('{Enter}');
    
    // Test Space key for selection
    await userEvent.keyboard(' ');
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates keyboard navigation and shortcuts (Enter to view, Space to select).'
      }
    }
  }
};

// Mobile view
export const Mobile: Story = {
  args: {
    viewMode: 'grid'
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1'
    },
    docs: {
      description: {
        story: 'Mobile-optimized layout with touch-friendly controls.'
      }
    }
  }
};

// List view on mobile
export const MobileList: Story = {
  args: {
    viewMode: 'list'
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1'
    },
    docs: {
      description: {
        story: 'Compact list view optimized for mobile screens.'
      }
    }
  }
};

// Dark theme
export const DarkTheme: Story = {
  args: {
    viewMode: 'grid'
  },
  parameters: {
    backgrounds: { default: 'dark' }
  },
  decorators: [
    (Story) => (
      <div data-theme="dark" style={{ backgroundColor: '#1C1C1E', padding: '1rem' }}>
        <Story />
      </div>
    )
  ]
};

// High contrast
export const HighContrast: Story = {
  args: {
    viewMode: 'grid'
  },
  decorators: [
    (Story) => (
      <div className="high-contrast" style={{ padding: '1rem' }}>
        <Story />
      </div>
    )
  ],
  parameters: {
    docs: {
      description: {
        story: 'High contrast mode for accessibility compliance.'
      }
    }
  }
};

// Loading error state
export const ErrorState: Story = {
  args: {
    pattern: {
      ...basePattern,
      sequence: 'invalid-json-string' // This will cause parsing error
    },
    viewMode: 'grid'
  },
  parameters: {
    docs: {
      description: {
        story: 'Error handling when pattern data is corrupted or invalid.'
      }
    }
  }
};

// Interactive demo
export const InteractiveDemo: Story = {
  args: {
    pattern: favoritePattern,
    showSelection: true,
    viewMode: 'grid'
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    
    // Demonstrate various interactions
    const loadButton = canvas.getByLabelText(/Load/);
    await userEvent.click(loadButton);
    await expect(args.onLoad).toHaveBeenCalled();
    
    const viewButton = canvas.getByLabelText(/View details/);
    await userEvent.click(viewButton);
    await expect(args.onView).toHaveBeenCalled();
    
    const selectCheckbox = canvas.getByLabelText(/Select/);
    await userEvent.click(selectCheckbox);
    await expect(args.onSelect).toHaveBeenCalled();
  },
  parameters: {
    docs: {
      description: {
        story: 'Interactive demo showing all available actions and their callbacks.'
      }
    }
  }
};

// Comparison: Grid vs List
export const GridVsList: Story = {
  render: (args) => (
    <div className="d-flex gap-4">
      <div style={{ width: '300px' }}>
        <h6>Grid View</h6>
        <PatternCard {...args} viewMode="grid" />
      </div>
      <div style={{ width: '400px' }}>
        <h6>List View</h6>
        <PatternCard {...args} viewMode="list" />
      </div>
    </div>
  ),
  args: {
    pattern: aiPattern,
    showSelection: true
  },
  parameters: {
    docs: {
      description: {
        story: 'Side-by-side comparison of grid and list view modes.'
      }
    }
  }
};