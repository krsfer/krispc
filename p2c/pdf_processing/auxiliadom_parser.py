#!/usr/bin/env python
"""Module for parsing PDF schedules."""
import re
import unicodedata
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Dict, List, Optional, Tuple

import pandas as pd
import pdfplumber


class PDFParser(ABC):
    """Abstract base class for PDF parsers."""

    @abstractmethod
    def extract_schedule_entries(self, pdf_path: str) -> List[Dict]:
        """Extract schedule entries from a PDF file."""
        pass


class AuxiliadomPDFParser(PDFParser):
    """Parser for extracting schedule information from PDFs using pdfplumber."""

    def __init__(self, event_settings_path="p2c/config/event_settings_data.json"):
        """Initialize the ScheduleParser."""
        super().__init__()
        self.day_names = [
            "Lundi",
            "Mardi",
            "Mercredi",
            "Jeudi",
            "Vendredi",
            "Samedi",
            "Dimanche",
        ]

        # Load event settings
        import json
        from pathlib import Path

        self.event_settings = {}
        try:
            settings_path = Path(event_settings_path)
            if settings_path.exists():
                with open(settings_path, "r") as f:
                    self.event_settings = json.load(f)
        except Exception:
            self.event_settings = {}

        # Enhanced regular expressions for parsing
        self.week_pattern = re.compile(r"S(\d+)")
        self.day_pattern = re.compile(r"(\d{1,2})(?:\s*Total.*|\s*$)")
        self.time_pattern = re.compile(
            r"(\d{1,2})[h:.](\d{2})\s*[-–‐\s]\s*(\d{1,2})[h:.](\d{2})"
        )
        self.name_pattern = re.compile(r"([A-Z][A-Za-zÀ-ÿ\s,.-]+)")
        self.header_pattern = re.compile(
            r"Planning Interventions\s*[-–‐]\s*([A-Za-zÀ-ÿ]+)\s*(\d{4})"
        )
        # French phone number patterns
        self.phone_pattern = re.compile(
            r"(?:T[ée]l\.?\s*:?\s*)?(?:(?:\+33|0)\s?[1-9](?:\s?\d{2}){4})"
        )
        # Pattern for beneficiary details on page 2
        # Format: NAME, First (CODE) (optional note) - Address - Building - Floor - Tel : XX XX XX XX XX
        self.beneficiary_detail_pattern = re.compile(
            r"([A-Z][A-Za-zÀ-ÿ\s,.-]+?)\s*[﴾(]\s*CL\d+\s*[﴿)](?:\s*[﴾(][^﴿)]+[﴿)])?\s*[-–‐]\s*(.+?)\s*[-–‐]\s*T[ée]l\s*:\s*((?:(?:\+33|0)\s?[1-9](?:\s?\d{2}){4}))"
        )

        self.month_map = {
            "janvier": 1,
            "fevrier": 2,
            "février": 2,
            "mars": 3,
            "avril": 4,
            "mai": 5,
            "juin": 6,
            "juillet": 7,
            "aout": 8,
            "août": 8,
            "septembre": 9,
            "octobre": 10,
            "novembre": 11,
            "decembre": 12,
            "décembre": 12,
        }

        self._current_month = None
        self._current_year = None
        self.unknown_beneficiaries = {}

    def _normalize_text(self, text: str) -> str:
        """Normalize text by combining name parts and handling special characters."""
        if not text:
            return ""

        # Normalize unicode characters
        text = (
            unicodedata.normalize("NFKD", text)
            .encode("ASCII", "ignore")
            .decode("ASCII")
        )

        # Split text into parts and remove commas
        parts = [p.strip().strip(",") for p in text.split() if p.strip()]

        if not parts:
            return ""

        # First part is last name (keep uppercase), rest is first name(s) (title case)
        last_name = parts[0].upper()
        first_names = " ".join(p.title() for p in parts[1:]) if len(parts) > 1 else ""

        # Combine last name and first names with a comma
        return f"{last_name}{', ' + first_names if first_names else ''}"

    def _format_time(
        self, start_hour: int, start_min: int, end_hour: int, end_min: int
    ) -> str:
        """Format time string consistently."""
        return f"{start_hour:02d}:{start_min:02d}-{end_hour:02d}:{end_min:02d}"

    def _is_valid_time(self, hour: int, minute: int) -> bool:
        """Validate time values."""
        return 0 <= hour <= 23 and 0 <= minute <= 59

    def _calculate_duration_minutes(
        self, start_hour: int, start_min: int, end_hour: int, end_min: int
    ) -> int:
        """Calculate duration in minutes between start and end times."""
        start_minutes = start_hour * 60 + start_min
        end_minutes = end_hour * 60 + end_min
        if end_minutes < start_minutes:  # Handle overnight shifts
            end_minutes += 24 * 60
        return end_minutes - start_minutes

    def _format_duration(self, minutes: int) -> str:
        """Format duration in minutes to HH:MM format."""
        hours = minutes // 60
        mins = minutes % 60
        return f"{hours:02d}:{mins:02d}"

    def get_unknown_beneficiaries(self) -> Dict[str, Dict[str, str]]:
        """Get the dictionary of unknown beneficiaries found during parsing."""
        return self.unknown_beneficiaries

    def _extract_beneficiary_details(self, pdf_path: str) -> Dict[str, Dict[str, str]]:
        """Extract beneficiary contact details from PDF (typically on page 2)."""
        beneficiary_details = {}

        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    # Find all beneficiary details using the pattern
                    matches = self.beneficiary_detail_pattern.findall(text)
                    for match in matches:
                        name = self._normalize_text(match[0].strip())
                        location = match[1].strip()
                        phone = match[2].strip()

                        beneficiary_details[name] = {
                            "telephone": phone,
                            "location": location,
                        }

        return beneficiary_details

    def extract_schedule_entries(self, pdf_path: str) -> List[Dict]:
        """Extract schedule entries from a PDF file."""
        self._current_month = None
        self._current_year = None
        # Reset unknown beneficiaries for each PDF
        self.unknown_beneficiaries = {}

        try:
            # First extract beneficiary details from the PDF
            beneficiary_details = self._extract_beneficiary_details(pdf_path)

            schedule = self.parse_schedule(pdf_path)
            entries = []

            for day, appointments in schedule.items():
                for appointment in appointments:
                    try:
                        # Extract time and description
                        time_match = self.time_pattern.search(appointment)
                        if not time_match:
                            continue

                        start_hour, start_min, end_hour, end_min = map(
                            int, time_match.groups()
                        )

                        # Validate time values
                        if not (
                            self._is_valid_time(start_hour, start_min)
                            and self._is_valid_time(end_hour, end_min)
                        ):
                            continue

                        start_time = f"{start_hour:02d}:{start_min:02d}"
                        end_time = f"{end_hour:02d}:{end_min:02d}"

                        # Calculate duration in minutes
                        start_minutes = start_hour * 60 + start_min
                        end_minutes = end_hour * 60 + end_min
                        if end_minutes < start_minutes:  # Handle overnight shifts
                            end_minutes += 24 * 60
                        duration_minutes = end_minutes - start_minutes

                        # Extract description (everything after the time)
                        description = appointment[time_match.end() :].strip()
                        if not description:
                            continue

                        # Skip pause meals
                        if any(
                            word.lower() in description.lower()
                            for word in ["pause", "repas"]
                        ):
                            continue

                        # Extract the normalized name from the description
                        name_match = self.name_pattern.search(description)
                        normalized_name = ""
                        if name_match:
                            name_text = name_match.group(1).strip()
                            normalized_name = self._normalize_text(name_text)

                        # Look up event settings for this beneficiary
                        settings = self.event_settings.get(
                            normalized_name, self.event_settings.get("DEFAULT", {})
                        )

                        # Check if this is an unknown beneficiary
                        if (
                            normalized_name
                            and normalized_name not in self.event_settings
                            and normalized_name != ""
                        ):
                            # Check if we have details for this beneficiary from page 2
                            if normalized_name in beneficiary_details:
                                details = beneficiary_details[normalized_name]
                                self.unknown_beneficiaries[normalized_name] = {
                                    "telephone": details["telephone"],
                                    "location": details["location"],
                                    "full_description": description,
                                }
                            else:
                                # Fallback to extracting from description if not found on page 2
                                phone_match = self.phone_pattern.search(description)
                                phone = (
                                    phone_match.group(0) if phone_match else "Not found"
                                )

                                # Extract location - typically comes after the name and phone
                                location_start = description.find(
                                    normalized_name
                                ) + len(normalized_name)
                                if phone_match:
                                    location_start = phone_match.end()
                                location = description[location_start:].strip()
                                if not location:
                                    location = "Not found"

                                # Store unknown beneficiary info
                                self.unknown_beneficiaries[normalized_name] = {
                                    "telephone": phone,
                                    "location": location,
                                    "full_description": description,
                                }

                        # Create entry dictionary with populated fields
                        entry = {
                            "day": day,
                            "start_time": start_time,
                            "end_time": end_time,
                            "description": description.strip(),
                            "normalized_name": normalized_name,
                            "colorId": settings.get("colorId", "1"),
                            "event_description": settings.get("description", ""),
                            "location": settings.get("location", ""),
                        }

                        # Only add month and year if they are set
                        if self._current_month is not None:
                            entry["month"] = self._current_month
                        if self._current_year is not None:
                            entry["year"] = self._current_year

                        entries.append(entry)
                    except Exception:
                        continue

            return entries
        except Exception:
            return []

    def parse_schedule(self, pdf_path: str) -> Dict[int, List[str]]:
        """Parse the schedule from a PDF file."""
        appointments = {}
        cancelled_appointments = []

        with pdfplumber.open(pdf_path) as pdf:
            # Extract month and year from header
            self._current_month, self._current_year = self._extract_month_year(pdf)

            for page in pdf.pages:
                try:
                    tables = page.extract_tables()

                    if tables and len(tables) >= 1:
                        # Process main schedule table
                        page_appointments = self._extract_appointments_from_table(
                            tables[0]
                        )
                        self._merge_appointments(appointments, page_appointments)

                        # Process cancellation table if it exists
                        if len(tables) > 1:
                            cancelled = self._extract_cancelled_appointments(tables[1])
                            if cancelled:
                                cancelled_appointments.extend(cancelled)

                except Exception:
                    continue

            if cancelled_appointments:
                self._remove_cancelled_appointments(
                    appointments, cancelled_appointments
                )

            return appointments

    def _extract_appointments_from_table(
        self, table: List[List[str | None]]
    ) -> Dict[int, List[str]]:
        """Extract appointments from the schedule table."""
        appointments = {}

        if not table or len(table) == 0:
            return {}

        header = [str(cell).strip() if cell is not None else "" for cell in table[0]]
        day_columns = [i for i, h in enumerate(header) if h in self.day_names]
        current_day_by_column = {col: None for col in day_columns}

        for row_idx, row in enumerate(table[1:], 1):
            # Update day numbers
            for col in day_columns:
                if col < len(row):
                    cell = row[col]
                    if cell is not None:
                        cell = str(cell).strip()
                        day_match = self.day_pattern.match(cell)
                        if day_match:
                            try:
                                day_num = int(day_match.group(1))
                                if 1 <= day_num <= 31:
                                    current_day_by_column[col] = day_num
                            except ValueError:
                                pass

            # Skip total rows
            if all(
                not cell
                or (
                    isinstance(cell, str)
                    and (
                        "Total" in str(cell)
                        or self.day_pattern.match(str(cell).strip())
                    )
                )
                for cell in row
                if cell is not None
            ):
                continue

            # Process appointments
            for col in day_columns:
                if col < len(row):
                    cell = row[col]
                    current_day = current_day_by_column[col]

                    if cell is not None and current_day is not None:
                        cell_appointments = self._process_cell(
                            str(cell).strip(), current_day
                        )
                        if cell_appointments:
                            if current_day not in appointments:
                                appointments[current_day] = []
                            appointments[current_day].extend(cell_appointments)

        return appointments

    def _process_cell(self, cell_text: str, day: int) -> List[str]:
        """Process a cell's text to extract appointments."""
        if not cell_text or re.match(
            r"^\d{1,2}(\s+Total\s*:\s*\d{1,2}h\d{2})?$", cell_text
        ):
            return []

        lines = [line.strip() for line in cell_text.split("\n") if line.strip()]
        cell_appointments = []

        current_time = None
        current_text = []

        for line in lines:
            if "Total" in line:
                continue

            time_match = self.time_pattern.search(line)

            if time_match:
                # If we have a previous appointment, format and add it
                if current_time and current_text:
                    formatted_text, _ = self._format_appointment(
                        current_time, current_text
                    )
                    if formatted_text:
                        cell_appointments.append(formatted_text)

                start_hour = int(time_match.group(1))
                start_min = time_match.group(2)
                end_hour = int(time_match.group(3))
                end_min = time_match.group(4)

                # Validate time values
                if not (
                    self._is_valid_time(start_hour, int(start_min))
                    and self._is_valid_time(end_hour, int(end_min))
                ):
                    continue

                current_time = (start_hour, int(start_min), end_hour, int(end_min))
                remaining_text = (
                    line[time_match.end() :].strip().strip(":").strip(",").strip()
                )
                current_text = [remaining_text] if remaining_text else []
            elif current_time and not line.startswith("Total"):
                current_text.append(line.strip().strip(",").strip())

        # Add the last appointment if we have one
        if current_time and current_text:
            formatted_text, _ = self._format_appointment(current_time, current_text)
            if formatted_text:
                cell_appointments.append(formatted_text)

        return cell_appointments

    def _format_appointment(
        self, time_tuple: Tuple[int, int, int, int], text_parts: List[str]
    ) -> Tuple[str, str]:
        """Format appointment with given time and text parts."""
        start_hour, start_min, end_hour, end_min = time_tuple

        # Check for valid time values
        if not (
            self._is_valid_time(start_hour, start_min)
            and self._is_valid_time(end_hour, end_min)
        ):
            return "", ""

        time_str = self._format_time(start_hour, start_min, end_hour, end_min)
        duration_minutes = self._calculate_duration_minutes(
            start_hour, start_min, end_hour, end_min
        )
        duration_str = self._format_duration(duration_minutes)
        full_text = " ".join(text_parts).strip()

        if any(
            word.lower() in full_text.lower() for word in ["pause", "repas", "temps"]
        ):
            return f"{time_str} Temps de pause repas ({duration_str})", ""

        if re.search(r"Total\s*:", full_text):
            return "", ""

        # Check if the text contains a valid name
        name_match = self.name_pattern.search(full_text)
        if not name_match:
            return "", ""

        # If we have a simple time and name format, return it directly
        if full_text:
            normalized_name = self._normalize_text(full_text)
            formatted_text = f"{time_str} {normalized_name} ({duration_str})"
            return formatted_text, normalized_name

        return "", ""

    def _extract_cancelled_appointments(
        self, table: List[List[Optional[str | None]]]
    ) -> List[tuple[int, str, str]]:
        """Extract cancelled appointments from the cancellation table."""
        cancelled = []

        if not table or len(table) < 2:
            return []

        for row in table[1:]:  # Skip header row
            if not row or len(row) < 3:
                continue

            try:
                date_str = str(row[0] or "")
                time_str = str(row[1] or "")
                name_str = str(row[2] or "")

                # Extract day from date
                date_match = re.search(r"(\d{2})/\d{2}/\d{4}", date_str)
                if not date_match:
                    continue
                day = int(date_match.group(1))
                if not (1 <= day <= 31):
                    continue

                # Extract time
                time_match = re.search(r"(\d{1,2}):(\d{2})", time_str)
                if not time_match:
                    continue
                hour = int(time_match.group(1))
                minute = time_match.group(2)
                if not self._is_valid_time(hour, int(minute)):
                    continue
                time = f"{hour:02d}:{minute}"

                # Extract name
                name = name_str.strip()
                if not name:
                    continue

                cancelled.append((day, time, name))
            except (ValueError, IndexError, AttributeError):
                continue

        return cancelled

    def _merge_appointments(
        self, target: Dict[int, List[str]], source: Dict[int, List[str]]
    ):
        """Merge appointments from source into target dictionary."""
        for day, appointments in source.items():
            if day not in target:
                target[day] = []
            target[day].extend(appt for appt in appointments if appt not in target[day])

    def _normalize_time(self, time_str: str) -> str:
        """Normalize time format to HH:MM."""
        # First check if it's a full time range
        time_match = self.time_pattern.search(time_str)
        if time_match:
            # Extract just the start time
            start_hour = int(time_match.group(1))
            start_min = time_match.group(2)
            return f"{start_hour:02d}:{start_min}"

        # If it's just a single time
        if "h" in time_str:
            parts = time_str.split("h")
            if len(parts) == 2:
                hour, minute = parts
                try:
                    if hour:  # Only try to convert if hour is not empty
                        return f"{int(hour):02d}:{minute}"
                except ValueError:
                    pass
        return time_str

    def _normalize_name(self, name: str) -> str:
        """Normalize name by removing commas and extra whitespace."""
        # Split on comma if present, otherwise split on space
        parts = name.split(",") if "," in name else name.split()
        # Clean each part and join with space
        cleaned_parts = [part.strip() for part in parts if part.strip()]
        # Sort parts to handle different orderings (e.g., "John Smith" vs "Smith John")
        return " ".join(sorted(cleaned_parts))

    def _remove_cancelled_appointments(
        self, appointments: Dict[int, List[str]], cancelled: List[tuple[int, str, str]]
    ) -> None:
        """Remove cancelled appointments from the schedule."""
        for day, time, name in cancelled:
            if day in appointments:
                remaining = []
                for appointment in appointments[day]:
                    # Extract time and name from appointment string
                    time_match = self.time_pattern.search(appointment)
                    name_match = self.name_pattern.search(appointment)

                    if not time_match or not name_match:
                        remaining.append(appointment)
                        continue

                    appt_time = f"{int(time_match.group(1)):02d}:{time_match.group(2)}"
                    appt_name = name_match.group(1).strip()

                    # Compare time and name
                    if time == appt_time and name in appt_name:
                        pass
                    else:
                        remaining.append(appointment)

                if remaining:
                    appointments[day] = remaining
                else:
                    del appointments[day]

    def _extract_month_year(self, pdf) -> tuple[int, int]:
        """Extract month and year from PDF header."""
        if not pdf.pages:
            raise ValueError("PDF has no pages")

        header_text = pdf.pages[0].extract_text()
        if not header_text:
            raise ValueError("Could not extract header text from PDF")

        header_match = self.header_pattern.search(header_text)
        if not header_match:
            raise ValueError("Invalid month format in header")

        month_str = header_match.group(1).lower()
        year_str = header_match.group(2)

        if month_str not in self.month_map:
            raise ValueError("Invalid month format in header")

        try:
            month = self.month_map[month_str]
            year = int(year_str)
            return month, year
        except (KeyError, ValueError):
            raise ValueError("Invalid month/year format in header")

    def _parse_time_range(
        self, text: str
    ) -> Optional[Tuple[Tuple[int, int], Tuple[int, int]]]:
        """Parse a time range string into start and end tuples."""
        if not text:
            return None

        match = self.time_pattern.search(text)
        if not match:
            return None

        start_hour, start_min, end_hour, end_min = map(int, match.groups())
        return ((start_hour, start_min), (end_hour, end_min))

    def _parse_header(self, text: str) -> Optional[Tuple[str, str]]:
        """Parse the document header to extract month and year."""
        if not text:
            return None

        match = self.header_pattern.search(text)
        if not match:
            return None

        month, year = match.groups()
        return (month, year)

    def _parse_week_number(self, text: str) -> Optional[int]:
        """Parse a week number from text."""
        if not text:
            return None

        match = self.week_pattern.search(text)
        if not match:
            return None

        return int(match.group(1))

    def _parse_day_number(self, text: str) -> Optional[int]:
        """Parse a day number from text."""
        if not text:
            return None

        match = self.day_pattern.search(text)
        if not match:
            return None

        return int(match.group(1))
