import json
import os
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

from django.test import RequestFactory, SimpleTestCase

from _main.urls import health_check


class HealthCheckTests(SimpleTestCase):
    def setUp(self):
        self.factory = RequestFactory()

    def test_health_check_is_healthy_without_readiness_gate(self):
        with patch.dict(os.environ, {}, clear=True):
            response = health_check(self.factory.get("/health"))

        assert response.status_code == 200
        assert json.loads(response.content) == {"status": "healthy"}

    def test_health_check_reports_starting_until_ready_file_exists(self):
        with TemporaryDirectory() as tmpdir:
            ready_file = str(Path(tmpdir) / "krispc-ready")
            with patch.dict(os.environ, {"KRISPC_READY_FILE": ready_file}, clear=True):
                response = health_check(self.factory.get("/health"))

                assert response.status_code == 503
                assert json.loads(response.content) == {"status": "starting"}

                Path(ready_file).touch()

                ready_response = health_check(self.factory.get("/health"))

        assert ready_response.status_code == 200
        assert json.loads(ready_response.content) == {"status": "healthy"}
