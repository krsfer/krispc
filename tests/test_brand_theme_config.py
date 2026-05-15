from pathlib import Path


def test_vue_shell_uses_flat_light_brand_chrome():
    nav = Path("krispc/static/src/components/AppNavigation.vue").read_text(encoding="utf-8")
    footer = Path("krispc/static/src/components/AppFooter.vue").read_text(encoding="utf-8")

    assert "bg-white border-b border-gray-200" in nav
    assert "backdrop-blur" not in nav
    assert "dark:" not in nav

    assert 'class="bg-white border-t border-gray-200' in footer
    assert "dark:" not in footer


