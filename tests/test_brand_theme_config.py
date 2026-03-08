from pathlib import Path


def test_tailwind_brand_theme_uses_legacy_krispc_palette_and_fonts():
    config = Path("tailwind.config.js").read_text(encoding="utf-8")

    assert "DEFAULT: '#ffc451'" in config
    assert "DEFAULT: '#00d4aa'" in config
    assert "brand: ['Lobster', 'cursive']" in config
    assert "sans: ['Inter', 'sans-serif']" in config


def test_golden_base_loads_legacy_google_fonts():
    template = Path("templates/layouts/golden_base.html").read_text(encoding="utf-8")

    assert "family=Inter:wght@400;500;600;700&family=Lobster&display=swap" in template


def test_vue_shell_uses_flat_light_brand_chrome():
    nav = Path("krispc/static/src/components/AppNavigation.vue").read_text(encoding="utf-8")
    footer = Path("krispc/static/src/components/AppFooter.vue").read_text(encoding="utf-8")

    assert "bg-white border-b border-gray-200" in nav
    assert "backdrop-blur" not in nav
    assert "dark:" not in nav

    assert 'class="bg-white border-t border-gray-200' in footer
    assert "dark:" not in footer


def test_vue_sections_use_light_brand_styling_without_gradients_or_dark_mode():
    hero = Path("krispc/static/src/components/HeroSection.vue").read_text(encoding="utf-8")
    custom_css = Path("krispc/static/src/styles/custom.css").read_text(encoding="utf-8")

    assert "font-brand" in hero
    assert "bg-gradient" not in hero
    assert "dark:" not in hero

    for component_path in [
        "krispc/static/src/components/AboutSection.vue",
        "krispc/static/src/components/ServicesSection.vue",
        "krispc/static/src/components/ServiceCard.vue",
        "krispc/static/src/components/ServiceModal.vue",
        "krispc/static/src/components/TeamSection.vue",
        "krispc/static/src/components/ContactForm.vue",
        "krispc/static/src/components/LanguageSelector.vue",
    ]:
        component = Path(component_path).read_text(encoding="utf-8")
        assert "dark:" not in component
        assert "bg-gradient" not in component

    assert ".glass" not in custom_css
    assert ".gradient-text" not in custom_css
