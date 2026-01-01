# Landing Page Hub Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a bilingual landing page hub at root domain that links to KrisPC and Pdf2Cal apps

**Architecture:** New Django app called `hub` at root URL with views for index, privacy, and terms pages. KrisPC moves from `/` to `/krispc/`. Uses Django i18n for bilingual support (FR/EN). Minimal dependencies - just Django templates and vanilla CSS.

**Tech Stack:** Django 4.2, Django i18n, vanilla CSS, emoji icons

---

## Task 1: Create Hub App Structure

**Files:**
- Create: `hub/__init__.py`
- Create: `hub/apps.py`
- Create: `hub/views.py`
- Create: `hub/urls.py`
- Create: `hub/tests.py`

**Step 1: Create hub app using Django command**

Run: `python manage.py startapp hub`

Expected: Directory `hub/` created with standard Django app structure

**Step 2: Verify app structure**

Run: `ls -la hub/`

Expected output:
```
__init__.py
admin.py
apps.py
migrations/
models.py
tests.py
views.py
```

**Step 3: Create urls.py file**

Run: `touch hub/urls.py`

**Step 4: Commit**

```bash
git add hub/
git commit -m "feat(hub): create Django app structure for landing page"
```

---

## Task 2: Implement Hub Views

**Files:**
- Modify: `hub/views.py`
- Modify: `hub/tests.py`

**Step 1: Write test for IndexView context**

In `hub/tests.py`:

```python
from django.test import TestCase, RequestFactory
from django.utils.translation import activate
from .views import IndexView


class IndexViewTests(TestCase):
    def setUp(self):
        self.factory = RequestFactory()

    def test_index_view_context_french(self):
        activate('fr')
        request = self.factory.get('/')
        view = IndexView()
        view.request = request
        context = view.get_context_data()

        self.assertEqual(context['page_title'], 'Christopher')
        self.assertEqual(context['tagline'], 'Services et Outils Professionnels')
        self.assertEqual(len(context['apps']), 2)
        self.assertEqual(context['apps'][0]['name'], 'KrisPC')
        self.assertEqual(context['apps'][1]['name'], 'Pdf2Cal')

    def test_index_view_context_english(self):
        activate('en')
        request = self.factory.get('/')
        view = IndexView()
        view.request = request
        context = view.get_context_data()

        self.assertEqual(context['tagline'], 'Professional Services & Tools')
        self.assertEqual(context['apps'][0]['button_text'], 'Visit')
```

**Step 2: Run test to verify it fails**

Run: `python manage.py test hub.tests.IndexViewTests -v 2`

Expected: FAIL - IndexView not defined

**Step 3: Implement IndexView**

In `hub/views.py`:

```python
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

**Step 4: Run tests to verify they pass**

Run: `python manage.py test hub.tests.IndexViewTests -v 2`

Expected: PASS (2 tests)

**Step 5: Commit**

```bash
git add hub/views.py hub/tests.py
git commit -m "feat(hub): implement IndexView with bilingual context"
```

---

## Task 3: Configure Hub URLs

**Files:**
- Modify: `hub/urls.py`
- Modify: `hub/tests.py`

**Step 1: Write test for URL routing**

Add to `hub/tests.py`:

```python
from django.test import TestCase
from django.urls import reverse, resolve
from .views import IndexView, PrivacyView, TermsView


class HubURLTests(TestCase):
    def test_index_url_resolves(self):
        url = reverse('hub:index')
        self.assertEqual(url, '/')
        self.assertEqual(resolve(url).func.view_class, IndexView)

    def test_privacy_url_resolves(self):
        url = reverse('hub:privacy')
        self.assertEqual(url, '/privacy/')
        self.assertEqual(resolve(url).func.view_class, PrivacyView)

    def test_terms_url_resolves(self):
        url = reverse('hub:terms')
        self.assertEqual(url, '/terms/')
        self.assertEqual(resolve(url).func.view_class, TermsView)
```

**Step 2: Run test to verify it fails**

Run: `python manage.py test hub.tests.HubURLTests -v 2`

Expected: FAIL - No reverse match for 'hub:index'

**Step 3: Implement URL configuration**

In `hub/urls.py`:

```python
from django.urls import path
from . import views

app_name = 'hub'

urlpatterns = [
    path('', views.IndexView.as_view(), name='index'),
    path('privacy/', views.PrivacyView.as_view(), name='privacy'),
    path('terms/', views.TermsView.as_view(), name='terms'),
]
```

**Step 4: Add hub to INSTALLED_APPS temporarily for testing**

In `_main/settings.py`, add `'hub'` to INSTALLED_APPS after `'p2c'`:

```python
INSTALLED_APPS = [
    # ... existing apps
    "p2c",
    "hub",  # Add this line
    "rest_framework",
]
```

**Step 5: Run tests to verify they pass**

Run: `python manage.py test hub.tests.HubURLTests -v 2`

Expected: PASS (3 tests) - Note: may fail on path assertions until main urls.py updated

**Step 6: Commit**

```bash
git add hub/urls.py hub/tests.py _main/settings.py
git commit -m "feat(hub): configure URL routing for hub app"
```

---

## Task 4: Create Template Directory Structure

**Files:**
- Create: `hub/templates/hub/base.html`
- Create: `hub/templates/hub/index.html`
- Create: `hub/templates/hub/privacy.html`
- Create: `hub/templates/hub/terms.html`

**Step 1: Create template directories**

Run: `mkdir -p hub/templates/hub`

**Step 2: Create base template**

In `hub/templates/hub/base.html`:

```html
{% load i18n %}
{% load static %}
<!DOCTYPE html>
<html lang="{{ LANGUAGE_CODE }}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{% block title %}Christopher{% endblock %}</title>
    <link rel="stylesheet" href="{% static 'hub/css/style.css' %}">
</head>
<body>
    <header class="header">
        <div class="container">
            <h1 class="brand">Christopher</h1>
            <nav class="language-toggle">
                <form action="{% url 'set_language' %}" method="post">
                    {% csrf_token %}
                    <input name="next" type="hidden" value="{{ request.path }}">
                    <select name="language" onchange="this.form.submit()" class="language-select">
                        <option value="fr" {% if LANGUAGE_CODE == 'fr' %}selected{% endif %}>Français</option>
                        <option value="en" {% if LANGUAGE_CODE == 'en' %}selected{% endif %}>English</option>
                    </select>
                </form>
            </nav>
        </div>
    </header>

    <main class="main">
        {% block content %}{% endblock %}
    </main>

    <footer class="footer">
        <div class="container">
            <nav class="footer-nav">
                <a href="{% url 'hub:privacy' %}">{% trans "Privacy" %}</a>
                <span class="separator">|</span>
                <a href="{% url 'hub:terms' %}">{% trans "Terms" %}</a>
                <span class="separator">|</span>
                <span>&copy; 2026</span>
            </nav>
            <div class="language-footer">
                <form action="{% url 'set_language' %}" method="post">
                    {% csrf_token %}
                    <input name="next" type="hidden" value="{{ request.path }}">
                    <button type="submit" name="language" value="fr" class="lang-btn {% if LANGUAGE_CODE == 'fr' %}active{% endif %}">Français</button>
                    <span class="separator">|</span>
                    <button type="submit" name="language" value="en" class="lang-btn {% if LANGUAGE_CODE == 'en' %}active{% endif %}">English</button>
                </form>
            </div>
        </div>
    </footer>
</body>
</html>
```

**Step 3: Create index template**

In `hub/templates/hub/index.html`:

```html
{% extends "hub/base.html" %}
{% load i18n %}

{% block title %}{{ page_title }}{% endblock %}

{% block content %}
<div class="container">
    <section class="hero">
        <h2 class="hero-title">{{ page_title }}</h2>
        <p class="hero-tagline">{{ tagline }}</p>
    </section>

    <section class="apps-grid">
        {% for app in apps %}
        <div class="app-card">
            <div class="app-icon">{{ app.icon }}</div>
            <h3 class="app-name">{{ app.name }}</h3>
            <p class="app-description">{{ app.description }}</p>
            <a href="{{ app.url }}" class="app-button">{{ app.button_text }}</a>
        </div>
        {% endfor %}
    </section>
</div>
{% endblock %}
```

**Step 4: Create privacy template**

In `hub/templates/hub/privacy.html`:

```html
{% extends "hub/base.html" %}
{% load i18n %}

{% block title %}{% trans "Privacy Policy" %}{% endblock %}

{% block content %}
<div class="container">
    <div class="legal-content">
        <h1>{% trans "Privacy Policy" %}</h1>

        {% if LANGUAGE_CODE == 'fr' %}
        <p>Cette politique de confidentialité s'applique à tous les services fournis par Christopher.</p>

        <h2>Services Couverts</h2>
        <p>Cette politique couvre:</p>
        <ul>
            <li>KrisPC - Service de réparation informatique</li>
            <li>Pdf2Cal - Outil de conversion PDF vers calendrier</li>
        </ul>

        <h2>Collecte de Données</h2>
        <p>Nous collectons uniquement les données nécessaires pour fournir nos services.</p>

        <h2>Contact</h2>
        <p>Pour toute question concernant cette politique, veuillez consulter les pages de confidentialité spécifiques à chaque application:</p>
        <ul>
            <li><a href="/krispc/privacy/">Politique de confidentialité KrisPC</a></li>
            <li><a href="/importpdf/privacy/">Politique de confidentialité Pdf2Cal</a></li>
        </ul>
        {% else %}
        <p>This privacy policy applies to all services provided by Christopher.</p>

        <h2>Covered Services</h2>
        <p>This policy covers:</p>
        <ul>
            <li>KrisPC - Computer repair service</li>
            <li>Pdf2Cal - PDF to calendar conversion tool</li>
        </ul>

        <h2>Data Collection</h2>
        <p>We only collect data necessary to provide our services.</p>

        <h2>Contact</h2>
        <p>For questions about this policy, please see the application-specific privacy pages:</p>
        <ul>
            <li><a href="/krispc/privacy/">KrisPC Privacy Policy</a></li>
            <li><a href="/importpdf/privacy/">Pdf2Cal Privacy Policy</a></li>
        </ul>
        {% endif %}
    </div>
</div>
{% endblock %}
```

**Step 5: Create terms template**

In `hub/templates/hub/terms.html`:

```html
{% extends "hub/base.html" %}
{% load i18n %}

{% block title %}{% trans "Terms of Service" %}{% endblock %}

{% block content %}
<div class="container">
    <div class="legal-content">
        <h1>{% trans "Terms of Service" %}</h1>

        {% if LANGUAGE_CODE == 'fr' %}
        <p>Ces conditions d'utilisation s'appliquent à tous les services fournis par Christopher.</p>

        <h2>Services Couverts</h2>
        <p>Ces conditions couvrent:</p>
        <ul>
            <li>KrisPC - Service de réparation informatique</li>
            <li>Pdf2Cal - Outil de conversion PDF vers calendrier</li>
        </ul>

        <h2>Acceptation des Conditions</h2>
        <p>En utilisant nos services, vous acceptez ces conditions d'utilisation.</p>

        <h2>Conditions Spécifiques</h2>
        <p>Pour les conditions spécifiques à chaque application, veuillez consulter:</p>
        <ul>
            <li><a href="/krispc/terms/">Conditions d'utilisation KrisPC</a></li>
            <li><a href="/importpdf/terms/">Conditions d'utilisation Pdf2Cal</a></li>
        </ul>
        {% else %}
        <p>These terms of service apply to all services provided by Christopher.</p>

        <h2>Covered Services</h2>
        <p>These terms cover:</p>
        <ul>
            <li>KrisPC - Computer repair service</li>
            <li>Pdf2Cal - PDF to calendar conversion tool</li>
        </ul>

        <h2>Acceptance of Terms</h2>
        <p>By using our services, you agree to these terms of service.</p>

        <h2>Application-Specific Terms</h2>
        <p>For application-specific terms, please see:</p>
        <ul>
            <li><a href="/krispc/terms/">KrisPC Terms of Service</a></li>
            <li><a href="/importpdf/terms/">Pdf2Cal Terms of Service</a></li>
        </ul>
        {% endif %}
    </div>
</div>
{% endblock %}
```

**Step 6: Verify templates exist**

Run: `ls -la hub/templates/hub/`

Expected: base.html, index.html, privacy.html, terms.html

**Step 7: Commit**

```bash
git add hub/templates/
git commit -m "feat(hub): create bilingual templates for landing page"
```

---

## Task 5: Create Static CSS

**Files:**
- Create: `hub/static/hub/css/style.css`

**Step 1: Create static directory structure**

Run: `mkdir -p hub/static/hub/css`

**Step 2: Create stylesheet**

In `hub/static/hub/css/style.css`:

```css
/* Reset and base styles */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
    color: #1F2937;
    background: #F9FAFB;
    line-height: 1.6;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 1.5rem;
    width: 100%;
}

/* Header */
.header {
    background: white;
    border-bottom: 1px solid #E5E7EB;
    padding: 1rem 0;
}

.header .container {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.brand {
    font-size: 1.5rem;
    font-weight: 600;
    color: #4F46E5;
}

.language-select {
    padding: 0.5rem 1rem;
    border: 1px solid #E5E7EB;
    border-radius: 0.5rem;
    background: white;
    color: #1F2937;
    cursor: pointer;
    font-size: 0.875rem;
}

.language-select:hover {
    border-color: #4F46E5;
}

/* Main content */
.main {
    flex: 1;
    padding: 3rem 0;
}

/* Hero section */
.hero {
    text-align: center;
    margin-bottom: 3rem;
}

.hero-title {
    font-size: 2.5rem;
    font-weight: 700;
    color: #1F2937;
    margin-bottom: 0.5rem;
}

.hero-tagline {
    font-size: 1.25rem;
    color: #6B7280;
}

/* Apps grid */
.apps-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
    max-width: 800px;
    margin: 0 auto;
}

/* App card */
.app-card {
    background: white;
    border-radius: 12px;
    padding: 2rem;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    transition: all 200ms ease;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
}

.app-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
}

.app-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
}

.app-name {
    font-size: 1.5rem;
    font-weight: 600;
    color: #1F2937;
    margin-bottom: 0.75rem;
}

.app-description {
    color: #6B7280;
    margin-bottom: 1.5rem;
    flex: 1;
}

.app-button {
    display: inline-block;
    padding: 0.75rem 2rem;
    background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
    color: white;
    text-decoration: none;
    border-radius: 8px;
    font-weight: 500;
    transition: all 200ms ease;
}

.app-button:hover {
    filter: brightness(1.1);
    transform: translateY(-2px);
}

/* Footer */
.footer {
    background: white;
    border-top: 1px solid #E5E7EB;
    padding: 2rem 0;
    margin-top: auto;
}

.footer .container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
}

.footer-nav {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
}

.footer-nav a {
    color: #6B7280;
    text-decoration: none;
}

.footer-nav a:hover {
    color: #4F46E5;
}

.separator {
    color: #E5E7EB;
}

.language-footer {
    font-size: 0.875rem;
}

.language-footer form {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.lang-btn {
    background: none;
    border: none;
    color: #6B7280;
    cursor: pointer;
    padding: 0;
    font-size: 0.875rem;
}

.lang-btn:hover {
    color: #4F46E5;
}

.lang-btn.active {
    color: #4F46E5;
    font-weight: 600;
}

/* Legal content */
.legal-content {
    background: white;
    border-radius: 12px;
    padding: 3rem;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    max-width: 800px;
    margin: 0 auto;
}

.legal-content h1 {
    font-size: 2rem;
    margin-bottom: 1.5rem;
    color: #1F2937;
}

.legal-content h2 {
    font-size: 1.5rem;
    margin-top: 2rem;
    margin-bottom: 1rem;
    color: #1F2937;
}

.legal-content p {
    margin-bottom: 1rem;
    color: #4B5563;
}

.legal-content ul {
    margin-bottom: 1rem;
    margin-left: 2rem;
}

.legal-content li {
    margin-bottom: 0.5rem;
    color: #4B5563;
}

.legal-content a {
    color: #4F46E5;
    text-decoration: none;
}

.legal-content a:hover {
    text-decoration: underline;
}

/* Responsive design */
@media (max-width: 768px) {
    .hero-title {
        font-size: 2rem;
    }

    .hero-tagline {
        font-size: 1rem;
    }

    .apps-grid {
        grid-template-columns: 1fr;
    }

    .legal-content {
        padding: 2rem 1.5rem;
    }
}

@media (max-width: 640px) {
    .app-button {
        width: 100%;
    }
}
```

**Step 3: Verify CSS file exists**

Run: `ls -la hub/static/hub/css/`

Expected: style.css

**Step 4: Commit**

```bash
git add hub/static/
git commit -m "feat(hub): add responsive CSS styling for landing page"
```

---

## Task 6: Update Main URLs Configuration

**Files:**
- Modify: `_main/urls.py`

**Step 1: Read current urls.py**

Run: `cat _main/urls.py`

**Step 2: Update URLs to move KrisPC and add hub**

Modify `_main/urls.py`, change the `i18n_patterns` section from:

```python
urlpatterns += i18n_patterns(
    path("", include("krispc.urls")),
    path("wat/", include("wat.urls")),
```

To:

```python
urlpatterns += i18n_patterns(
    path("", include("hub.urls")),
    path("krispc/", include("krispc.urls")),
    path("wat/", include("wat.urls")),
```

**Step 3: Verify changes**

Run: `grep -A 5 "i18n_patterns" _main/urls.py`

Expected: hub at root, krispc at /krispc/

**Step 4: Commit**

```bash
git add _main/urls.py
git commit -m "feat(hub): configure root URL routing and move KrisPC to /krispc/"
```

---

## Task 7: Test All URLs Work

**Files:**
- No file changes (testing only)

**Step 1: Run development server**

Run: `python manage.py runserver`

Expected: Server starts on http://127.0.0.1:8000

**Step 2: Test landing page loads**

Open browser: `http://127.0.0.1:8000/`

Expected: Hub landing page displays with KrisPC and Pdf2Cal cards

**Step 3: Test KrisPC moved to /krispc/**

Open browser: `http://127.0.0.1:8000/krispc/`

Expected: KrisPC home page loads

**Step 4: Test Pdf2Cal still at /importpdf/**

Open browser: `http://127.0.0.1:8000/importpdf/`

Expected: Pdf2Cal page loads

**Step 5: Test privacy page**

Open browser: `http://127.0.0.1:8000/privacy/`

Expected: Hub privacy policy displays

**Step 6: Test terms page**

Open browser: `http://127.0.0.1:8000/terms/`

Expected: Hub terms of service displays

**Step 7: Test language switching**

On landing page, switch language to Français

Expected: Content changes to French

**Step 8: Stop server**

Press Ctrl+C

---

## Task 8: Create Translation Files

**Files:**
- Create: `hub/locale/fr/LC_MESSAGES/django.po`

**Step 1: Create locale directory**

Run: `mkdir -p hub/locale/fr/LC_MESSAGES`

**Step 2: Generate message files**

Run: `cd hub && django-admin makemessages -l fr --ignore=venv`

Expected: Creates django.po file with translatable strings

**Step 3: Verify .po file created**

Run: `ls -la hub/locale/fr/LC_MESSAGES/`

Expected: django.po exists

**Step 4: Compile messages**

Run: `python manage.py compilemessages`

Expected: Creates django.mo files

**Step 5: Commit**

```bash
git add hub/locale/
git commit -m "feat(hub): add French translation support"
```

---

## Task 9: Run All Tests

**Files:**
- No file changes (testing only)

**Step 1: Run all hub tests**

Run: `python manage.py test hub -v 2`

Expected: All tests pass

**Step 2: Run full test suite**

Run: `python manage.py test`

Expected: All project tests pass

**Step 3: Check for any errors**

If tests fail, review and fix issues before proceeding

---

## Task 10: Collect Static Files and Final Verification

**Files:**
- No file changes (deployment preparation)

**Step 1: Collect static files**

Run: `python manage.py collectstatic --noinput`

Expected: Static files collected successfully

**Step 2: Test with production-like settings**

Run server and verify:
- Landing page loads at `/`
- Static CSS loads correctly
- Language switching works
- All links functional
- Mobile responsive (resize browser)

**Step 3: Run final checklist**

Verify:
- [ ] Landing page loads at `/`
- [ ] KrisPC accessible at `/krispc/`
- [ ] Pdf2Cal accessible at `/importpdf/`
- [ ] Language switching works on landing page
- [ ] Privacy/Terms pages load correctly
- [ ] Mobile responsive design works
- [ ] Card hover effects work
- [ ] All links functional

**Step 4: Final commit**

```bash
git add .
git commit -m "feat(hub): complete landing page implementation with all features"
```

---

## Deployment Notes

When deploying to production:

1. Ensure `hub` is in `INSTALLED_APPS`
2. Run `python manage.py collectstatic`
3. Restart application server
4. Monitor for any 404s from old KrisPC root URLs
5. Consider adding redirects if needed:
   ```python
   # In _main/urls.py if needed
   from django.views.generic import RedirectView
   # Add redirect for old URLs if analytics show traffic
   ```

## Rollback Plan

If issues occur:

1. Revert `_main/urls.py` changes:
   ```python
   urlpatterns += i18n_patterns(
       path("", include("krispc.urls")),  # Back to root
   ```

2. Remove `'hub'` from `INSTALLED_APPS`

3. Restart server

4. Landing page becomes inaccessible but KrisPC returns to root
