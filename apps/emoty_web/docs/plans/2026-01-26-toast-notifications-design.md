# Toast Notifications for Export Actions - Design Document

**Date:** 2026-01-26
**Status:** Approved
**Type:** Feature Enhancement

## Overview

Add toast notifications to provide immediate visual feedback when users successfully export patterns as PDF or copy the grid to clipboard. Uses Bootstrap 5's native toast component for consistency with existing UI.

## Requirements

- Show success notification after PDF export completes
- Show success notification after grid copy to clipboard completes
- Notifications should be non-intrusive (toast style in corner)
- Auto-dismiss after 3 seconds
- Accessible to screen readers
- No new dependencies (use existing Bootstrap 5)

## Architecture

### Three-Layer Design

1. **Toast Manager (Context)**: Centralized state management and API
2. **Toast Container (Component)**: Renders active toasts with Bootstrap styling
3. **Integration Points**: Call `showToast()` after successful export actions

### Toast Flow

```
User Action (PDF/Copy)
    ↓
Export Function Succeeds
    ↓
showToast() called
    ↓
Toast added to context state
    ↓
ToastContainer renders Bootstrap toast
    ↓
Bootstrap shows toast with animation
    ↓
Auto-dismiss after 3 seconds
    ↓
Bootstrap fires 'hidden' event
    ↓
Toast removed from state
```

## Component Structure

### 1. Toast Context (`src/contexts/ToastContext.tsx`)

**Purpose:** Manage toast state and provide simple API

**Interface:**
```typescript
interface ToastMessage {
  id: string;                    // Unique ID (uuid)
  message: string;               // Display text
  type: 'success' | 'error' | 'info';
  duration?: number;             // Auto-dismiss time (default 3000ms)
}

interface ToastContextValue {
  showToast: (message: string, type?: 'success', duration?: number) => void;
  toasts: ToastMessage[];
}
```

**Key Features:**
- Array of active toasts
- Auto-generates unique IDs
- Simple one-function API: `showToast()`
- Default duration: 3000ms

### 2. Toast Container (`src/components/ToastContainer.tsx`)

**Purpose:** Render active toasts with Bootstrap styling

**Key Features:**
- Fixed position: top-right corner (`position-fixed top-0 end-0`)
- Uses Bootstrap classes: `.toast`, `.toast-success`, `.toast-header`, `.toast-body`
- Stacks multiple toasts vertically with spacing
- Handles Bootstrap toast lifecycle via refs
- Removes toast from state after fade-out animation

**Bootstrap Integration:**
```typescript
useEffect(() => {
  if (toastRef.current) {
    const bsToast = new bootstrap.Toast(toastRef.current);
    bsToast.show();

    toastRef.current.addEventListener('hidden.bs.toast', () => {
      // Remove from state
    });
  }
}, []);
```

### 3. Root Layout Integration (`src/app/layout.tsx`)

**Changes:**
- Wrap app with `<ToastProvider>`
- Add `<ToastContainer />` inside body element
- Toasts available on all pages

## Integration Points

### Point 1: PDF Export Success

**File:** `src/app/page.tsx`
**Location:** Line ~240, after `PatternPrinter.generatePDF()` succeeds

**Before:**
```typescript
try {
  await PatternPrinter.generatePDF(...);

  const announcer = document.getElementById('aria-live-announcer');
  if (announcer) announcer.textContent = 'PDF generated successfully.';
} catch (error) {
  // ...
}
```

**After:**
```typescript
try {
  await PatternPrinter.generatePDF(...);
  showToast('✓ PDF downloaded successfully');

  const announcer = document.getElementById('aria-live-announcer');
  if (announcer) announcer.textContent = 'PDF generated successfully.';
} catch (error) {
  // ...
}
```

**Note:** Keep existing ARIA announcer for redundant accessibility support.

### Point 2: Clipboard Copy Success

**File:** `src/components/PatternSidebar.tsx`
**Location:** Line ~141, after `copyToClipboard()` succeeds

**Before:**
```typescript
case 'copy': {
  const text = exportAsText(pattern);
  await copyToClipboard(text);
  setExportSuccess('Copied to clipboard');
  break;
}
```

**After:**
```typescript
case 'copy': {
  const text = exportAsText(pattern);
  await copyToClipboard(text);
  showToast('✓ Pattern copied to clipboard');
  setExportSuccess('Copied to clipboard'); // Keep for inline display
  break;
}
```

**Note:** Keep existing inline alert for redundancy in sidebar context.

## Visual Design

### Toast Appearance

**Position:** Top-right corner, 20px from edge
**Width:** 300px
**Styling:** Bootstrap success theme (green)
**Duration:** 3 seconds
**Animation:** Bootstrap fade-in/fade-out

### Message Format

- **PDF Export:** `✓ PDF downloaded successfully`
- **Clipboard Copy:** `✓ Pattern copied to clipboard`

Format: `[Icon] [Action] [Result]`

### Stacking Behavior

Multiple toasts stack vertically with 10px spacing. Newer toasts appear at the top.

## Accessibility

### ARIA Attributes

Each toast includes:
```html
<div class="toast" role="alert" aria-live="assertive" aria-atomic="true">
  ...
</div>
```

- `role="alert"`: Immediate screen reader announcement
- `aria-live="assertive"`: High priority for success feedback
- `aria-atomic="true"`: Read entire message, not just changes

### Color Contrast

Bootstrap's success green (#198754 on white) meets WCAG 2.1 AA standards:
- Contrast ratio: 4.5:1 minimum for normal text
- Bootstrap default passes compliance

### Keyboard Navigation

Toasts auto-dismiss, requiring no keyboard interaction. Focus remains on the triggering element.

## Technical Implementation

### Files to Create

1. `src/contexts/ToastContext.tsx` (~80 lines)
2. `src/components/ToastContainer.tsx` (~120 lines)

### Files to Modify

1. `src/app/layout.tsx` (add provider and container)
2. `src/app/page.tsx` (add showToast call for PDF)
3. `src/components/PatternSidebar.tsx` (add showToast call for clipboard)

### Dependencies

**None required.** Uses existing:
- Bootstrap 5.3.2 (already installed)
- uuid 9.0.1 (already installed)
- React 19.0.0

### Bootstrap Toast API

Bootstrap toasts require manual JavaScript initialization:

```javascript
const toastElement = document.getElementById('myToast');
const toast = new bootstrap.Toast(toastElement, {
  autohide: true,
  delay: 3000
});
toast.show();
```

We'll wrap this in React hooks for lifecycle management.

## Testing Considerations

### Manual Testing

1. Generate PDF → verify toast appears
2. Copy to clipboard → verify toast appears
3. Trigger both rapidly → verify stacking works
4. Wait 3 seconds → verify auto-dismiss
5. Test with screen reader → verify announcements

### Accessibility Testing

- ARIA attributes present and correct
- Screen reader announces messages
- Color contrast meets WCAG AA
- No keyboard traps

### Edge Cases

- Multiple rapid actions: Should stack properly
- Action fails: No toast shown (error handling separate)
- Long pattern names: Messages remain concise (no pattern name in toast)

## Future Enhancements (Out of Scope)

- Error toasts (red styling) for failed exports
- Info toasts (blue styling) for other actions
- Undo actions from toasts
- Custom toast durations per action
- Position configuration (bottom-right, etc.)
- Progress toasts for long operations

## Success Criteria

✅ Toast appears after PDF export
✅ Toast appears after clipboard copy
✅ Toasts auto-dismiss after 3 seconds
✅ Multiple toasts stack without overlap
✅ Screen readers announce messages
✅ Color contrast meets WCAG AA
✅ No new npm dependencies added
✅ Consistent with Bootstrap design system

## Implementation Estimate

- Toast Context: 1 hour
- Toast Container: 2 hours
- Integration Points: 1 hour
- Testing & refinement: 1 hour
- **Total: ~5 hours**
