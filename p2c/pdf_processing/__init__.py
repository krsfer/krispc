"""PDF processing module."""

from .auxiliadom_parser import AuxiliadomPDFParser
from .pdf_schedule_processor import PDFScheduleProcessor
from .schedule_parser import SchedulePDFParser

# Create instances for direct use
auxiliadom_parser = AuxiliadomPDFParser()

# Export key classes and functions
__all__ = [
    "AuxiliadomPDFParser",
    "SchedulePDFParser",
    "PDFScheduleProcessor",
    "auxiliadom_parser",
]
