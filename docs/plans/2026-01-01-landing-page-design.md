# Landing Page Hub Design

**Date:** 2026-01-01
**Status:** Approved

## Overview

Create a main landing page at the root domain that serves as a hub linking to KrisPC and Pdf2Cal applications.

## Architecture & URL Structure

### Current State
- KrisPC occupies root `/`
- Pdf2Cal at `/importpdf/`

### New Structure
```
/                    → New landing page (hub)
/krispc/             → KrisPC app (moved)
/importpdf/          → Pdf2Cal app (unchanged)
/privacy/            → Hub privacy policy
/terms/              → Hub terms of service
```

### Routing Changes

In `_main/urls.py`:
1. Create new `hub` app with views
2. Move `path("", include("krispc.urls"))` to `path("krispc/", include("krispc.urls"))`
3. Add `path("", include("hub.urls"))` at root

**Rationale:**
- Clean separation: landing page is independent of either app
- SEO-friendly: root domain shows app portfolio
- Simple migration: just URL routing changes
- Each app retains its own privacy/terms pages

## Page Structure & Layout

### Visual Layout

```
┌─────────────────────────────────────┐
│         Header / Branding           │
│     "Christopher"                   │
│     Language Toggle (FR/EN)         │
└─────────────────────────────────────┘
│                                     │
│         Hero Section                │
│   "Services et Outils               │
│    Professionnels"                  │
│                                     │
├─────────────────────────────────────┤
│                                     │
│     ┌──────────┐  ┌──────────┐     │
│     │          │  │          │     │
│     │  KrisPC  │  │ Pdf2Cal  │     │
│     │   Card   │  │   Card   │     │
│     │          │  │          │     │
│     └──────────┘  └──────────┘     │
│                                     │
├─────────────────────────────────────┤
│            Footer                   │
│   Privacy | Terms | © 2026          │
│   Language: Français | English      │
└─────────────────────────────────────┘
```

### Card Content

**Each Card Contains:**
- App icon/logo (emoji or SVG)
- App name
- 2-3 line description (bilingual)
- "Enter" or "Visit" button
- Hover effect: subtle lift/shadow

**Content:**

*Header:* "Christopher"
*Tagline:* "Services et Outils Professionnels" / "Professional Services & Tools"

*KrisPC Card:*
- 🖥️ Icon
- "Réparations informatiques professionnelles" / "Professional computer repairs"
- Button → `/krispc/`

*Pdf2Cal Card:*
- 📅 Icon
- "Convertissez vos PDF en calendriers" / "Convert your PDFs to calendars"
- Button → `/importpdf/`

### Responsive Design

- **Desktop (>768px):** Cards side-by-side, max-width 1200px centered
- **Tablet (768px):** Cards side-by-side if space allows
- **Mobile (<640px):** Cards stacked vertically, full width

## Privacy, Terms & Language

### Privacy/Terms Strategy

Create hub-level privacy/terms pages at `/privacy/` and `/terms/` that:
1. Cover both apps under unified policy
2. Link to app-specific policies if needed
3. Serve as canonical privacy/terms for the domain

Existing app pages remain:
- KrisPC: `/krispc/privacy/`, `/krispc/terms/`
- Pdf2Cal: `/importpdf/privacy/`, `/importpdf/terms/`

### Language Switching

- Uses Django's `i18n` system (already in place)
- Language selector in header and footer
- Preserves language when navigating to apps
- URL structure: `/fr/`, `/en/` prefixes (Django i18n pattern)

## Visual Design

### Design Philosophy
Clean, modern, professional hub - distinct from KrisPC but complementary. Digital portfolio aesthetic.

### Color Scheme
```
Primary:   Modern blue gradient (#4F46E5 → #7C3AED)
Secondary: Neutral grays (#F9FAFB background, #1F2937 text)
Accent:    Subtle purple for hover states
Cards:     White with soft shadows
```

### Typography
- Headers: Clean sans-serif (Inter or system fonts)
- Body: Same, slightly smaller
- Hierarchy: Large name, medium tagline, regular card text

### Card Design
```css
Cards:
- White background
- Border radius: 12px
- Shadow: 0 4px 6px rgba(0,0,0,0.1)
- Padding: 2rem
- Hover: transform translateY(-4px), deeper shadow
- Transition: smooth 200ms

Buttons:
- Solid gradient background
- White text
- Full width on mobile
- Border radius: 8px
- Hover: brightness increase
```

### Icons
- Use emoji (🖥️ 📅) for simplicity
- Alternative: Heroicons/Lucide SVG icons

## Technical Implementation

### 1. Create Hub App

```bash
python manage.py startapp hub
```

### 2. File Structure

```
hub/
├── __init__.py
├── apps.py
├── views.py
├── urls.py
├── templates/
│   └── hub/
│       ├── base.html
│       ├── index.html
│       ├── privacy.html
│       └── terms.html
└── static/
    └── hub/
        └── css/
            └── style.css
```

### 3. Views Implementation

```python
# hub/views.py
from django.views.generic import TemplateView
from django.utils.translation import get_language

class IndexView(TemplateView):
    template_name = "hub/index.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        is_french = get_language() == 'fr'

        context['page_title'] = 'Christopher'
        context['tagline'] = (
            'Services et Outils Professionnels' if is_french
            else 'Professional Services & Tools'
        )

        context['apps'] = [
            {
                'name': 'KrisPC',
                'icon': '🖥️',
                'description': (
                    'Réparations informatiques professionnelles' if is_french
                    else 'Professional computer repairs'
                ),
                'url': '/krispc/',
                'button_text': 'Accéder' if is_french else 'Visit',
            },
            {
                'name': 'Pdf2Cal',
                'icon': '📅',
                'description': (
                    'Convertissez vos PDF en calendriers' if is_french
                    else 'Convert your PDFs to calendars'
                ),
                'url': '/importpdf/',
                'button_text': 'Accéder' if is_french else 'Visit',
            }
        ]

        return context

class PrivacyView(TemplateView):
    template_name = "hub/privacy.html"

class TermsView(TemplateView):
    template_name = "hub/terms.html"
```

### 4. URL Configuration

```python
# hub/urls.py
from django.urls import path
from . import views

app_name = 'hub'

urlpatterns = [
    path('', views.IndexView.as_view(), name='index'),
    path('privacy/', views.PrivacyView.as_view(), name='privacy'),
    path('terms/', views.TermsView.as_view(), name='terms'),
]
```

```python
# _main/urls.py changes
urlpatterns += i18n_patterns(
    path("", include("hub.urls")),           # NEW: Hub at root
    path("krispc/", include("krispc.urls")), # MOVED from ""
    path("importpdf/", include("p2c.urls")), # UNCHANGED
    # ... rest unchanged
)
```

### 5. Settings Configuration

```python
# _main/settings.py
INSTALLED_APPS = [
    # ... existing apps
    'hub',  # Add this
]
```

### 6. Translation Setup

```bash
# Create locale directories
mkdir -p hub/locale/fr/LC_MESSAGES

# Generate translation files
python manage.py makemessages -l fr -d django --ignore=venv

# After translating .po files:
python manage.py compilemessages
```

### 7. Template Implementation

**Base Template:** Minimal base with i18n support, CSS loading
**Index Template:** Hero section, app cards grid, footer with links
**Privacy/Terms Templates:** Standard legal pages with bilingual content

## Migration Strategy

### Phase 1: Create Hub App
1. Create hub app structure
2. Implement views and templates
3. Test locally

### Phase 2: Update Routing
1. Update `_main/urls.py`
2. Add hub to `INSTALLED_APPS`
3. Test all URLs work correctly

### Phase 3: Deploy
1. Run migrations (if any)
2. Collect static files
3. Deploy to production
4. Verify both apps accessible at new URLs

### Backwards Compatibility
- Consider adding redirects for old KrisPC root URLs if needed
- Monitor analytics for 404s after deployment

## Testing Checklist

- [ ] Landing page loads at `/`
- [ ] KrisPC accessible at `/krispc/`
- [ ] Pdf2Cal accessible at `/importpdf/`
- [ ] Language switching works on landing page
- [ ] Language persists when navigating to apps
- [ ] Privacy/Terms pages load correctly
- [ ] Mobile responsive design works
- [ ] Card hover effects work
- [ ] All links functional
- [ ] Both languages display correctly

## Future Enhancements

- Add analytics tracking
- Consider adding third app slot if needed
- Add contact form or email link
- Consider adding blog/news section
- Add meta tags for SEO
