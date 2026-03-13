from __future__ import annotations

from typing import Optional

from django_vite.core.asset_loader import DjangoViteAppClient, ManifestClient


class ReloadingManifestClient(ManifestClient):
    def __init__(self, config, app_name="default") -> None:
        super().__init__(config, app_name)
        self._manifest_mtime_ns = self._get_manifest_mtime_ns()

    def _get_manifest_mtime_ns(self) -> Optional[int]:
        try:
            return self.manifest_path.stat().st_mtime_ns
        except FileNotFoundError:
            return None

    def _refresh_if_needed(self) -> None:
        if self.dev_mode:
            return

        current_mtime_ns = self._get_manifest_mtime_ns()
        if current_mtime_ns == self._manifest_mtime_ns:
            return

        self._entries, self.legacy_polyfills_entry = self._parse_manifest()
        self._manifest_mtime_ns = current_mtime_ns

    def get(self, path: str):
        self._refresh_if_needed()
        return super().get(path)


class ReloadingDjangoViteAppClient(DjangoViteAppClient):
    ManifestClient = ReloadingManifestClient
