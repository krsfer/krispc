"""Wrapper for pytesseract that fixes deprecation warnings."""
import importlib.util
from functools import wraps

import pytesseract

# Override the deprecated find_loader with find_spec
if hasattr(pytesseract, "pkgutil"):

    def find_tesseract():
        return (
            "tesseract"
            if importlib.util.find_spec("tesseract") is not None
            else pytesseract.which("tesseract") or "/usr/bin/tesseract"
        )

    pytesseract.tesseract_cmd = find_tesseract()

# Re-export all pytesseract functions
image_to_string = pytesseract.image_to_string
image_to_boxes = pytesseract.image_to_boxes
image_to_data = pytesseract.image_to_data
image_to_osd = pytesseract.image_to_osd
image_to_alto_xml = pytesseract.image_to_alto_xml
run_and_get_output = pytesseract.run_and_get_output
