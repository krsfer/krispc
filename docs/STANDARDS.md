# KrisPC Engineering Standards & Design System

## 1. The Golden Stack

All applications in the KrisPC monorepo must adhere to the following technology stack.

- **Backend:** Django 5.x (running on Python 3.13)
- **Frontend Styling:** Tailwind CSS 3.x
- **Frontend Interactivity:** HTMX (preferred for server-driven interactions)
- **Asset Bundling:** Vite (via `django-vite`)
- **API:** Django REST Framework (DRF)
- **Forms:** `@tailwindcss/forms` plugin

### Deprecations
- **Bootstrap 5:** **DEPRECATED.** No new features may use Bootstrap. Existing code must migrate to Tailwind CSS.
- **jQuery:** **DEPRECATED.** Use vanilla JavaScript or HTMX.
- **Legacy CSS:** Avoid custom `.css` files; use Tailwind utility classes.
- **Legacy palette (`primary` yellow `#ffc451`, `accent` teal `#00d4aa`):** **DEPRECATED in Modern v2.** Replaced by stone neutrals + editorial gold (see §2). Existing usages should migrate as touched.
- **Legacy fonts (`Lobster`, `Inter`):** **DEPRECATED in Modern v2.** Replaced by Playfair Display + Source Sans 3.

---

## 2. Modern v2 Design Tokens

The KrisPC suite renders under the **Modern v2** aesthetic: editorial typography, calm stone surfaces, soft glass cards, and a single accent (gold) for hierarchy. Tokens below are the canonical contract — `tailwind.config.js`, base templates, and the component library in `templates/components/` must encode them. Tests in `tests/test_design_system.py` assert presence of the corresponding utility classes.

### 2.1 Palette

Stone neutrals carry the page; gold carries action. There is no secondary accent. Reach for state colors (red/green) only for status messaging, not decoration.

| Role            | Token / Class                  | Tailwind          | Hex       | Usage                                       |
| :-------------- | :----------------------------- | :---------------- | :-------- | :------------------------------------------ |
| **Primary**     | `bg-primary` / `text-primary`  | (alias) `yellow-600` | `#CA8A04` | Brand actions, key CTAs, focused emphasis    |
| **Primary Dark**| `bg-primary-dark`              | (alias) `yellow-700` | `#A16207` | Hover/active state for primary              |
| **Primary Light**| `bg-primary-light`            | (alias) `yellow-500` | `#EAB308` | Highlights, badges, subtle backgrounds      |
| **Surface**     | `bg-white`                     | `white`           | `#FFFFFF` | Page background, dense content              |
| **Surface Soft**| `bg-stone-50`                  | `stone-50`        | `#FAFAF9` | Section backgrounds, footer                 |
| **Surface Muted**| `bg-stone-100`                | `stone-100`       | `#F5F5F4` | Cards on white, hover surfaces              |
| **Border**      | `border-stone-200`             | `stone-200`       | `#E7E5E4` | Default card / divider border               |
| **Border Strong**| `border-stone-300`            | `stone-300`       | `#D6D3D1` | Inputs, prominent dividers                  |
| **Text**        | `text-stone-900`               | `stone-900`       | `#1C1917` | Primary text, headings                      |
| **Text Muted**  | `text-stone-600`               | `stone-600`       | `#57534E` | Body, secondary, captions                   |
| **Text Subtle** | `text-stone-500`               | `stone-500`       | `#78716C` | Hints, helper text                          |

State colors keep Tailwind defaults (`red-600`, `green-600`, `blue-600`) and must only appear in alerts, validation messaging, and status badges.

**Dark mode** (Plexus and any opt-in surfaces): swap stone for the symmetric scale (`bg-stone-900`, `bg-stone-800`, `text-stone-100`, `border-stone-700`). Gold primary stays the same hex.

### 2.2 Typography

| Role               | Token            | Family               | Tailwind class | Usage                              |
| :----------------- | :--------------- | :------------------- | :------------- | :--------------------------------- |
| **Brand / Heading**| `font-brand`     | `Playfair Display`   | `font-brand`   | H1–H2, hero titles, section heads  |
| **Body / UI**      | `font-sans`      | `Source Sans 3`      | `font-sans`    | Body, buttons, forms, all UI text  |

Weights: brand uses `400`/`700`; body uses `400`/`500`/`600`/`700`. Avoid `font-thin` and `font-black`.

Type scale (suite-wide):

| Role         | Tailwind                              |
| :----------- | :------------------------------------ |
| Hero H1      | `text-5xl md:text-6xl font-brand font-bold tracking-tight` |
| Section H2   | `text-3xl md:text-4xl font-brand font-bold tracking-tight` |
| Card H3      | `text-xl font-semibold`               |
| Body         | `text-base leading-relaxed`           |
| Small / meta | `text-sm text-stone-600`              |

Generous line-height is a Modern v2 hallmark — body text should use `leading-relaxed`, hero headings `leading-tight`.

### 2.3 Spacing & Layout

- Tailwind default spacing scale (`p-4`, `m-4`, `gap-4`). No bespoke values.
- Page container: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`.
- Reading column (legal, privacy, developer docs, long-form): `max-w-3xl mx-auto px-4 sm:px-6` inside a card.
- Card padding: `p-6` default, `p-8` for hero/feature cards.
- Section vertical rhythm: `py-16 md:py-24` for full sections, `py-8` for inline blocks.

### 2.4 Radii

| Role               | Class           |
| :----------------- | :-------------- |
| Inputs, badges     | `rounded-md`    |
| Buttons, std cards | `rounded-xl`    |
| Hero / feature cards, modals | `rounded-2xl` |
| Avatars, pills     | `rounded-full` |

Sharp corners (`rounded-none`) are reserved for full-bleed media. Modern v2 does not use `rounded-sm`.

### 2.5 Shadows & Depth

Soft, low-contrast shadows only. Depth comes from layering surfaces, not from heavy drop shadows.

| Role              | Class                       |
| :---------------- | :-------------------------- |
| Card resting      | `shadow-sm`                 |
| Card hover        | `hover:shadow-md`           |
| Sticky headers    | `shadow-sm` + `backdrop-blur-md` |
| Modal             | `shadow-2xl`                |

Avoid `shadow-lg`/`shadow-xl` on inline cards — they read as legacy Material.

### 2.6 Surfaces — the Glass Pattern

The default Modern v2 card is a **glass card**:

```
bg-white/80 backdrop-blur-md border border-stone-200 rounded-xl shadow-sm
```

Variants:

- **Solid card** — opaque content, e.g. dense forms: `bg-white border border-stone-200 rounded-xl shadow-sm`
- **Soft card** — subdued, used for grouping inside a glass card: `bg-stone-50 border border-stone-200 rounded-xl`
- **Hero card** — feature treatment: `bg-white/80 backdrop-blur-md border border-stone-200 rounded-2xl shadow-sm p-8`

Glass cards must always sit on a non-white parent surface (e.g. `bg-stone-50`) so the transparency reads.

### 2.7 Motion

Default transition: `transition-all duration-200`. Use `duration-300` only for layout/reflow; never longer for interactive feedback.

Hover lifts: `hover:-translate-y-0.5 hover:shadow-md transition-all duration-200`.

Respect `prefers-reduced-motion` — wrap non-essential animation in `motion-safe:`.

---

## 3. Component Tokens

The component library lives in `templates/components/` (T-004). Each partial encodes the tokens below; apps must use the partials rather than re-deriving classes.

### 3.1 Buttons

Canonical button shape: **`h-11 px-6 rounded-xl font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2`**.

| Variant   | Surface                                                          | Hover                                  |
| :-------- | :--------------------------------------------------------------- | :------------------------------------- |
| Primary   | `bg-primary text-white`                                          | `hover:bg-primary-dark`                |
| Secondary | `bg-white text-stone-900 border border-stone-300`                 | `hover:bg-stone-50`                    |
| Ghost     | `bg-transparent text-stone-700`                                   | `hover:bg-stone-100`                   |
| Danger    | `bg-red-600 text-white`                                           | `hover:bg-red-700`                     |

All variants share the focus ring color of their surface (`focus:ring-primary/40` for primary, `focus:ring-stone-400` for secondary/ghost). Disabled state: `disabled:opacity-50 disabled:cursor-not-allowed`.

Icon-only buttons use the same height and `w-11` (square).

### 3.2 Inputs

Canonical input shape: **`h-11 w-full px-4 rounded-md border border-stone-300 bg-white text-stone-900 placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors`**.

Textareas: same classes minus `h-11`, plus `min-h-[8rem] py-3`.

Error state: `border-red-500 focus:ring-red-500/40 focus:border-red-500`.

### 3.3 Cards

Canonical card: the **glass card** pattern from §2.6. Must use the `card.html` partial unless behaviorally distinct.

### 3.4 Modals

`bg-white rounded-2xl shadow-2xl p-6 md:p-8` inside an overlay `bg-stone-900/40 backdrop-blur-sm`.

---

## 4. Implementation Guidelines

- **Base template:** All apps must extend `layouts/golden_base.html`.
- **Theme version:** The `<body>` tag must include `data-theme-version="v2"`.
- **Sticky nav:** The base template's nav is sticky and uses the glass treatment (`backdrop-blur-md`, `border-b border-stone-200`).
- **HTMX:** Use `hx-get`, `hx-post`, `hx-swap` for dynamic content. Avoid wiring the same flow with both HTMX and Vue on the same page.
- **Forms:** Use `@tailwindcss/forms`. Override with the input partial; do not stack additional ad-hoc form classes.
- **No inline `style`:** Inline `style="..."` attributes are forbidden in templates and partials. Use Tailwind utilities; if a value is genuinely dynamic, use a Tailwind arbitrary class with `style` only on a leaf element when no alternative exists (rare).
- **Class hygiene:** No Bootstrap class names (`btn`, `btn-*`, `container-fluid`, `col-*`, `d-flex`, `text-muted`, etc.). No jQuery class hooks (`.js-*` is permitted; jQuery itself is not).

---

## 5. Compliance & Testing

- `tests/test_design_system.py` (T-003) crawls representative pages and asserts:
  - Every `<button>` includes `rounded-xl` (or `rounded-md` for inputs).
  - No element carries an inline `style=` attribute (with a small allow-list, if any).
  - No Bootstrap class names appear in rendered HTML.
  - No `<link rel="stylesheet">` references Bootstrap.
- `tests/test_ui_standardization.py` continues to assert the basic stack rules (Tailwind present, Vite injected, base template extended, `data-theme-version="v2"` set).

A page is **Modern v2 compliant** when both test modules pass for it.

---

## 6. Migration Notes

These changes flow from this spec but are tracked as separate tickets:

- **T-004 (component library):** create `templates/components/{button,card,input,modal}.html` encoding the tokens above.
- **T-006 (golden base):** update `tailwind.config.js` to alias `primary` to `#CA8A04`, register `font-brand: Playfair Display, serif` and `font-sans: Source Sans 3, sans-serif`, and load both fonts in `golden_base.html` (Google Fonts or self-hosted). Modernize the navbar/footer to the glass pattern.
- **App-refresh phase (T-007–T-011):** migrate Hub, KrisPC, Plexus, Pdf2Cal, and Emoty templates onto the partials.

Until T-004/T-006 land, the legacy `primary`/`accent` aliases remain in `tailwind.config.js` for backwards compatibility. Do not introduce new usages of them; treat as deprecated.
