#!/usr/bin/env python
"""Module for parsing PDF schedules."""

# Same file but with renamed class and updated docstrings
import re
from datetime import datetime

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
        # ... rest of the file remains the same except for docstrings ...

    def get_calendar_info(self):
        """
        Extract calendar name and month information from the parsed data.

        Returns:
            tuple: (calendar_name, month_name, year)
                  calendar_name: Name of the calendar (employee name)
                  month_name: Name of the month in French
                  year: Year as integer
        """
        if not hasattr(self, "parsed_data"):
            raise ValueError("No data has been parsed yet. Call parse() first.")

        match = self.header_pattern.match(self.parsed_data[0])
        if not match:
            raise ValueError("Could not extract calendar information from header")

        employee_name = match.group(1).strip()
        month_name = match.group(3)
        year = int(match.group(4))

        return employee_name, month_name, year

    # ... rest of the existing methods remain unchanged ...
