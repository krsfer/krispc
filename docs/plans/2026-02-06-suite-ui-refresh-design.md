# Suite UI Refresh Design

## Goal
Apply a unified premium editorial design across the hub, KrisPC, and Pdf2Cal without changing behavior or data flow. The system emphasizes refined typography, calm surfaces, and a consistent CTA language while preserving existing templates and context variables.

## Visual System
Typography: Playfair Display for brand headlines and section titles, Source Sans 3 for body and UI text. Palette: stone neutrals for backgrounds and text, gold accent (#CA8A04) for primary actions and highlights. Surfaces: soft glass cards using `bg-white/80`, `backdrop-blur`, `border-stone-200`, and `shadow-sm` for depth without heavy contrast. Buttons standardize on `h-11`, `px-6`, `rounded-xl`, `font-semibold` with consistent hover/focus states.

## Layout Patterns
Each app uses a shared structure: hero block (headline, subhead, proof points, CTA), content grid (cards for apps/services/features), and a CTA band to close the page. Static pages (privacy, terms, developers) use a narrow reading column in a card container with strong typographic hierarchy for scanning. All updates are template-only class changes; no view or context changes.

## App Notes
- Hub: premium hero with single primary CTA and glass app cards. Admin/tools area uses the same card system.
- KrisPC: editorial hero, refreshed services cards, consistent CTA band, and a structured footer.
- Pdf2Cal: updated sub-nav spacing and hero, consistent cards for steps/benefits, and aligned CTA controls.

## Testing
Add targeted pytest expectations for premium elements on hub, KrisPC, and Pdf2Cal home pages. Each new test must fail first, then pass after template updates. Regression tests remain in `tests/test_ui_refresh.py`.
