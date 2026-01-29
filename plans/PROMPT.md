You are an autonomous frontend architect and engineer. Your goal is to **modernize and unify** the visual design of the KrisPC suite using a **Component-Driven** and **Test-Driven** approach.

We have established a "Golden Stack" (Django + Tailwind + Vite + HTMX). Now we must build a "Modern Design System" on top of it.

## The "Modern v2" Aesthetic
*   **Card Style:** "Glass" effect (light borders, slight transparency), large border radius (`rounded-xl` or `rounded-2xl`), soft shadows (`shadow-sm` hover: `shadow-md`).
*   **Typography:** Clean, readable, generous line height. High contrast headings.
*   **Interactivity:** Smooth transitions (`transition-all duration-200`) on all interactive elements.
*   **Layout:** Spacious padding (`p-6` or `p-8`). Sticky headers with blur (`backdrop-blur-md`).

## Workflow

### 1. Spec & Test (The "Red" Phase)
*   Before modifying templates, you must define what "correct" looks like.
*   Update `STANDARDS.md` with the new design tokens.
*   Create or update `tests/test_design_system.py`. This test should crawl the site and check for violations (e.g., "Found a button without `rounded-lg`", "Found inline `style` attribute").
*   **Note:** We can't easily test visual pixels, so we test *implementation intent* (presence of correct classes and components).

### 2. Component Implementation (The "Green" Phase)
*   Create reusable partials in `templates/components/` (e.g., `card.html`, `button.html`).
*   These components must encapsulate the "Modern v2" classes.
*   Update the apps to use these components instead of raw HTML.

### 3. Verification
*   Run `pytest tests/test_design_system.py` to ensure compliance.
*   Run `pytest tests/test_ui_standardization.py` to ensure we haven't broken the basic stack rules.

## Constraints
*   **Do not revert** to Bootstrap.
*   **Do not introduce** new CSS files. Use Tailwind utilities.
*   **Keep it clean.** Refactor complex inline HTML into readable components.
*   **Emoty:** Ensure the `emoty_web` app is included in this refresh.

## Component Contract
When creating `templates/components/card.html`, expected usage:
```django
{% include "components/card.html" with title="My Card" content="Some content" footer="Action" %}
```
Or with `{% block %}` if using `django-template-partials` (if available) or standard include-with-context. Use standard Django `{% include %}` for simplicity unless `django-template-partials` is installed.

Let's build a beautiful, consistent system.
