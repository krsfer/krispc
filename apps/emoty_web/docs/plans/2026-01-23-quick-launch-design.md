# Emoty Web - Quick Launch Design

**Date**: 2026-01-23
**Goal**: Deploy functional web app with core pattern creation + cloud persistence
**Timeline**: 3 weeks
**Philosophy**: Minimum viable product - get it working and deployed quickly

---

## Overview

Transform the existing emo-web prototype into a production-ready web application with automatic cloud saving, guest user support, and account creation. Focus on core pattern creation experience without advanced features (AI, voice, progression systems).

## Architecture

### Core Data Flow

**Guest User System:**
```
User visits site → Auto-create anonymous guest user (UUID)
                 → Store guest_id in browser cookie/localStorage
                 → All patterns saved to database with guest_id
                 → Guest can use full app

User creates account → Convert guest_id to real user_id
                     → Transfer all patterns to account
                     → Guest session becomes authenticated session
```

**Pattern Auto-Save:**
```
User creates pattern → Auto-save to cloud every 5 seconds (debounced)
                     → Show "Saved" indicator in UI
                     → Local state + cloud backup
                     → No manual save button needed
```

### Technology Stack

**Frontend:**
- Next.js 15 (App Router) - already implemented
- React 19 - already implemented
- TypeScript 5.4 - already implemented
- Bootstrap 5.3.2 - already implemented
- Zustand - state management

**Backend:**
- Next.js API Routes
- SQLite with better-sqlite3 (synchronous, fast)
- NextAuth.js v5 for authentication
- bcrypt for password hashing

**Deployment:**
- Fly.io with persistent volumes
- SQLite file on volume mount
- Single region deployment (scale later if needed)

**Key Benefits:**
- Single file database (simple)
- No connection pooling complexity
- Works identically in dev and prod
- Easy backups (just copy the file)
- Cost-effective ($0.15/GB/month for volume)

### Database Schema

```sql
-- Simple schema for quick launch
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  password_hash TEXT,
  is_guest INTEGER DEFAULT 1,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE TABLE IF NOT EXISTS patterns (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT,
  sequence TEXT, -- JSON string of emoji array
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_patterns_user ON patterns(user_id);
CREATE INDEX idx_patterns_created ON patterns(created_at DESC);
CREATE INDEX idx_users_email ON users(email);
```

### API Routes

**Authentication:**
```
POST /api/guest/create        → Create anonymous user, return guest token
POST /api/auth/signup         → Convert guest to real account
POST /api/auth/login          → Login existing user
GET  /api/auth/session        → Get current session
```

**Patterns:**
```
POST   /api/patterns          → Create/save pattern
GET    /api/patterns          → List user's patterns
GET    /api/patterns/[id]     → Get specific pattern
PUT    /api/patterns/[id]     → Update pattern
DELETE /api/patterns/[id]     → Delete pattern
POST   /api/patterns/export   → Export pattern as PNG/JSON
```

**Health:**
```
GET /api/health               → Health check for Fly.io
```

### State Management

**Zustand Stores:**

```typescript
// usePatternStore
{
  currentPattern: Pattern | null,
  savedPatterns: Pattern[],
  isAutoSaving: boolean,
  lastSaved: Date | null,

  setCurrentPattern: (pattern) => void,
  autoSave: (pattern) => void, // debounced 5s
  loadPatterns: () => Promise<void>,
  deletePattern: (id) => Promise<void>,
  exportPattern: (id, format) => Promise<void>
}

// useAuthStore
{
  user: User | GuestUser | null,
  isGuest: boolean,
  isLoading: boolean,

  initializeGuest: () => Promise<void>,
  upgradeToAccount: (email, password) => Promise<void>,
  login: (email, password) => Promise<void>,
  logout: () => Promise<void>
}
```

**Auto-Save Implementation:**
- Debounce 5 seconds to avoid spam
- Show "Saving..." → "Saved ✓" indicator
- Optimistic UI updates (instant local, background cloud sync)
- Queue changes if offline, sync when online
- Error handling with retry logic

## User Interface

### What We Keep (Already Working)
- ✅ PatternCanvas - interactive pattern display
- ✅ EmojiPaletteCarousel - 23 curated palettes
- ✅ SequenceEditor - emoji selection with insertion points
- ✅ Undo/Redo system
- ✅ Bootstrap 5 responsive layout
- ✅ Dark mode toggle

### What We Add (New for v1)

**Header Component:**
```
┌─────────────────────────────────────────────────┐
│ 🎨 Emoty  [My Patterns] [🌙] [Create Account] │
└─────────────────────────────────────────────────┘
```

**Pattern Sidebar (Slide-in):**
```
┌─────────────────┐
│ My Patterns     │
├─────────────────┤
│ [Search...]     │
├─────────────────┤
│ 🎨 Pattern 1    │
│ 💖 Hearts       │
│ [Delete] [PNG]  │
├─────────────────┤
│ 🌊 Ocean        │
│ [Delete] [PNG]  │
└─────────────────┘
```

**Save Indicator:**
```
Main Canvas Area:
┌────────────────────┐
│     [Saving...]    │ ← Shows during auto-save
│  or [Saved ✓]      │ ← Shows when complete
└────────────────────┘
```

**Account Upgrade Modal:**
```
┌───────────────────────────────┐
│  Create Your Account          │
├───────────────────────────────┤
│  Email: [____________]        │
│  Password: [____________]     │
│  [Keep my 5 patterns]         │
│                               │
│  [Create Account] [Cancel]    │
└───────────────────────────────┘
```

### Core User Flow

1. **First Visit (Guest):**
   - Land on site → Auto-create guest user (invisible)
   - See pattern canvas + palette immediately
   - Start creating patterns right away
   - Patterns auto-save every 5 seconds

2. **Pattern Management:**
   - Click "My Patterns" → Sidebar slides in
   - See thumbnails of saved patterns
   - Click thumbnail → Load pattern
   - Export as PNG or copy text
   - Delete unwanted patterns

3. **Account Creation (Optional):**
   - Click "Create Account" button
   - Enter email + password
   - All guest patterns transfer to account
   - Can now login from any device

4. **Returning User:**
   - Login with email/password
   - See all saved patterns
   - Continue creating

### Deferred Features (Not in v1)

**Skip for Quick Launch:**
- ❌ User progression system (4 levels)
- ❌ AI pattern generation
- ❌ Voice commands
- ❌ Achievement system
- ❌ Social sharing
- ❌ Custom palette creation
- ❌ Advanced accessibility (multitouch, calibration)
- ❌ Pattern templates library
- ❌ Collaborative features
- ❌ EmotyBot chat assistant

**Rationale:** These features add significant complexity and development time. The core value is pattern creation + persistence, which v1 delivers completely.

## Components Architecture

### New Components to Build

**1. PatternSidebar**
```typescript
interface PatternSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  patterns: Pattern[];
  onPatternSelect: (pattern: Pattern) => void;
  onPatternDelete: (id: string) => void;
  onExport: (id: string, format: 'png' | 'json' | 'text') => void;
}
```

**2. SaveIndicator**
```typescript
interface SaveIndicatorProps {
  status: 'idle' | 'saving' | 'saved' | 'error';
  lastSaved?: Date;
}
```

**3. AccountUpgradeModal**
```typescript
interface AccountUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  patternCount: number;
  onUpgrade: (email: string, password: string) => Promise<void>;
}
```

**4. PatternThumbnail**
```typescript
interface PatternThumbnailProps {
  pattern: Pattern;
  onClick: () => void;
  onDelete: () => void;
  onExport: (format: string) => void;
}
```

**5. LoginModal**
```typescript
interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (email: string, password: string) => Promise<void>;
}
```

### Updated Components

**HomePage (src/app/page.tsx):**
- Add save indicator
- Add "My Patterns" button
- Add "Create Account" button (if guest)
- Integrate auto-save on pattern changes

**Layout (src/app/layout.tsx):**
- Add Zustand providers
- Add NextAuth SessionProvider
- Initialize guest user on first visit

## Implementation Plan

### Week 1: Backend Foundation

**Days 1-2: SQLite Setup**
- Install better-sqlite3 dependency
- Create database connection module
- Implement schema migrations
- Create database seed script
- Test CRUD operations

**Day 3: Guest User System**
- Implement guest user creation API
- Add guest token generation
- Create middleware for guest/auth detection
- Test guest session persistence

**Day 4: Auto-Save Implementation**
- Create pattern save API endpoint
- Implement debouncing logic
- Add optimistic UI updates
- Test auto-save reliability

**Day 5: Pattern List**
- Create pattern list API
- Implement pattern thumbnail generation
- Add delete endpoint
- Test pattern management

### Week 2: Authentication & UI

**Days 1-2: Account System**
- Implement NextAuth.js configuration
- Create signup endpoint
- Add guest → account conversion
- Implement login/logout
- Test authentication flow

**Day 3: Pattern Sidebar UI**
- Build PatternSidebar component
- Add pattern thumbnails
- Implement slide-in animation
- Add export functionality

**Day 4: Save Indicator & Modals**
- Create SaveIndicator component
- Build AccountUpgradeModal
- Build LoginModal
- Integrate with auto-save

**Day 5: Header & Integration**
- Update header with buttons
- Wire up all components
- Test complete user flow
- Fix integration bugs

### Week 3: Deployment & Polish

**Day 1: Fly.io Setup**
- Create Fly.io app
- Configure fly.toml
- Create persistent volume
- Set environment variables
- Test deployment

**Days 2-3: Testing & Bug Fixes**
- Manual testing checklist
- Cross-browser testing
- Mobile responsive testing
- Fix discovered bugs
- Performance optimization

**Days 4-5: Final Polish & Launch**
- Add loading states
- Improve error messages
- Add helpful tooltips
- Documentation updates
- Deploy to production
- Monitor for issues

## Testing Strategy

### Essential Tests Only

**Backend Tests:**
```typescript
// Guest user creation
✓ Creates unique guest ID
✓ Stores guest token
✓ Returns valid session

// Pattern CRUD
✓ Create pattern for guest
✓ Update pattern
✓ Delete pattern
✓ List patterns by user

// Account upgrade
✓ Converts guest to real user
✓ Transfers all patterns
✓ Invalidates guest token
```

**Frontend Tests:**
```typescript
// Auto-save
✓ Debounces save calls
✓ Shows saving indicator
✓ Shows saved confirmation
✓ Handles save errors

// Pattern sidebar
✓ Displays pattern list
✓ Loads pattern on click
✓ Deletes pattern with confirmation
✓ Exports pattern correctly
```

### Manual Testing Checklist

**Guest Flow:**
- [ ] Visit site for first time
- [ ] Create pattern as guest
- [ ] Auto-save works (see "Saved ✓")
- [ ] Refresh page → pattern persists
- [ ] Create multiple patterns
- [ ] Open "My Patterns" sidebar
- [ ] Click pattern → loads correctly
- [ ] Export pattern as PNG
- [ ] Delete pattern with confirmation

**Account Flow:**
- [ ] Click "Create Account"
- [ ] Enter email/password
- [ ] All guest patterns transfer
- [ ] Logout and login again
- [ ] All patterns still there
- [ ] Create new patterns while logged in

**Edge Cases:**
- [ ] Rapid pattern changes (auto-save debouncing)
- [ ] Network offline → queue saves
- [ ] Invalid email/password
- [ ] Duplicate email registration
- [ ] Very long pattern sequences
- [ ] Special characters in pattern names

**Cross-Platform:**
- [ ] Chrome desktop
- [ ] Firefox desktop
- [ ] Safari desktop
- [ ] Chrome mobile
- [ ] Safari iOS
- [ ] Responsive layout works
- [ ] Dark mode toggle works

## Deployment Configuration

### Fly.io Setup

**fly.toml:**
```toml
app = "emoty-web"
primary_region = "sjc"  # San Jose or your preferred region

[build]
  builder = "heroku/buildpacks:20"

[env]
  PORT = "3000"
  NODE_ENV = "production"

[mounts]
  source = "emoty_data"
  destination = "/data"  # SQLite file location

[[services]]
  internal_port = 3000
  protocol = "tcp"

  [[services.ports]]
    port = 80
    handlers = ["http"]

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]

  [[services.http_checks]]
    interval = 10000
    grace_period = "30s"
    method = "get"
    path = "/api/health"
    protocol = "http"
    timeout = 5000
```

**Deployment Commands:**
```bash
# Initial setup
fly auth login
fly launch --name emoty-web --region sjc
fly volumes create emoty_data --size 1

# Set secrets
fly secrets set NEXTAUTH_SECRET=$(openssl rand -base64 32)
fly secrets set NEXTAUTH_URL=https://emoty-web.fly.dev

# Deploy
fly deploy

# Monitor
fly logs
fly status
```

### Backup Strategy

**Daily SQLite Backups:**
```bash
# Automated backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="/tmp/emoty_backup_$DATE.db"

# Create backup
sqlite3 /data/emoty.db ".backup $BACKUP_FILE"

# Upload to S3/Backblaze (optional)
# aws s3 cp $BACKUP_FILE s3://emoty-backups/

# Keep local backups for 7 days
find /data/backups -name "*.db" -mtime +7 -delete
```

**Recovery Process:**
```bash
# Download latest backup
fly ssh console
sqlite3 /data/emoty.db < /data/backups/latest.db
```

## Success Metrics

### Launch Day Metrics
- Pattern created in < 30 seconds from landing
- Auto-save works reliably (99%+ success rate)
- Zero data loss on refresh
- Account upgrade preserves all patterns
- App loads in < 2 seconds
- No critical bugs reported

### Week 1 Post-Launch
- Guest user creation rate
- Pattern creation rate
- Account conversion rate (guest → real user)
- Average patterns per user
- Error rate < 1%

### Performance Targets
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3s
- Pattern auto-save: < 500ms
- Pattern list load: < 1s
- 60fps canvas rendering

## Post-Launch Roadmap

### Phase 2: AI Integration (4-6 weeks)
- Add Anthropic Claude API integration
- Implement AI pattern generation
- Add intelligent pattern naming
- Natural language emoji search

### Phase 3: Enhanced Features (4-6 weeks)
- User progression system (4 levels)
- Achievement system
- Voice commands (English/French)
- Social sharing features

### Phase 4: Community (4-6 weeks)
- Pattern marketplace
- User profiles
- Collections and favorites
- Collaborative features

## Risk Mitigation

### Technical Risks

**Risk: SQLite file corruption**
- Mitigation: Daily automated backups
- Recovery: Restore from latest backup
- Prevention: Use WAL mode for better concurrency

**Risk: Fly.io volume failure**
- Mitigation: Regular backups to external storage
- Recovery: Restore to new volume
- Prevention: Monitor disk health

**Risk: Guest token collision**
- Mitigation: Use UUIDs (astronomically low collision chance)
- Recovery: Generate new token
- Prevention: Proper UUID v4 generation

**Risk: Auto-save race conditions**
- Mitigation: Debouncing + optimistic locking
- Recovery: Last write wins strategy
- Prevention: Proper state management

### Product Risks

**Risk: Users don't create accounts**
- Mitigation: Show pattern count in upgrade prompt
- Recovery: Add incentives (more storage, AI features)
- Prevention: Friction-free guest experience

**Risk: Pattern export quality issues**
- Mitigation: High-quality canvas rendering
- Recovery: Multiple export formats
- Prevention: Test with various patterns

**Risk: Mobile experience inadequate**
- Mitigation: Responsive design from day 1
- Recovery: Mobile-specific optimizations
- Prevention: Test on real devices

## Dependencies

### npm Packages to Add
```json
{
  "better-sqlite3": "^9.2.2",
  "bcryptjs": "^2.4.3",
  "next-auth": "^5.0.0-beta.19",
  "zustand": "^4.5.0",
  "uuid": "^9.0.1"
}
```

### Services Required
- Fly.io account (free tier works for start)
- Domain name (optional, can use *.fly.dev)
- Email service for password resets (optional for v1)

## Conclusion

This Quick Launch design provides a complete, production-ready web application with the core value proposition: beautiful emoji pattern creation with automatic cloud saving and zero friction for users.

By deferring advanced features (AI, voice, progression), we achieve a 3-week timeline while still delivering a genuinely useful product. The architecture is designed to support future enhancements without requiring rewrites.

**Key Success Factors:**
1. Zero friction guest experience
2. Reliable auto-save (no lost work)
3. Simple account upgrade path
4. Solid technical foundation
5. Fast deployment to production

**Next Steps:**
1. Review and approve this design
2. Set up git worktree for isolated development
3. Create detailed implementation plan
4. Begin Week 1 development
5. Launch in 3 weeks! 🚀
