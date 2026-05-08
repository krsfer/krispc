"""Modern v2 design-system compliance crawler.

Asserts implementation intent (presence / absence of canonical utility classes
and forbidden patterns) on representative app pages. Companion to
test_ui_refresh.py, which checks suite-wide font/palette/marker presence;
this module checks per-element shape and forbidden patterns.

Spec: docs/STANDARDS.md (Modern v2). Tickets: T-002, T-003.
"""

from html.parser import HTMLParser

import pytest
from django.test import Client
from django.urls import reverse


PAGES = [
    ("Hub home", "hub:index"),
    ("KrisPC home", "krispc:index"),
    ("Plexus home", "plexus:index"),
    ("Pdf2Cal home", "p2c:home"),
]

BOOTSTRAP_CLASS_NAMES = {
    "btn", "btn-primary", "btn-secondary", "btn-success", "btn-danger",
    "btn-warning", "btn-info", "btn-light", "btn-dark",
    "btn-outline-primary", "btn-outline-secondary",
    "container-fluid",
    "col-1", "col-2", "col-3", "col-4", "col-5", "col-6",
    "col-7", "col-8", "col-9", "col-10", "col-11", "col-12",
    "col-md-1", "col-md-2", "col-md-3", "col-md-4", "col-md-6", "col-md-12",
    "col-lg-3", "col-lg-4", "col-lg-6", "col-lg-8", "col-lg-12",
    "col-sm-6", "col-sm-12",
    "d-flex", "d-block", "d-none", "d-inline", "d-inline-block",
    "text-muted", "navbar-nav", "nav-item", "nav-link",
    "form-control", "form-group", "form-check", "input-group",
    "card-body", "card-header", "card-title", "card-footer",
}


class _ElementCollector(HTMLParser):
    def __init__(self):
        super().__init__()
        self.elements = []

    def handle_starttag(self, tag, attrs):
        self.elements.append((tag, dict(attrs), self.getpos()[0]))

    def handle_startendtag(self, tag, attrs):
        self.elements.append((tag, dict(attrs), self.getpos()[0]))


def _parse(html):
    p = _ElementCollector()
    p.feed(html)
    return p.elements


def _classes_of(attrs):
    return set((attrs.get("class") or "").split())


def _is_button_element(tag, attrs):
    if tag == "button":
        return True
    if tag == "input" and attrs.get("type") in {"submit", "button", "reset"}:
        return True
    if attrs.get("role") == "button":
        return True
    if "cta" in (attrs.get("data-ui") or ""):
        return True
    return False


def _is_text_input(tag, attrs):
    if tag == "textarea":
        return True
    if tag == "input":
        return attrs.get("type", "text") in {
            "text", "email", "password", "tel", "url", "search",
            "number", "date", "datetime-local", "time", "month", "week",
        }
    return False


@pytest.mark.django_db
class TestDesignSystem:
    def setup_method(self):
        self.client = Client()

    def _fetch(self, target):
        url = reverse(target)
        response = self.client.get(url, follow=True)
        assert response.status_code == 200, (
            f"{target} ({url}) returned HTTP {response.status_code}"
        )
        return response.content.decode("utf-8")

    @pytest.mark.parametrize("name,target", PAGES)
    def test_buttons_use_v2_radius(self, name, target):
        violations = []
        for tag, attrs, lineno in _parse(self._fetch(target)):
            if not _is_button_element(tag, attrs):
                continue
            if "rounded-xl" not in _classes_of(attrs):
                violations.append(
                    f"line {lineno}: <{tag} class={attrs.get('class', '')!r}>"
                )
        assert not violations, (
            f"{name}: {len(violations)} button(s) missing 'rounded-xl' "
            f"(STANDARDS.md §3.1):\n"
            + "\n".join(f"  - {v}" for v in violations[:10])
        )

    @pytest.mark.parametrize("name,target", PAGES)
    def test_inputs_use_v2_radius(self, name, target):
        violations = []
        for tag, attrs, lineno in _parse(self._fetch(target)):
            if not _is_text_input(tag, attrs):
                continue
            if not (_classes_of(attrs) & {"rounded-md", "rounded-xl"}):
                violations.append(
                    f"line {lineno}: <{tag} class={attrs.get('class', '')!r}>"
                )
        assert not violations, (
            f"{name}: {len(violations)} input(s) missing 'rounded-md' "
            f"(STANDARDS.md §3.2):\n"
            + "\n".join(f"  - {v}" for v in violations[:10])
        )

    @pytest.mark.parametrize("name,target", PAGES)
    def test_no_inline_styles(self, name, target):
        violations = []
        for tag, attrs, lineno in _parse(self._fetch(target)):
            if "style" in attrs:
                violations.append(
                    f"line {lineno}: <{tag} style={attrs['style']!r}>"
                )
        assert not violations, (
            f"{name}: {len(violations)} element(s) with inline style= attribute "
            f"(STANDARDS.md §4 forbids inline style):\n"
            + "\n".join(f"  - {v}" for v in violations[:10])
        )

    @pytest.mark.parametrize("name,target", PAGES)
    def test_no_bootstrap_class_names(self, name, target):
        violations = []
        for tag, attrs, lineno in _parse(self._fetch(target)):
            offenders = _classes_of(attrs) & BOOTSTRAP_CLASS_NAMES
            if offenders:
                violations.append(
                    f"line {lineno}: <{tag}> uses {sorted(offenders)}"
                )
        assert not violations, (
            f"{name}: {len(violations)} element(s) using Bootstrap class names "
            f"(STANDARDS.md §1 deprecation):\n"
            + "\n".join(f"  - {v}" for v in violations[:10])
        )

    @pytest.mark.parametrize("name,target", PAGES)
    def test_no_jquery_references(self, name, target):
        html = self._fetch(target).lower()
        for needle in ("jquery.min.js", "jquery-3", "code.jquery.com"):
            assert needle not in html, (
                f"{name}: contains forbidden jQuery reference {needle!r} "
                f"(STANDARDS.md §1 deprecation)"
            )

    def test_glass_card_pattern_present_somewhere(self):
        """Across the suite, at least one element must use the glass card
        pattern (bg-white/80 + backdrop-blur-md + border-stone-200). Catches
        the case where STANDARDS.md §2.6 is documented but never adopted."""
        required = {"bg-white/80", "backdrop-blur-md", "border-stone-200"}
        for _, target in PAGES:
            for _, attrs, _ in _parse(self._fetch(target)):
                if required.issubset(_classes_of(attrs)):
                    return
        pytest.fail(
            "No element across the suite uses the canonical glass card "
            "pattern (bg-white/80 + backdrop-blur-md + border-stone-200). "
            "STANDARDS.md §2.6 is unmet."
        )
