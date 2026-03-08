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
