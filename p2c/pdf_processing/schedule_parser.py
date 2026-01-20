#!/usr/bin/env python
"""Module for parsing PDF schedules."""
import re
import pdfplumber
from p2c.pdf_processing.auxiliadom_parser import PDFParser

class SchedulePDFParser(PDFParser):
    """Parser for extracting schedule information from PDFs."""

    def __init__(self):
        """Initialize the ScheduleParser."""
        self.day_names = ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."]
        
        # Regular expressions for parsing format
        self.header_pattern = re.compile(
            r".*?Planning\s+d['']interventions\s*-\s*((Mr\.|Mme\.)\s*[A-Za-zÀ-ÿ\s.-]+)\s*-\s*([A-Za-zÀ-ÿ]+)\s*(\d{4})"
        )
        self.month = None
        self.year = None

    def get_calendar_info(self):
        """Extract calendar info."""
        # Placeholder
        pass

    def extract_schedule_entries(self, pdf_path: str) -> list[dict]:
        """Extract schedule entries from a PDF file."""
        self.parsed_data = [] 
        schedule = self.parse_schedule(pdf_path)
        entries = []
        
        # Helper to extract time
        def parse_time(time_str):
            try:
                if ":" in time_str:
                    return time_str.strip()
                elif "h" in time_str:
                    return time_str.replace("h", ":").strip()
                return time_str
            except:
                return "08:00" # Default fallback

        for day, appointments in schedule.items():
            for appointment in appointments:
                try:
                    # Appointment format usually "Time\nName" or similar
                    parts = appointment.split("\n")
                    time_part = parts[0] if parts else ""
                    name = parts[1] if len(parts) > 1 else appointment
                    
                    start_time = parse_time(time_part)
                    end_time = start_time # Placeholder since this parser is simple
                    
                    entries.append({
                        "day": day,
                        "start_time": start_time,
                        "end_time": end_time,
                        "description": name,
                        "month": self.month if self.month else 1,
                        "year": self.year if self.year else 2024
                    })
                except Exception:
                    continue
                    
        return entries

    def parse_schedule(self, pdf_path: str):
        """Parse the schedule from a PDF file."""
        appointments = {}
        
        with pdfplumber.open(pdf_path) as pdf:
            # Try to extract header for date
            if len(pdf.pages) > 0:
                text = pdf.pages[0].extract_text()
                if text:
                    match = self.header_pattern.search(text)
                    if match:
                        # group 3 is month, 4 is year
                        try:
                            self.year = int(match.group(4))
                            # Month mapping
                            month_map = {"janvier": 1, "fevrier": 2, "mars": 3, "avril": 4, "mai": 5, "juin": 6, 
                                         "juillet": 7, "aout": 8, "septembre": 9, "octobre": 10, "novembre": 11, "decembre": 12}
                            self.month = month_map.get(match.group(3).lower(), 1)
                        except:
                            pass

            for page in pdf.pages:
                tables = page.extract_tables()
                for table in tables:
                    if not table: continue
                    
                    # Assume row 0 is header with days
                    header = table[0]
                    # Find day columns
                    day_cols = {}
                    for i, col in enumerate(header):
                        if col and any(d in str(col).lower() for d in self.day_names):
                            # Extract day number "lun. 01" -> 1
                            try:
                                day_num = int(re.search(r'\d+', col).group())
                                day_cols[i] = day_num
                            except:
                                pass
                                
                    # Iterate rows
                    for row in table[1:]:
                        for col_idx, cell in enumerate(row):
                            if col_idx in day_cols and cell:
                                day = day_cols[col_idx]
                                if day not in appointments:
                                    appointments[day] = []
                                appointments[day].append(str(cell))
                                
        return appointments