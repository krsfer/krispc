import json
import time
from pathlib import Path

import pytest
from django_vite.core.asset_loader import DjangoViteConfig

from krispc.vite import ReloadingDjangoViteAppClient


def write_manifest(path: Path, file_name: str) -> None:
    path.write_text(
        json.dumps(
            {
                "main.js": {
                    "file": file_name,
                    "src": "main.js",
                    "isEntry": True,
                }
            }
        ),
        encoding="utf-8",
    )


@pytest.mark.django_db
def test_vite_client_reloads_manifest_after_build(tmp_path):
    manifest_path = tmp_path / "manifest.json"
    write_manifest(manifest_path, "assets/main-old.js")

    client = ReloadingDjangoViteAppClient(
        DjangoViteConfig(
            dev_mode=False,
            manifest_path=manifest_path,
        )
    )

    first_url = client.generate_vite_asset_url("main.js")
    assert first_url.endswith("/static/assets/main-old.js")

    time.sleep(0.02)
    write_manifest(manifest_path, "assets/main-new.js")

    second_url = client.generate_vite_asset_url("main.js")

    assert second_url.endswith("/static/assets/main-new.js")
