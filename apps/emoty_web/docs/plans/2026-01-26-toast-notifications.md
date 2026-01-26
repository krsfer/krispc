# Toast Notifications Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Bootstrap 5 toast notifications for successful PDF export and clipboard copy operations.

**Architecture:** Create a React context for toast state management, a container component to render Bootstrap toasts, and integrate toast calls at PDF export and clipboard copy success points.

**Tech Stack:** React 19, TypeScript, Bootstrap 5.3.2, uuid, Next.js 15 App Router

---

## Task 1: Create Toast Context

**Files:**
- Create: `src/contexts/ToastContext.tsx`

**Step 1: Create ToastContext with types**

```typescript
'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  duration: number;
}

interface ToastContextValue {
  toasts: ToastMessage[];
  showToast: (message: string, type?: 'success' | 'error' | 'info', duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((
    message: string,
    type: 'success' | 'error' | 'info' = 'success',
    duration: number = 3000
  ) => {
    const id = uuidv4();
    const newToast: ToastMessage = { id, message, type, duration };
    setToasts((prev) => [...prev, newToast]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
```

**Step 2: Verify TypeScript compiles**

Run: `npm run type-check`
Expected: No errors

**Step 3: Commit toast context**

```bash
git add src/contexts/ToastContext.tsx
git commit -m "feat: add toast context for notification management

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Create Toast Container Component

**Files:**
- Create: `src/components/ToastContainer.tsx`
- Create: `src/components/ToastContainer.module.css`

**Step 1: Create ToastContainer component**

```typescript
'use client';

import React, { useEffect, useRef } from 'react';
import { useToast } from '@/contexts/ToastContext';
import styles from './ToastContainer.module.css';

declare global {
  interface Window {
    bootstrap: {
      Toast: {
        new (element: HTMLElement, options?: { autohide?: boolean; delay?: number }): {
          show: () => void;
          hide: () => void;
          dispose: () => void;
        };
      };
    };
  }
}

interface ToastItemProps {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  duration: number;
  onRemove: (id: string) => void;
}

function ToastItem({ id, message, type, duration, onRemove }: ToastItemProps) {
  const toastRef = useRef<HTMLDivElement>(null);
  const bsToastRef = useRef<ReturnType<typeof window.bootstrap.Toast.new> | null>(null);

  useEffect(() => {
    if (toastRef.current && typeof window !== 'undefined' && window.bootstrap) {
      // Initialize Bootstrap toast
      bsToastRef.current = new window.bootstrap.Toast(toastRef.current, {
        autohide: true,
        delay: duration,
      });

      // Show the toast
      bsToastRef.current.show();

      // Listen for hidden event to remove from state
      const handleHidden = () => {
        onRemove(id);
      };

      toastRef.current.addEventListener('hidden.bs.toast', handleHidden);

      return () => {
        if (toastRef.current) {
          toastRef.current.removeEventListener('hidden.bs.toast', handleHidden);
        }
        if (bsToastRef.current) {
          bsToastRef.current.dispose();
        }
      };
    }
  }, [id, duration, onRemove]);

  // Map type to Bootstrap class
  const typeClass = type === 'success' ? 'text-bg-success' : type === 'error' ? 'text-bg-danger' : 'text-bg-info';

  return (
    <div
      ref={toastRef}
      className={`toast ${typeClass}`}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <div className="toast-body d-flex align-items-center">
        {message}
      </div>
    </div>
  );
}

export default function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <div className={styles.toastContainer} aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          id={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onRemove={removeToast}
        />
      ))}
    </div>
  );
}
```

**Step 2: Create CSS module for positioning**

```css
.toastContainer {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1090;
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: none;
}

.toastContainer .toast {
  pointer-events: auto;
  min-width: 300px;
}
```

**Step 3: Verify TypeScript compiles**

Run: `npm run type-check`
Expected: No errors

**Step 4: Commit toast container**

```bash
git add src/components/ToastContainer.tsx src/components/ToastContainer.module.css
git commit -m "feat: add toast container component with Bootstrap integration

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Integrate Toast Provider in Root Layout

**Files:**
- Modify: `src/app/layout.tsx`

**Step 1: Add ToastProvider and ToastContainer to layout**

Find the root layout component and wrap the children with ToastProvider, then add ToastContainer inside the body.

```typescript
import { ToastProvider } from '@/contexts/ToastContext';
import ToastContainer from '@/components/ToastContainer';

// ... existing imports

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          {children}
          <ToastContainer />
        </ToastProvider>
      </body>
    </html>
  );
}
```

**Step 2: Verify TypeScript compiles**

Run: `npm run type-check`
Expected: No errors

**Step 3: Verify app still builds**

Run: `npm run build 2>&1 | tail -20`
Expected: Build succeeds

**Step 4: Commit layout integration**

```bash
git add src/app/layout.tsx
git commit -m "feat: integrate toast provider in root layout

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Add Toast to PDF Export

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Import useToast hook**

Add import at top of file:

```typescript
import { useToast } from '@/contexts/ToastContext';
```

**Step 2: Use toast hook in component**

Inside the HomePage component function, add:

```typescript
const { showToast } = useToast();
```

**Step 3: Add toast call after PDF generation**

Find the PDF export handler (around line 236 where `PatternPrinter.generatePDF` is called).

Replace the try block:

```typescript
try {
  await PatternPrinter.generatePDF(
    patternState,
    currentPatternGrid,
    `emoty-${patternState.name?.replace(/\s+/g, '-').toLowerCase() || 'pattern'}.pdf`
  );

  // Show success toast
  showToast('✓ PDF downloaded successfully');

  // Keep ARIA announcer for redundancy
  const announcer = document.getElementById('aria-live-announcer');
  if (announcer) announcer.textContent = 'PDF generated successfully.';
} catch (error) {
  console.error('PDF generation failed:', error);
  const announcer = document.getElementById('aria-live-announcer');
  if (announcer) announcer.textContent = 'Failed to generate PDF. Please try again.';
}
```

**Step 4: Verify TypeScript compiles**

Run: `npm run type-check`
Expected: No errors

**Step 5: Commit PDF export toast**

```bash
git add src/app/page.tsx
git commit -m "feat: add toast notification for PDF export success

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Add Toast to Clipboard Copy

**Files:**
- Modify: `src/components/PatternSidebar.tsx`

**Step 1: Import useToast hook**

Add import at top of file:

```typescript
import { useToast } from '@/contexts/ToastContext';
```

**Step 2: Use toast hook in component**

Inside the PatternSidebar component function, add:

```typescript
const { showToast } = useToast();
```

**Step 3: Add toast call after clipboard copy**

Find the clipboard copy handler (around line 138-142 in the switch statement).

Replace the 'copy' case:

```typescript
case 'copy': {
  const text = exportAsText(pattern);
  await copyToClipboard(text);

  // Show success toast
  showToast('✓ Pattern copied to clipboard');

  // Keep inline alert for redundancy in sidebar
  setExportSuccess('Copied to clipboard');
  break;
}
```

**Step 4: Verify TypeScript compiles**

Run: `npm run type-check`
Expected: No errors

**Step 5: Commit clipboard copy toast**

```bash
git add src/components/PatternSidebar.tsx
git commit -m "feat: add toast notification for clipboard copy success

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Manual Testing

**Files:**
- None (testing only)

**Step 1: Start development server**

Run: `npm run dev`
Expected: Server starts on port 3000

**Step 2: Test PDF export**

1. Open browser to `http://localhost:3000`
2. Create a pattern with some emojis
3. Click the PDF export button
4. Verify toast appears in top-right corner
5. Verify toast says "✓ PDF downloaded successfully"
6. Verify toast auto-dismisses after 3 seconds
7. Verify PDF file downloads

**Step 3: Test clipboard copy**

1. Open the pattern sidebar
2. Select a saved pattern
3. Click the copy button
4. Verify toast appears in top-right corner
5. Verify toast says "✓ Pattern copied to clipboard"
6. Verify toast auto-dismisses after 3 seconds
7. Paste into text editor to verify clipboard content

**Step 4: Test multiple toasts**

1. Rapidly click PDF export multiple times
2. Verify toasts stack vertically
3. Verify each toast auto-dismisses independently
4. Verify no overlap or layout issues

**Step 5: Test accessibility**

1. Open browser DevTools
2. Navigate to Elements/Inspector
3. Find toast elements
4. Verify `role="alert"` attribute present
5. Verify `aria-live="assertive"` attribute present
6. Verify `aria-atomic="true"` attribute present

**Step 6: Document test results**

Create a file summarizing test results:

```bash
cat > TESTING_RESULTS.md << 'EOF'
# Toast Notifications - Manual Test Results

**Date:** $(date +%Y-%m-%d)
**Tester:** [Name]

## PDF Export Toast
- ✅ Toast appears after PDF generation
- ✅ Message: "✓ PDF downloaded successfully"
- ✅ Auto-dismisses after 3 seconds
- ✅ PDF downloads successfully

## Clipboard Copy Toast
- ✅ Toast appears after clipboard copy
- ✅ Message: "✓ Pattern copied to clipboard"
- ✅ Auto-dismisses after 3 seconds
- ✅ Clipboard contains pattern text

## Multiple Toasts
- ✅ Toasts stack vertically with proper spacing
- ✅ Each toast dismisses independently
- ✅ No visual overlap or layout issues

## Accessibility
- ✅ `role="alert"` attribute present
- ✅ `aria-live="assertive"` attribute present
- ✅ `aria-atomic="true"` attribute present
- ✅ Bootstrap success green meets WCAG AA contrast

## Notes
[Any observations or issues]
EOF
```

**Step 7: Commit test results**

```bash
git add TESTING_RESULTS.md
git commit -m "docs: add manual testing results for toast notifications

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Update Documentation

**Files:**
- Modify: `docs/05-component-library.md` (if exists, otherwise skip)

**Step 1: Add toast system documentation**

If component library documentation exists, add a section describing the toast notification system:

```markdown
## Toast Notifications

**Location:** `src/contexts/ToastContext.tsx`, `src/components/ToastContainer.tsx`

**Purpose:** Provide non-intrusive success feedback for export actions.

**Usage:**

```typescript
import { useToast } from '@/contexts/ToastContext';

function MyComponent() {
  const { showToast } = useToast();

  const handleAction = async () => {
    await performAction();
    showToast('✓ Action completed successfully');
  };
}
```

**API:**

- `showToast(message, type?, duration?)` - Display a toast notification
  - `message`: Text to display
  - `type`: 'success' | 'error' | 'info' (default: 'success')
  - `duration`: Auto-dismiss time in ms (default: 3000)

**Styling:** Uses Bootstrap 5 toast component with `.text-bg-success` for success messages.

**Accessibility:** Includes proper ARIA attributes (`role="alert"`, `aria-live="assertive"`).
```

**Step 2: Commit documentation**

```bash
git add docs/05-component-library.md
git commit -m "docs: document toast notification system

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Summary

**Total Tasks:** 7
**Estimated Time:** ~2 hours

**Files Created:**
- `src/contexts/ToastContext.tsx`
- `src/components/ToastContainer.tsx`
- `src/components/ToastContainer.module.css`
- `TESTING_RESULTS.md`

**Files Modified:**
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/components/PatternSidebar.tsx`
- `docs/05-component-library.md` (optional)

**Key Commits:**
1. Add toast context
2. Add toast container component
3. Integrate toast provider
4. Add PDF export toast
5. Add clipboard copy toast
6. Document test results
7. Update documentation

**Success Criteria:**
- ✅ Toasts appear after PDF export and clipboard copy
- ✅ Messages match design spec
- ✅ Auto-dismiss after 3 seconds
- ✅ Multiple toasts stack properly
- ✅ ARIA attributes present
- ✅ No new dependencies added
- ✅ TypeScript compiles without errors
