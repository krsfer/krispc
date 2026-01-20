import pytest
from django.conf import settings
from unittest.mock import MagicMock

@pytest.fixture(autouse=True)
def enable_db_access_for_all_tests(db):
    """Enable database access for all tests."""
    pass

@pytest.fixture
def mock_google_calendar_service(mocker):
    """Mock the Google Calendar API service."""
    mock_service = MagicMock()
    mock_events = MagicMock()
    mock_service.events.return_value = mock_events
    
    # Mock execute() for various calls
    mock_events.list.return_value.execute.return_value = {"items": []}
    mock_events.insert.return_value.execute.return_value = {"id": "new_event_id"}
    mock_events.delete.return_value.execute.return_value = {}
    mock_events.update.return_value.execute.return_value = {"id": "updated_event_id"}
    
    mocker.patch("p2c.tasks.build", return_value=mock_service)
    mocker.patch("p2c.views.build", return_value=mock_service)
    return mock_service

@pytest.fixture
def mock_pdfplumber(mocker):
    """Mock pdfplumber for PDF parsing tests."""
    mock_pdf = MagicMock()
    mock_page = MagicMock()
    mock_pdf.pages = [mock_page]
    mock_context = MagicMock()
    mock_context.__enter__.return_value = mock_pdf
    mock_context.__exit__.return_value = None
    
    mocker.patch("pdfplumber.open", return_value=mock_context)
    return mock_page

@pytest.fixture
def sample_auxiliadom_text():
    """Return sample text mimicking Auxiliadom PDF content."""
    return """
    Planning Interventions - JANVIER 2024
    
    01 Lundi
    08h00-10h00
    Mme DUPONT, Jean (CODE123)
    
    Total: 2h00
    """

@pytest.fixture
def sample_schedule_table():
    """Return sample table data for SchedulePDFParser."""
    # Header row
    header = ["", "lun. 01", "mar. 02", "mer. 03", "jeu. 04", "ven. 05", "sam. 06", "dim. 07"]
    # Row 1
    row1 = ["", "08:00\nDoe John", None, None, "14:00\nSmith Jane", None, None, None]
    return [header, row1]

