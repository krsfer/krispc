# Pattern Library Components

A comprehensive, accessible, and responsive pattern library interface for the Emoty Web application.

## Overview

The Pattern Library provides a complete solution for browsing, managing, and interacting with user-generated emoji patterns. Built with progressive enhancement, it adapts its functionality based on user progression levels and accessibility preferences.

## Features

### 🎨 Core Functionality
- **Responsive Grid/List Views** - Optimized layouts for all screen sizes
- **Advanced Search & Filtering** - Real-time search with multiple filter options
- **Progressive Enhancement** - Features unlock as users advance through levels
- **Batch Operations** - Select and manage multiple patterns simultaneously
- **Infinite Scroll** - Smooth pagination with load-on-demand

### ♿ Accessibility First
- **WCAG 2.1 AA Compliance** - Meets international accessibility standards
- **Screen Reader Support** - Full TalkBack/VoiceOver compatibility
- **Keyboard Navigation** - Complete keyboard control with logical tab order
- **High Contrast Mode** - Enhanced visibility for users with visual impairments
- **Reduced Motion** - Respects user motion preferences
- **Focus Management** - Clear focus indicators and logical navigation

### 📱 Responsive Design
- **Mobile-First Architecture** - Optimized for touch interfaces
- **Breakpoint Strategy** - Tailored layouts for mobile, tablet, and desktop
- **Touch-Friendly Controls** - 44px minimum touch targets
- **Adaptive Layouts** - Content reorganizes based on screen size

## Components

### Main Components

#### `PatternLibrary`
The primary container component that orchestrates the entire pattern browsing experience.

```tsx
import { PatternLibrary } from '@/components/pattern-library';

<PatternLibrary
  initialPatterns={patterns}
  onPatternLoad={handlePatternLoad}
  className="custom-library"
/>
```

**Props:**
- `initialPatterns?: PatternWithDetails[]` - Initial patterns to display
- `onPatternLoad?: (pattern: PatternWithDetails) => void` - Pattern load callback
- `className?: string` - Additional CSS classes

#### `PatternCard`
Individual pattern display component supporting both grid and list views.

```tsx
import { PatternCard } from '@/components/pattern-library';

<PatternCard
  pattern={pattern}
  viewMode="grid"
  isSelected={isSelected}
  onLoad={handleLoad}
  onView={handleView}
  showSelection={true}
/>
```

**Props:**
- `pattern: PatternWithDetails` - Pattern data to display
- `viewMode: 'grid' | 'list'` - Display mode
- `isSelected: boolean` - Selection state
- `onSelect: () => void` - Selection callback
- `onLoad: () => void` - Load pattern callback
- `onView: () => void` - View details callback
- `onDelete: () => void` - Delete pattern callback
- `showSelection?: boolean` - Show selection checkbox
- `className?: string` - Additional CSS classes

#### `PatternDetailModal`
Full-featured modal for viewing and editing pattern details.

```tsx
import { PatternDetailModal } from '@/components/pattern-library';

<PatternDetailModal
  pattern={selectedPattern}
  onClose={handleClose}
  onLoad={handleLoad}
  onDelete={handleDelete}
  onUpdate={handleUpdate}
/>
```

### Filter Components

#### `SearchInput`
Debounced search input with loading states.

```tsx
import { SearchInput } from '@/components/pattern-library/filters';

<SearchInput
  value={searchQuery}
  onChange={setSearchQuery}
  placeholder="Search patterns..."
  debounceMs={300}
/>
```

#### `TagFilter`
Multi-select tag filter with autocomplete.

```tsx
import { TagFilter } from '@/components/pattern-library/filters';

<TagFilter
  selectedTags={selectedTags}
  availableTags={availableTags}
  onChange={setSelectedTags}
  maxTags={10}
/>
```

#### `ComplexitySlider`
Dual-range slider for pattern complexity filtering.

```tsx
import { ComplexitySlider } from '@/components/pattern-library/filters';

<ComplexitySlider
  value={[minComplexity, maxComplexity]}
  onChange={setComplexityRange}
  min={1}
  max={4}
/>
```

### Action Components

#### `BatchActions`
Toolbar for managing multiple selected patterns.

```tsx
import { BatchActions } from '@/components/pattern-library/actions';

<BatchActions
  selectedCount={selectedPatterns.size}
  totalCount={patterns.length}
  onSelectAll={selectAll}
  onClearSelection={clearSelection}
  onBatchDelete={handleBatchDelete}
  selectedPatternIds={Array.from(selectedPatterns)}
/>
```

#### `ExportDialog`
Advanced export dialog with format and quality options.

```tsx
import { ExportDialog } from '@/components/pattern-library/actions';

<ExportDialog
  patternIds={selectedPatternIds}
  onClose={closeDialog}
  onExport={handleExport}
/>
```

## Progressive Enhancement

The Pattern Library implements a four-tier progression system:

### Beginner Level
- Basic pattern viewing
- Simple grid layout
- Load patterns into editor
- Basic export functionality

```tsx
// Features available to beginners
const beginnerFeatures = [
  'basic_pattern_creation',
  'pattern_preview',
  'basic_export'
];
```

### Intermediate Level
- Search functionality
- Favorites system
- AI pattern generation
- Medium pattern sizes

```tsx
// Additional features for intermediate users
const intermediateFeatures = [
  'pattern_search',
  'favorites_system',
  'ai_pattern_generation',
  'medium_pattern_sizes'
];
```

### Advanced Level
- Advanced filtering
- Batch operations
- Large pattern sizes
- Pattern collaboration
- Export multiple formats

```tsx
// Advanced user features
const advancedFeatures = [
  'advanced_search',
  'batch_operations',
  'pattern_collaboration',
  'export_multiple_formats'
];
```

### Expert Level
- All features unlocked
- Developer tools
- API access
- Advanced analytics
- Unlimited patterns

```tsx
// Expert features
const expertFeatures = [
  'developer_tools',
  'api_access',
  'advanced_analytics',
  'unlimited_patterns'
];
```

## Accessibility Features

### Screen Reader Support
All components provide comprehensive screen reader support with proper ARIA labels and descriptions.

```tsx
// Example ARIA implementation
<button
  aria-label={`Load ${pattern.name} into editor`}
  aria-describedby={`pattern-${pattern.id}-description`}
  onClick={handleLoad}
>
  <i className="bi bi-download" aria-hidden="true" />
  Load
</button>
```

### Keyboard Navigation
Full keyboard support with logical tab order and shortcuts.

| Key | Action |
|-----|--------|
| `Tab` | Navigate between interactive elements |
| `Enter` | Activate primary action (view pattern) |
| `Space` | Toggle selection (when in selection mode) |
| `Escape` | Close modal/cancel operation |
| `Arrow Keys` | Navigate within complex components |

### Focus Management
Proper focus management ensures users never lose their place in the interface.

```tsx
// Example focus management
useEffect(() => {
  if (modalOpen && modalRef.current) {
    modalRef.current.focus();
  }
}, [modalOpen]);
```

## Responsive Breakpoints

The Pattern Library uses Bootstrap 5's breakpoint system with custom enhancements:

```scss
// Mobile-first breakpoints
@media (max-width: 575.98px) { /* Mobile */ }
@media (min-width: 576px) and (max-width: 991.98px) { /* Tablet */ }
@media (min-width: 992px) { /* Desktop */ }
@media (min-width: 1200px) { /* Large Desktop */ }
```

### Mobile Optimizations
- Touch-friendly 44px minimum touch targets
- Simplified hover effects
- Collapsible filter sidebar
- Gesture-based interactions

### Tablet Adaptations
- Balanced layout between mobile and desktop
- Sticky filter sidebar
- Medium-density information display

### Desktop Enhancements
- Full feature set
- Enhanced hover effects
- Keyboard shortcuts
- Multi-panel layout

## Animation System

### Performance-First Animations
All animations are optimized for 60fps performance using hardware acceleration.

```css
.pattern-card {
  transform: translateZ(0); /* Force hardware acceleration */
  will-change: transform, box-shadow;
  transition: all 0.2s ease-in-out;
}
```

### Reduced Motion Support
Respects user preferences for reduced motion.

```css
@media (prefers-reduced-motion: reduce) {
  .pattern-card {
    transition: box-shadow 0.2s ease-in-out;
    transform: none;
  }
}
```

## Testing

### Unit Tests
Comprehensive test coverage using Jest and React Testing Library.

```bash
npm run test:pattern-library
```

### Accessibility Tests
Automated accessibility testing with jest-axe.

```tsx
it('should not have accessibility violations', async () => {
  const { container } = render(<PatternLibrary />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

### Visual Regression Tests
Storybook integration for visual testing across different states and viewport sizes.

```bash
npm run storybook
```

## Performance Considerations

### Virtualization
Large pattern collections use virtualization to maintain performance.

### Lazy Loading
Images and complex components load on-demand.

### Memoization
Components use React.memo and useMemo for optimal re-rendering.

```tsx
const PatternCard = memo(function PatternCard({ pattern, ...props }) {
  // Memoized pattern grid calculation
  const patternGrid = useMemo(() => {
    return parsePatternSequence(pattern.sequence, pattern.size);
  }, [pattern.sequence, pattern.size]);
  
  return <div>{/* Component JSX */}</div>;
});
```

## Browser Support

### Modern Browsers
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Feature Detection
Progressive enhancement ensures basic functionality on older browsers.

```tsx
// Example feature detection
const hasIntersectionObserver = 'IntersectionObserver' in window;
const hasWebShare = 'share' in navigator;
```

## Contributing

### Development Setup
```bash
npm install
npm run dev
```

### Code Style
Follow the project's TypeScript and React patterns:

- Use TypeScript for all components
- Follow accessibility-first design
- Write comprehensive tests
- Document component APIs
- Use semantic HTML

### Component Guidelines
1. **Accessibility First** - Every component must be fully accessible
2. **Progressive Enhancement** - Features should degrade gracefully
3. **Mobile First** - Design for mobile, enhance for desktop
4. **Performance** - Optimize for 60fps animations and quick interactions
5. **Testability** - Write testable code with clear interfaces

## License

This component library is part of the Emoty Web application and follows the project's licensing terms.