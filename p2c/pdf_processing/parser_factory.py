"""Factory for creating PDF parsers."""

import re
from typing import Optional

import pdfplumber

from .auxiliadom_parser import AuxiliadomPDFParser
from .schedule_parser import SchedulePDFParser


class PDFParserFactory:
    """Factory for creating PDF parsers based on PDF content."""

    @staticmethod
    def create_parser(
        pdf_path: str,
    ) -> Optional[AuxiliadomPDFParser | SchedulePDFParser]:
        """Create appropriate parser for the PDF.

        Args:
            pdf_path: Path to the PDF file

        Returns:
            Appropriate parser instance for the PDF format

        Raises:
            ValueError: If PDF format is not recognized
        """
        # Regex patterns for detecting PDF formats
        schedule_pattern = re.compile(
            r"Planning d'interventions - [^-]+ - [A-Za-zÀ-ÿ]+ \d{4}"
        )
        auxiliadom_pattern = re.compile(
            r"Planning Interventions\s*[-–‐]\s*[A-Za-zÀ-ÿ]+\s*\d{4}"
        )

        with pdfplumber.open(pdf_path) as pdf:
            if len(pdf.pages) == 0:
                raise ValueError("PDF file is empty")

            text = pdf.pages[0].extract_text()

            # Check for schedule format based on header pattern
            if schedule_pattern.search(text):
                return SchedulePDFParser()

            # Check for auxiliadom format based on header pattern
            if auxiliadom_pattern.search(text):
                return AuxiliadomPDFParser()

            raise ValueError(
                "Unknown PDF format. Expected either schedule or auxiliadom format."
            )
