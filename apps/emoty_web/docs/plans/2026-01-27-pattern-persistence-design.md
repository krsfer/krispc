# Pattern Persistence Across Browser Sessions - Design Document

**Date:** 2026-01-27
**Status:** Approved
**Type:** Feature Enhancement

## Overview

Add localStorage-based persistence so patterns and grids survive browser sessions. Anonymous users get full pattern storage in localStorage, while authenticated users get their last active pattern auto-loaded from the server.

## Requirements

- Anonymous users: Pattern persists in localStorage across sessions
- Authenticated users: Last worked-on pattern auto-loads on page load
- Migration: Anonymous pattern auto-saves to server on login
- Performance: Debounced writes (1-2 seconds) to minimize localStorage overhead
- Safety: Handle quota errors, corrupted data, and stale patterns

## Architecture

### Two-Layer Persistence

**Layer 1: Anonymous Users (localStorage)**
- Store full pattern state in localStorage
- Debounced writes (1-2 second delay)
- Restore on page load
- Migrate to server on login

**Layer 2: Authenticated Users (localStorage + Server)**
- Store only "active pattern ID" in localStorage
- Full pattern data lives on server (existing auto-save)
- Auto-load active pattern on page load
- Fallback to most recent pattern if active ID invalid

### Integration Points

- Extends existing Zustand store (`src/store/patternStore.ts`)
- Uses existing `/api/patterns` endpoints (no new APIs)
- Preserves current auto-save behavior
- Works alongside existing server synchronization

## Data Flow

### Anonymous User Flow

```
Pattern change → Debounce (1-2s) → localStorage.setItem('emoty_pattern', JSON.stringify(state))

Page load → localStorage.getItem('emoty_pattern') → Restore to React state

Login → POST pattern to /api/patterns → Clear localStorage
```

### Authenticated User Flow

```
Pattern change → Existing auto-save to server + localStorage.setItem('emoty_active_pattern_id', patternId)

Page load → localStorage.getItem('emoty_active_pattern_id') → Fetch from /api/patterns/:id
  └─ If not found → Load most recent from savedPatterns array
```

## Storage Format

### localStorage Keys

- `emoty_pattern` - Full pattern state for anonymous users (cleared on login)
- `emoty_active_pattern_id` - Just the ID for authenticated users (persists across sessions)

### Data Structures

**Anonymous Pattern (emoty_pattern):**
```typescript
{
  name: string;           // Pattern name
  sequence: string[];     // Emoji sequence
  timestamp: number;      // Unix timestamp for staleness detection
}
```

**Active Pattern ID (emoty_active_pattern_id):**
```typescript
"pattern-uuid-123"  // Just the pattern ID string
```

## Component Implementation

### Zustand Store Extensions

**File:** `src/store/patternStore.ts`

**New Actions:**
- `restoreFromLocalStorage()` - Load anonymous pattern on mount
- `saveToLocalStorage(pattern)` - Debounced write for anonymous users
- `setActivePatternId(id)` - Update localStorage with active pattern ID
- `loadActivePattern()` - Fetch active pattern for authenticated users on mount

**New State:**
- `isRestoringFromLocalStorage: boolean` - Loading state during restore

### Page Component Changes

**File:** `src/app/page.tsx`

**On Mount:**
```typescript
useEffect(() => {
  if (status === 'authenticated') {
    loadActivePattern(); // Load last worked-on pattern
  } else if (status === 'unauthenticated') {
    restoreFromLocalStorage(); // Restore anonymous work
  }
}, [status]);
```

**On Pattern Change:**
```typescript
useEffect(() => {
  if (status === 'authenticated') {
    setActivePatternId(patternState.id);
  } else {
    saveToLocalStorage(patternState);
  }
}, [patternState, status]);
```

**Migration on Login:**

When authentication status changes from `unauthenticated` → `authenticated`:
1. Read pattern from `localStorage.getItem('emoty_pattern')`
2. POST to `/api/patterns` with name: `"Recovered Pattern - [date]"`
3. Wait for successful save
4. Clear `localStorage.removeItem('emoty_pattern')`
5. Set new pattern ID as active

## Error Handling & Edge Cases

### Stale Data Detection

- Add `timestamp` field to anonymous localStorage patterns
- On restore, check if `Date.now() - timestamp > 30 days`
- If stale, show optional warning: "Pattern is X days old, continue?"
- Validate `sequence` array contains valid emoji strings before restoring

### Quota Exceeded

```typescript
try {
  localStorage.setItem('emoty_pattern', JSON.stringify(pattern));
} catch (error) {
  if (error.name === 'QuotaExceededError') {
    // Clear old pattern and retry
    localStorage.removeItem('emoty_pattern');
    try {
      localStorage.setItem('emoty_pattern', JSON.stringify(pattern));
    } catch (retryError) {
      showToast('Browser storage full - pattern not saved locally', 'error');
    }
  }
}
```

### Corrupted Data

- Wrap `JSON.parse()` in try-catch
- If parse fails → Log error, clear localStorage, start with empty pattern
- If missing fields → Use defaults:
  - `name`: "Untitled Pattern"
  - `sequence`: `[]`
  - `timestamp`: `Date.now()`

### Race Conditions

**Login During Active Debounce:**
- Cancel debounce timer on authentication status change
- Immediately save to server instead of localStorage
- Clear pending localStorage write

**Multiple Tabs:**
- Listen to `storage` event to detect changes from other tabs
- Sync pattern state across tabs when localStorage updates
- Show warning if user has multiple tabs with different patterns

**Server Fetch Fails:**
- If `/api/patterns/:id` returns 404 or 500
- Fallback to most recent pattern from `savedPatterns` array
- If `savedPatterns` empty, start with blank pattern
- Show toast: "Could not load last pattern, starting fresh"

### Server Migration on Login

1. Check if `localStorage.getItem('emoty_pattern')` exists
2. If exists, POST to `/api/patterns` with:
   - `name`: `"Recovered Pattern - " + new Date().toLocaleDateString()`
   - `sequence`: `parsedPattern.sequence`
3. Wait for successful response (status 200/201)
4. Only clear localStorage after successful save
5. If save fails, keep in localStorage and retry on next login
6. Show toast: "Pattern saved to your account"

### Empty State Handling

- If no localStorage and no server patterns → Show empty canvas
- If localStorage exists but sequence is empty → Clear localStorage, show empty canvas
- If active pattern ID exists but pattern deleted → Fallback to most recent

## Testing Considerations

### Manual Testing

**Anonymous User:**
1. Create pattern without logging in
2. Close browser completely
3. Reopen → Pattern should be restored
4. Login → Pattern migrates to account
5. localStorage should be cleared

**Authenticated User:**
1. Login and create/edit pattern
2. Close browser
3. Reopen and login → Last pattern loads automatically
4. Edit different pattern
5. Reopen → New pattern loads (not first one)

**Edge Cases:**
1. localStorage full → Error toast shown, pattern not saved locally
2. Corrupted localStorage → Cleared, fresh start
3. Pattern >30 days old → Warning shown (optional)
4. Multiple tabs → Changes sync across tabs
5. Network failure on login migration → Pattern stays in localStorage

### Validation Checklist

- ✅ Anonymous pattern persists across sessions
- ✅ Authenticated user's active pattern auto-loads
- ✅ Login migrates localStorage pattern to server
- ✅ Debouncing works (not saving on every keystroke)
- ✅ Quota errors handled gracefully
- ✅ Corrupted data doesn't crash app
- ✅ Stale patterns detected
- ✅ Multiple tabs stay in sync
- ✅ Server failures don't lose data
- ✅ Empty states handled correctly

## Future Enhancements (Out of Scope)

- Offline mode: Full CRUD operations without server
- IndexedDB: Store multiple patterns locally for anonymous users
- Conflict resolution: Handle divergent edits across devices
- Pattern versioning: Undo/redo across sessions
- Export/import: Download pattern as JSON file

## Success Criteria

✅ Anonymous users don't lose work when closing browser
✅ Authenticated users see their last pattern on page load
✅ Login smoothly migrates localStorage pattern to account
✅ No performance degradation (debouncing works)
✅ Storage errors handled without crashing
✅ Data corruption handled gracefully
✅ TypeScript compiles without errors
✅ Works in Chrome, Firefox, Safari

## Implementation Estimate

- Zustand store extensions: 2 hours
- Page component integration: 1 hour
- Error handling & edge cases: 2 hours
- Testing & refinement: 2 hours
- **Total: ~7 hours**
