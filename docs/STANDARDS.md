# KrisPC Engineering Standards & Design System

## 1. The Golden Stack

To ensure consistency and reduce maintenance overhead across the KrisPC Monorepo, all applications must adhere to the following technology stack.

- **Backend:** Django 5.x (running on Python 3.13)
- **Frontend Styling:** Tailwind CSS
- **Frontend Interactivity:** HTMX (preferred for dynamic server-driven interactions)
- **Asset Bundling:** Vite (via `django-vite`)
- **API:** Django REST Framework (DRF)

### Deprecations
- **Bootstrap 5:** **DEPRECATED.** No new features should use Bootstrap. Existing code must be migrated to Tailwind CSS.
- **jQuery:** **DEPRECATED.** Use vanilla JavaScript or HTMX.
- **Legacy CSS:** Avoid custom `.css` files; use Tailwind utility classes instead.

---

## 2. Design Tokens

### Colors
Defined in `tailwind.config.js`.

| Token | CSS Class | Hex | Usage |
| :--- | :--- | :--- | :--- |
| **Primary** | `bg-primary` | `#ffc451` | Brand color, main actions |
| **Primary Dark** | `bg-primary-dark` | `#e6a821` | Hover states for primary actions |
| **Primary Light**| `bg-primary-light`| `#ffd584` | Backgrounds, accents |
| **Accent** | `bg-accent` | `#00d4aa` | Highlights, success states |
| **Accent Dark** | `bg-accent-dark` | `#00a888` | Hover states for accents |
| **Accent Light** | `bg-accent-light`| `#33e0bf` | Muted highlights |

### Typography
- **Brand / Headings:** `Lobster`, cursive (`font-brand`)
- **Body / Interface:** `Inter`, sans-serif (`font-sans`)

### Spacing & Layout
- Use standard Tailwind spacing scale (`p-4`, `m-4`, `gap-4`).
- Main page containers should be centered: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`.

---

## 3. Implementation Guidelines

- **Base Template:** All applications must extend `layouts/golden_base.html`.
- **Theme Version:** The `<body>` tag must include `data-theme-version="v2"` to identify standardized pages.
- **HTMX:** Use `hx-get`, `hx-post`, etc., for dynamic content loading.
- **Forms:** Use `@tailwindcss/forms` for consistent styling. Avoid Bootstrap-specific form decorators.
