import pytest
from p2c.pdf_processing.auxiliadom_parser import AuxiliadomPDFParser

class TestAuxiliadomPDFParser:
    @pytest.fixture
    def parser(self):
        return AuxiliadomPDFParser()

    def test_format_time(self, parser):
        assert parser._format_time(8, 0, 10, 30) == "08:00-10:30"
        assert parser._format_time(0, 0, 23, 59) == "00:00-23:59"

    def test_is_valid_time(self, parser):
        assert parser._is_valid_time(8, 30) is True
        assert parser._is_valid_time(24, 0) is False
        assert parser._is_valid_time(12, 60) is False
        assert parser._is_valid_time(-1, 0) is False

    def test_calculate_duration_minutes(self, parser):
        # Normal duration
        assert parser._calculate_duration_minutes(8, 0, 10, 0) == 120
        # Overnight duration (22:00 to 02:00 = 4 hours)
        assert parser._calculate_duration_minutes(22, 0, 2, 0) == 240
        # Partial hour
        assert parser._calculate_duration_minutes(8, 30, 9, 45) == 75

    def test_format_duration(self, parser):
        assert parser._format_duration(120) == "02:00"
        assert parser._format_duration(75) == "01:15"
        assert parser._format_duration(0) == "00:00"

    def test_normalize_text(self, parser):
        assert parser._normalize_text("DUPONT, Jean") == "DUPONT, Jean"
        assert parser._normalize_text("smith   john") == "SMITH, John"
        # Test with accents
        assert parser._normalize_text("hélène duval") == "HELENE, Duval" # Assuming logic splits on space and takes first as last name

    def test_extract_schedule_entries_mocked(self, parser, mock_pdfplumber):
        # Setup mock return values for pdfplumber
        # Page 1: Header + Schedule
        mock_pdfplumber.extract_text.return_value = """
        Planning Interventions - JANVIER 2024
        """
    
        headers = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]
        # Row 1: Day numbers - Use "01 Total" to ensure it matches day_pattern regex (\d{1,2})(?:\s*Total.*|\s*$)
        row_days = ["01 Total", "02 Total", "03", "04", "05", "06", "07"]
        # Row 2: Appointments
        row_appts = ["08:00-10:00\nDUPONT Jean", "14:00-16:00\nMARTIN Pierre", None, None, None, None, None]
    
        mock_pdfplumber.extract_tables.return_value = [[headers, row_days, row_appts]]
    
        # Execute parsing
        entries = parser.extract_schedule_entries("dummy_path.pdf")
    
        # Verify results
        assert len(entries) == 2
    
        entry1 = next(e for e in entries if e["day"] == 1)
        assert entry1["start_time"] == "08:00"
        assert "DUPONT" in entry1["normalized_name"]

    def test_extract_schedule_entries_ignore_breaks(self, parser, mock_pdfplumber):
        mock_pdfplumber.extract_text.return_value = """
        Planning Interventions - JANVIER 2024
        """
        
        headers = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]
        row_days = ["01", "02", "03", "04", "05", "06", "07"]
        # Appointment with pause
        row_appts = ["12:00-13:00\nTemps de pause repas", None, None, None, None, None, None]
        
        mock_pdfplumber.extract_tables.return_value = [[headers, row_days, row_appts]]
        
        entries = parser.extract_schedule_entries("dummy_path.pdf")
        assert len(entries) == 0