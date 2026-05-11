# Engineering Rules — KrisPC Suite

Project rules surface here so any AI assistant or new contributor inherits
the constraints without having to spelunk through `docs/STANDARDS.md`,
`plans/PROMPT.md`, and scattered comments. The full canonical spec for
Modern v2 design tokens lives in `docs/STANDARDS.md`; this file lists the
non-negotiable rules.

The storybloq `/story` skill loads this file automatically at the start of
each session.

---

## Stack

- **Backend:** Django 5.x on Python 3.13 (Pipfile is the source of truth;
  `requirements.txt` mirrors it).
- **Frontend styling:** Tailwind CSS 3.x. Custom CSS is forbidden — use
  Tailwind utilities. The one published exception is the `prose` plugin
  for long-form legal content.
- **Frontend interactivity:** HTMX for server-driven dynamic content. Use
  vanilla JS for everything else. The `apps/emoty_web` Next.js app is the
  only React surface in the suite.
- **Asset bundling:** Vite via `django-vite`. Templates must `{% vite_asset
  'main.js' %}` (already wired in `templates/layouts/golden_base.html`).
- **API:** Django REST Framework with `drf-spectacular` for OpenAPI.

## Hard prohibitions

- **No Bootstrap.** No `container`, `row`, `col-md-*`, `col-lg-*`, `d-flex`,
  `text-muted`, `btn`, `btn-primary`, `card-header`, `card-body`, `me-2`,
  `ms-2`, `fw-bold`, etc. Pages must extend `layouts/golden_base.html` only.
- **No jQuery.** Use vanilla JS or HTMX.
- **No FontAwesome.** Use inline SVG icons consistent with the suite's
  stroke-1.75 / 24×24 viewBox convention.
- **No inline `style=` attributes.** Use Tailwind utilities; if a value is
  truly dynamic (e.g. user-picked color), justify the exception inline.
- **No new custom CSS files.** Tailwind utilities only.
- **No `--no-verify`, `--no-gpg-sign`, `--amend` on published commits**
  unless the user explicitly asks. (Pre-commit hooks fix real things; if
  one fails, fix the underlying issue.)

## Design system (Modern v2)

- **Palette:** stone neutrals + gold `#CA8A04` (`primary`). No second
  accent. Dark mode (Plexus, opt-in surfaces) uses stone-900/-800/-100/-700.
- **Typography:** Playfair Display (`font-brand`) for hero/section
  headings, Source Sans 3 (`font-sans`) for body and UI. Generous line
  height — body text uses `leading-relaxed`.
- **Surfaces:** the canonical glass card is
  `bg-white/80 backdrop-blur-md border border-stone-200 rounded-xl shadow-sm`.
  Hero variants use `rounded-2xl p-8`. Dark variants substitute `stone-900/80`
  + `border-stone-800`.
- **Buttons:** canonical shape is `h-11 px-6 rounded-xl font-semibold` with
  variants `primary` / `secondary` / `ghost` / `danger`. Use
  `templates/components/button.html` rather than re-deriving the class
  string per template.
- **Inputs:** `h-11 rounded-md border-stone-300` with primary focus ring.
  Use `templates/components/input.html`.
- **Cards:** use `templates/components/card.html` (`glass` / `solid` /
  `soft` / `hero` variants). For rich block content, inline the canonical
  classes — the `{% include %}` contract doesn't give us rich content
  slots.
- **All apps** must extend `templates/layouts/golden_base.html` and set
  `data-theme-version="v2"` on `<body>` (the base handles this).

The full spec — including radii, shadows, motion, type scale, and the
test contract — is in `docs/STANDARDS.md`.

## Testing

- Run `pytest` against `_main.test_settings`. Two environment variables are
  required: `SECRET_KEY=...` and `MAPBOX_TOKEN=...`. (See ISS-002 in
  `.story/issues/` for the long-running fix.) Without them, settings fail
  to load.
- `npm run build` must complete at least once before any UI test runs —
  `django-vite` aborts page render if `krispc/static/dist/.vite/manifest.json`
  is missing.
- UI compliance is enforced by:
  - `tests/test_design_system.py` (6 pages × 5 checks — button radii,
    input radii, no inline `style=`, no Bootstrap class names, no jQuery;
    plus a suite-wide glass card pattern check).
  - `tests/test_ui_refresh.py` (font + palette + `data-ui` markers).
  - `tests/test_ui_standardization.py` (Vite assets present, HTMX present,
    no Bootstrap CDN, `data-theme-version="v2"`).

All three suites should be green before any UI ticket is closed.

## API

- All REST endpoints under `/api/{app}/`. Suite-wide OpenAPI at
  `/api/schema/`, browsable docs at `/api/docs/` and `/api/redoc/`.
- Authentication: `SessionAuthentication` (browser/CSRF) or
  `TokenAuthentication` (external clients, header `Authorization: Token
  <key>`).
- Versioning: clients pin via `Accept: application/json; version=v1`. The
  current published version is v1.
- Success responses go through `krispc.api_utils.success_response()` /
  `created_response()` for the standard `{success, data, message}` envelope.
- Errors are formatted automatically by
  `krispc.exceptions.custom_exception_handler` — raise the appropriate
  DRF exception instead of building error responses manually.
- Throttle limits: anon 1000/h, authenticated 5000/h. Scoped throttles
  (`contacts`, `read_only`) apply on specific endpoints.

## Storybloq workflow

- `.story/` is gitignored — it's a per-developer workspace, not a shared
  artifact. Don't try to commit it.
- Update a ticket's status to `inprogress` when starting work, `complete`
  when done.
- When you discover a bug or improvement out of scope for the current
  ticket, file an issue with `storybloq issue create` rather than fixing
  it inline.
- Snapshots auto-take before context compaction. Manual snapshot:
  `storybloq snapshot`. Handovers at end of significant sessions:
  `storybloq handover create --slug <topic> --stdin` then write the
  narrative.
