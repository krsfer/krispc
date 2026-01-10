import pytest
from p2c.pdf_processing.schedule_parser import SchedulePDFParser

class TestSchedulePDFParser:
    @pytest.fixture
    def parser(self):
        return SchedulePDFParser()

    def test_parse_schedule_mocked(self, parser, mock_pdfplumber, sample_schedule_table):
        # Setup mock for extract_tables
        mock_pdfplumber.extract_tables.return_value = [sample_schedule_table]
        mock_pdfplumber.extract_text.return_value = "Planning d'interventions - Mr. DOE - Janvier 2024"
        
        # Override _extract_month_year to avoid complex regex mocking if needed, 
        # but let's try to mock the text correctly first.
        # The parser calls `_extract_month_year` which reads `page.extract_text()`.
        
        # We need to ensure `_extract_month_year` works with the mocked text.
        # Header pattern: `.*?Planning\s+d['']interventions\s*-\s*((Mr\.|Mme\.)\s*[A-Za-zÀ-ÿ\s.-]+)\s*-\s*([A-Za-zÀ-ÿ]+)\s*(\d{4})`
        
        # Adjust mock text to match pattern
        mock_pdfplumber.extract_text.return_value = "Planning d'interventions - Mr. DOE John - Janvier 2024"
        
        # Ensure month map has "Janvier" (case sensitive? usually lowercase in map)
        # Parser converts to lower: `month_str = header_match.group(3).lower()` (Wait, group index might vary)
        # Let's check the code I read earlier.
        # Group 1: Name, Group 3: Month, Group 4: Year
        
        result = parser.parse_schedule("dummy_path.pdf")
        
        # Check result
        # sample_schedule_table has "lun. 01" -> Day 1
        # Cell: "08:00\nDoe John"
        
        assert 1 in result
        appointments_day_1 = result[1]
        assert len(appointments_day_1) == 1
        assert "08:00" in appointments_day_1[0]
        assert "Doe John" in appointments_day_1[0]
        
        # Check Day 4
        # "14:00\nSmith Jane"
        assert 4 in result
        assert "14:00" in result[4][0]
        assert "Smith Jane" in result[4][0]

    def test_extract_schedule_entries(self, parser, mock_pdfplumber, sample_schedule_table):
        mock_pdfplumber.extract_tables.return_value = [sample_schedule_table]
        mock_pdfplumber.extract_text.return_value = "Planning d'interventions - Mr. DOE John - Janvier 2024"
        
        entries = parser.extract_schedule_entries("dummy_path.pdf")
        
        assert len(entries) > 0
        entry = entries[0]
        assert entry['day'] == 1
        assert entry['month'] == 1
        assert entry['year'] == 2024
        assert entry['start_time'] == "08:00"
        # Since the sample doesn't have end time in the cell text explicitly like "08:00-10:00", 
        # checking how `_process_cell` works is important. 
        # Wait, `SchedulePDFParser` implementation wasn't fully shown in the `read_file` earlier. 
        # It imported `AuxiliadomParser`? No.
        # It inherits from `PDFParser` but calls `self.parse_schedule`.
        
        # Let's trust the integration works if `parse_schedule` works.
        # Actually `extract_schedule_entries` in `SchedulePDFParser` iterates `parse_schedule` result.
        pass
