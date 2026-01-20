"""Parser for Auxiliadom schedule text format."""
import json
import re
import unicodedata
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple


class AuxiliadomParser:
    """Parser for Auxiliadom schedule text format to calendar event JSON."""

    def __init__(self, timezone: str = "Europe/Paris"):
        """
        Initialize the parser.

        Args:
            timezone: Timezone to use for the events (default: "Europe/Paris")
        """
        self.timezone = timezone
        # Regex patterns for parsing the schedule
        self.appointment_pattern = re.compile(
            r"^(?P<name>[^(]+?)\s*\((?P<id>\\d+)\)\\n"  # Name and ID
            r"(?P<date>\\d{2}/\\d{2}/\\d{4})\\s+(?P<time>\\d{2}:\\d{2})\\n"  # Date and time
            r"(?P<duration>\\d{1,2}:\\d{2})\\n"  # Duration
            r"(?P<service>.+?)\\n"  # Service description
            r"(?P<status>.+?)(?:\\n|$)"  # Status
        )
        self.address_pattern = re.compile(
            r"^(?P<name>.+?)\\s*\\((?P<id>\\d+)\\)\\n"  # Name and ID
            r"(?P<address>.+?)(?:\\n|$)"  # Address
        )

    def parse_schedule(self, text: str) -> List[Dict]:
        """
        Parse the schedule text and return calendar events.
        Supports both the legacy stacked format and a tabular format with header:
        Client  Date  Durée  Produit  Statut  Demande  Commentaire
        """
        # First, try the tabular parser which handles headers with tabs or multiple spaces.
        tabular_events = self._parse_tabular_format(text)
        if tabular_events:
            return tabular_events

        # Try legacy path next
        addresses_section = None
        if "Adresses d'interventions" in text:
            # Get everything after "Adresses d'interventions"
            addr_start = text.find("Adresses d'interventions")
            addr_text = text[addr_start:]

            # The addresses section ends before the copyright notice or at the end
            copyright_pos = addr_text.find("©")
            if copyright_pos > 0:
                addr_text = addr_text[:copyright_pos]

            addresses_section = addr_text.strip()
            print("Found addresses section")  # Debug

        # Find the appointments section
        appointments_section = None
        if "ClientDateDuréeProduitStatutDemande" in text:
            # Get everything after the header
            appt_start = text.find("ClientDateDuréeProduitStatutDemande")
            appt_text = text[appt_start:]

            # The appointments section ends at the addresses section or at the end
            if addresses_section:
                appt_end = text.find("Adresses d'interventions")
                if appt_end > appt_start:
                    appt_text = text[appt_start:appt_end]

            appointments_section = appt_text.strip()
            print("Found appointments section")  # Debug

        print(f"Appointments section found: {appointments_section is not None}")
        print(f"Addresses section found: {addresses_section is not None}")

        if not appointments_section:
            raise ValueError("Could not find appointments in the schedule")

        # Parse addresses if available
        addresses = {}
        if addresses_section:
            try:
                addresses = self._parse_addresses(addresses_section)
                print(f"Parsed {len(addresses)} client addresses")  # Debug output
            except Exception as e:
                print(f"Error parsing addresses: {e}")
                addresses = {}

        # Parse appointments
        appointments = self._parse_appointments(appointments_section, addresses)

        # Debug output to check address assignment
        for appt in appointments:
            if not appt.get("address"):
                print(
                    f"Warning: No address found for client ID {appt.get('client_id')}"
                )

        return self._format_events(appointments)

    def _parse_addresses(self, addresses_text: str) -> Dict[str, Dict[str, str]]:
        """Parse the addresses section into a dictionary of client ID to address info.

        Args:
            addresses_text: The text from the addresses section

        Returns:
            Dict mapping client ID to a dict containing 'name' and 'address'
        """
        print("\nParsing addresses...")
        addresses = {}

        # Split the text into lines and clean them up
        lines = [line.strip() for line in addresses_text.split("\n")]
        print(f"Found {len(lines)} lines in addresses section")  # Debug

        # The addresses section has a specific format:
        # ClientName (ID)
        # Address line 1
        # Address line 2 (optional)
        # [empty line]
        i = 0
        while i < len(lines):
            line = lines[i].strip()
            if not line:  # Skip empty lines
                i += 1
                continue

            # Look for lines with client name and ID (e.g., "AIT BOUZIANE, Nouredine (1)")
            # This pattern is more permissive with whitespace
            client_match = re.match(r"^(.+?)\s*\(\s*(\d+)\s*\).*$", line)
            if client_match:
                name = client_match.group(1).strip()
                client_id = client_match.group(
                    2
                ).strip()  # Remove any whitespace from ID

                # Find the next non-empty line which should be the address
                j = i + 1
                while j < len(lines) and not lines[j].strip():
                    j += 1

                if j < len(lines):
                    # First line of address
                    address = lines[j].strip()

                    # Check if there's another address line
                    k = j + 1
                    while k < len(lines) and not lines[k].strip():
                        k += 1

                    if k < len(lines) and not re.match(
                        r"^.+\s*\(\s*\d+\s*\).*$", lines[k]
                    ):
                        # This is a continuation line of the address
                        address += " " + lines[k].strip()
                        i = k + 1  # Skip the next line as it's part of the address
                    else:
                        i = j + 1  # Only one line of address

                    # Clean up the address
                    if address.endswith(","):
                        address = address[:-1].strip()
                    if address.endswith(", France"):
                        address = address[:-8].strip()

                    addresses[client_id] = {"name": name, "address": address}
                    print(
                        f"  Found address for client {client_id}: {name} -> {address}"
                    )
                else:
                    i += 1
            else:
                i += 1

        return addresses

    def _parse_appointments(
        self, appointments_text: str, addresses: Dict
    ) -> List[Dict]:
        """Parse the appointments section into a list of appointment dictionaries."""
        print("\nParsing appointments...")  # Debug
        print(f"Number of address entries: {len(addresses)}")  # Debug
        for client_id, info in addresses.items():
            print(f"  Client {client_id}: {info['name']} -> {info['address']}")  # Debug

        appointments = []
        lines = appointments_text.split("\n")

        # Skip the header line
        i = 1  # Start after the header

        while i < len(lines):
            line = lines[i].strip()
            if not line:
                i += 1
                continue

            # Check if this line starts with a client name and ID
            # This pattern matches names like "AIT BOUZIANE, Nouredine (1)" or "DUPONT, Jean (42)"
            client_match = re.match(r"^(.+?)\s*\(\s*(\d+)\s*\)\s*$", line)
            if client_match:
                client_name = client_match.group(1).strip()
                client_id = client_match.group(
                    2
                ).strip()  # Ensure we get just the ID part

                print(
                    f"\nProcessing appointment for client ID: {client_id}, Name: {client_name}"
                )

                # The next line should contain the date and time
                if i + 1 < len(lines):
                    # Parse date and time (format: DD/MM/YYYY HH:MM)
                    date_time_match = re.match(
                        r"^(\d{2}/\d{2}/\d{4})\s+(\d{2}:\d{2})$", lines[i + 1].strip()
                    )

                    if date_time_match and i + 2 < len(lines):
                        date_str = date_time_match.group(1)
                        time_str = date_time_match.group(2)

                        # Parse duration (next line after date/time)
                        duration_match = re.match(
                            r"^(\d{1,2}):(\d{2})$", lines[i + 2].strip()
                        )

                        if duration_match:
                            hours = int(duration_match.group(1))
                            minutes = int(duration_match.group(2))

                            # Get the address for this client
                            address_info = addresses.get(client_id, {})
                            address = address_info.get("address", "")

                            # Debug output for address lookup
                            if not address:
                                print(
                                    f"  Warning: No address found for client ID {client_id}"
                                )
                                print(
                                    f"  Available client IDs: {list(addresses.keys())}"
                                )
                            else:
                                print(
                                    f"  Found address for client ID {client_id}: {address}"
                                )

                            # Remove ", France" from the end of the address if present
                            if address and address.endswith(", France"):
                                address = address[:-7].strip()

                            # Create appointment dictionary with only the required fields
                            appointment = {
                                "client_name": client_name,
                                "client_id": client_id,
                                "date": date_str,
                                "time": time_str,
                                "duration_hours": hours,
                                "duration_minutes": minutes,
                                "address": address,
                            }

                            appointments.append(appointment)

                            # Skip the next 2 lines as we've processed them (client, date/time, duration)
                            i += 2
                        else:
                            i += 1
                    else:
                        i += 1
                else:
                    i += 1
            else:
                i += 1

        return appointments

    def _format_events(self, appointments: List[Dict]) -> List[Dict]:
        """Format appointments into calendar events according to the schema."""
        events = []

        for appt in appointments:
            try:
                # Parse the date and time
                start_dt = datetime.strptime(
                    f"{appt['date']} {appt['time']}", "%d/%m/%Y %H:%M"
                )

                # Calculate end time
                duration = timedelta(
                    hours=appt["duration_hours"], minutes=appt["duration_minutes"]
                )
                end_dt = start_dt + duration

                # Format the event according to the schema
                event = {
                    "summary": appt["client_name"],
                    "location": appt.get("address", ""),
                    "start": {
                        "dateTime": start_dt.isoformat(),
                        "timeZone": self.timezone,
                    },
                    "end": {"dateTime": end_dt.isoformat(), "timeZone": self.timezone},
                    "reminders": {"useDefault": True},
                }

                events.append(event)

            except (ValueError, KeyError) as e:
                # Skip invalid appointments
                print(f"Skipping invalid appointment: {appt}")
                continue

        return events

    def _get_color_id(self, client_name: str) -> str:
        """Get a consistent color ID based on the client name.

        This ensures the same client always gets the same color.
        """
        # Simple hash of the client name to get a consistent number between 1-11
        client_hash = sum(ord(c) for c in client_name) % 11 + 1
        return str(client_hash)

    @classmethod
    def from_file(cls, file_path: str, timezone: str = "Europe/Paris") -> List[Dict]:
        """
        Parse a schedule from a file.

        Args:
            file_path: Path to the schedule file
            timezone: Timezone to use for the events (default: "Europe/Paris")

        Returns:
            List of calendar events in the format specified by calendar_event_schema.json
        """
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()

        parser = cls(timezone)
        return parser.parse_schedule(content)

    def to_json(self, file_path: str, indent: int = 2) -> None:
        """
        Parse the schedule and save it as a JSON file.

        Args:
            file_path: Path to save the JSON file
            indent: Indentation level for the JSON file (default: 2)
        """
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()

        events = self.parse_schedule(content)

        with open(file_path.replace(".txt", ".json"), "w", encoding="utf-8") as f:
            json.dump(events, f, ensure_ascii=False, indent=indent)

    def _normalize_str(self, s: str) -> str:
        if not isinstance(s, str):
            return ""
        n = unicodedata.normalize("NFKD", s).encode("ASCII", "ignore").decode("ASCII")
        n = re.sub(r"\s+", " ", n).strip().lower()
        return n

    def _parse_tabular_format(self, text: str) -> List[Dict]:
        """Parse a tabular Auxiliadom schedule where columns are separated by tabs or multiple spaces.
        Expected header (diacritics tolerated): Client Date Durée Produit Statut Demande Commentaire
        Also parses optional addresses section mapping client IDs to addresses.
        Returns list of calendar event dicts (summary, location, start/end with dateTime).
        """
        lines = [ln.rstrip("\r\n") for ln in text.splitlines()]
        # Find addresses section start
        addr_idx = None
        for i, ln in enumerate(lines):
            if self._normalize_str(ln).startswith("adresses d'interventions"):
                addr_idx = i
                break
        # Parse addresses mapping if present
        addresses_by_id: Dict[str, str] = {}
        if addr_idx is not None:
            # Expect header line after this and then rows of `Client\tAdresse`
            i = addr_idx + 1
            # Skip header line if present
            if i < len(lines) and "adresse" in self._normalize_str(lines[i]):
                i += 1
            while i < len(lines):
                ln = lines[i].strip()
                if not ln:
                    i += 1
                    continue
                parts = ln.split("\t") if "\t" in ln else re.split(r"\s{2,}", ln)
                if len(parts) >= 2:
                    name = parts[0].strip()
                    addr = parts[1].strip()
                    # Extract client id in parentheses
                    m = re.search(r"\((\d+)\)", name)
                    if m:
                        addresses_by_id[m.group(1)] = addr.replace(
                            ", France", ""
                        ).strip()
                i += 1
        # Find tabular header for appointments
        header_idx = None
        for i, ln in enumerate(lines):
            norm = self._normalize_str(ln)
            if re.search(
                r"^client\s+date\s+dur(e|)e\s+produit\s+statut\s+demande\s+commentaire$",
                norm,
            ):
                header_idx = i
                break
        if header_idx is None:
            return []
        # Rows until addresses section or end
        i = header_idx + 1
        events: List[Dict] = []
        while i < len(lines):
            if addr_idx is not None and i >= addr_idx:
                break
            ln = lines[i].strip()
            i += 1
            if not ln:
                continue
            # Split by tab primarily; fallback to 2+ spaces
            parts = ln.split("\t") if "\t" in ln else re.split(r"\s{2,}", ln)
            # Some scraped sources use single spaces; try regex extraction as fallback
            if len(parts) < 3:
                m = re.match(
                    r"^(?P<name>.+?)\s+(?P<date>\d{2}/\d{2}/\d{4}\s+\d{2}:\d{2})\s+(?P<dur>\d{1,2}:\d{2})",
                    ln,
                )
                if m:
                    parts = [m.group("name"), m.group("date"), m.group("dur")]
            if len(parts) < 3:
                continue
            name_raw = parts[0].strip()
            # Normalize display name by stripping trailing " (id)"
            name_display = re.sub(r"\s*\(\d+\)\s*$", "", name_raw).strip()
            # Skip administrative rows like visite medicale
            product = parts[3].strip() if len(parts) > 3 else ""
            if "visite medicale" in self._normalize_str(product):
                continue
            # Extract datetime and duration
            date_str = parts[1].strip()
            dur_str = parts[2].strip()
            try:
                start_dt = datetime.strptime(date_str, "%d/%m/%Y %H:%M")
            except ValueError:
                continue
            # Compute end time
            try:
                h, m = dur_str.split(":")
                delta = timedelta(hours=int(h), minutes=int(m))
            except Exception:
                continue
            end_dt = start_dt + delta
            # Determine address by client id
            addr = ""
            m_id = re.search(r"\((\d+)\)", name_raw)
            if m_id and m_id.group(1) in addresses_by_id:
                addr = addresses_by_id[m_id.group(1)]
            # Build event
            events.append(
                {
                    "summary": name_display,
                    "location": addr,
                    "start": {"dateTime": start_dt.isoformat()},
                    "end": {"dateTime": end_dt.isoformat()},
                    "reminders": {"useDefault": True},
                }
            )
        return events


# Example usage
if __name__ == "__main__":
    import os

    # Get the project root directory
    project_root = os.path.dirname(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    )
    # Construct the full path to the test file
    test_file = os.path.join(
        project_root, "tests", "test_data", "auxiliadom_schedule_august_2025.txt"
    )

    # Parse the file
    parser = AuxiliadomParser()
    events = parser.from_file(test_file)

    # Print first two events as example
    print(json.dumps(events[:2], indent=2))

    # Save all events to a JSON file for inspection
    output_file = os.path.join(project_root, "auxiliadom_events.json")
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(events, f, ensure_ascii=False, indent=2)
    print(f"\nSaved {len(events)} events to {output_file}")
