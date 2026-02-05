# Suite UI Refresh (Hub + Subapps) Design

Date: 2026-02-05
Owner: Codex (with ui-ux-pro-max skill)

## Goal
Refresh the UI of the hub and all subapps (KrisPC, Pdf2Cal, Plexus, Emoty) with a unified premium editorial design system. The refresh is visual only: typography, colors, layout, and components are updated while preserving existing data flow and behavior.

## Scope
In scope:
- Hub templates and shared layout (`templates/layouts/golden_base.html`).
- KrisPC templates (base + public pages).
- Pdf2Cal templates (base + feature pages).
- Plexus templates (base + app pages).
- Emoty Django developers page.
- Emoty Web (Next.js) global styles and top-level layout components.

Out of scope:
- Back-end logic changes.
- API changes.
- Feature/flow changes (no new screens or workflows).

## Design System
### Style Direction
- Premium editorial: warm neutrals, muted gold CTA, serif headlines, generous whitespace.
- Subtle “soft glass” surfaces only where contrast remains strong.

### Typography
- Headings: Playfair Display
- Body: Inter
- Apply across Django templates and Emoty Web.

### Colors (Suite Tokens)
- Background: #FAFAF9
- Surface: #FFFFFF / #F5F5F4
- Text primary: #0C0A09
- Text secondary: #44403C
- Border: #E7E5E4
- CTA / Accent: #CA8A04

Per-app accents:
- Emoty can keep its purple as a secondary accent while still using the suite neutrals and typography.

### Iconography
- Replace emoji icons with a single SVG icon set (Lucide). Keep sizes consistent.

### Motion
- Use 150–300ms transitions on color/opacity/shadow only.
- Respect `prefers-reduced-motion` and avoid layout-shifting animations.

## Shared Layout Updates
- Global header becomes a floating bar with soft border/shadow and more vertical padding.
- Nav links use warm neutrals with clear hover + focus states.
- Sub-nav bars across apps use consistent spacing, typography, and hover states.
- CTA buttons standardized: `h-11`, `px-6`, `rounded-xl`, `font-semibold`.

## Page Structure
- Consistent container width (`max-w-7xl`) and editorial rhythm.
- Hero block with large serif headline, supporting text, and primary CTA.
- Feature grids use soft cards: `bg-white/80`, `backdrop-blur`, `border-stone-200`, `shadow-sm` → `shadow-md` on hover.

## App-Specific Notes
### Hub
- Update app cards to the soft glass style with consistent iconography.
- Unify admin dashboard card styling.

### KrisPC
- Update `krispc/templates/the_base.html` and public content sections to match the editorial system.

### Pdf2Cal
- Unify sub-nav styling and modal styles in `p2c_base.html`.
- Keep functionality intact (mobile menu, modals).

### Plexus
- Remove emoji icons in nav and replace with SVG.
- Bring header into the same visual system as other apps.

### Emoty (Django developers page)
- Replace Bootstrap card layout with Tailwind-based editorial layout.
- Keep existing links and API endpoints intact.

### Emoty Web (Next.js)
- Map existing CSS variables to the suite tokens (background/surface/text/CTA).
- Import Playfair Display + Inter and update heading styles.
- Update top-level layout components to match spacing and card styles.

## Accessibility
- Ensure 4.5:1 contrast for body text.
- Visible focus rings on all interactive elements.
- Icon-only buttons have `aria-label`.
- Touch targets at least 44x44px.

## Testing / Verification
- Manual spot checks on key pages for each app at 375/768/1024/1440 widths.
- Verify no horizontal scroll on mobile.
- Confirm focus states and contrast for primary actions.
- Confirm reduced-motion behavior.

## Risks
- Visual regressions in mixed Bootstrap/Tailwind pages (Emoty Django page).
- Inconsistent typography if fonts not loaded in every entry point.

## Rollout
- Full pass across all pages in one pass, per user request.
- Changes are limited to markup + CSS; no functional regressions expected.
