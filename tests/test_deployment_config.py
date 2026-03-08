from pathlib import Path


def test_dockerignore_excludes_generated_vite_dist():
    dockerignore = Path(".dockerignore").read_text(encoding="utf-8")

    assert "krispc/static/dist/" in dockerignore.splitlines()
