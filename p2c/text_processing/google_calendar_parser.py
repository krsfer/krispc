import re
from datetime import datetime

class GoogleCalendarTextParser:
    """Parses text extracted from a Google Calendar PDF."""

    def parse(self, text_content: str):
        lines = text_content.split('\n')
        
        month, year = self._extract_month_year(lines[0])
        if not month or not year:
            raise ValueError("Could not determine month and year from header.")

        appointments = []
        day_numbers = []
        
        for line in lines[1:]:
            line = line.strip()
            if not line:
                continue

            # Check for a line of day numbers (e.g., "1 2 3 4 5 6 7")
            if re.match(r'^(\d+\s+)+\d+$', line):
                day_numbers = [int(d) for d in line.split()]
                continue

            # Check for an appointment line (e.g., "11:30 - Soraya")
            match = re.match(r'(\d{1,2}:\d{2})\s+-\s+(.+)', line)
            if match and day_numbers:
                time_str = match.group(1)
                name = match.group(2).strip()
                
                # This is a simplification: it assumes appointments are listed
                # sequentially under the day numbers. We'll need a more robust
                # way to associate appointments with days, but this is a start.
                # For now, we'll just assign them to the first day in the current week.
                day = day_numbers.pop(0) if day_numbers else 1

                start_hour, start_minute = map(int, time_str.split(':'))
                
                # We don't have end times, so we'll assume a default duration (e.g., 1 hour)
                # This can be adjusted later in the calendar editor.
                end_hour = start_hour + 1
                end_minute = start_minute

                appointments.append({
                    "year": year,
                    "month": month,
                    "day": day,
                    "start_time": f"{start_hour:02d}:{start_minute:02d}",
                    "end_time": f"{end_hour:02d}:{end_minute:02d}",
                    "description": name,
                    "normalized_name": name,
                    "location": "",
                    "event_description": ""
                })
        
        return appointments

    def _extract_month_year(self, header: str):
        month_map = {
            'janv.': 1, 'févr.': 2, 'mars': 3, 'avr.': 4, 'mai': 5, 'juin': 6,
            'juil.': 7, 'août': 8, 'sept.': 9, 'oct.': 10, 'nov.': 11, 'déc.': 12
        }
        
        match = re.search(r'(\w+\.)\s+(\d{4})', header)
        if match:
            month_str = match.group(1).lower()
            year = int(match.group(2))
            month = month_map.get(month_str)
            return month, year
        
        return None, None