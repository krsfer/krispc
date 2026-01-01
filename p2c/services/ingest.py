from __future__ import annotations

import re
import unicodedata
from datetime import datetime
from typing import Callable, Dict, List, Protocol, Union

from p2c.core.parse_models import (
    BeneficiaryInfo,
    FileScheduleSource,
    ScheduleEntry,
    ScheduleParseResult,
    TextScheduleSource,
)


class ParserLike(Protocol):
    def extract_schedule_entries(self, source: str) -> List[Dict]:
        ...

    def get_unknown_beneficiaries(self) -> Dict[str, Dict[str, str]]:
        ...


class ScheduleIngestService:
    def __init__(
        self,
        parser_resolver: Callable[
            [Union[FileScheduleSource, TextScheduleSource]], ParserLike
        ],
    ):
        if not callable(parser_resolver):
            raise ValueError("parser_resolver must be callable")
        self._resolve = parser_resolver

    def ingest(
        self, source: Union[FileScheduleSource, TextScheduleSource]
    ) -> ScheduleParseResult:
        if isinstance(source, FileScheduleSource) and source.kind == "pdf":
            parser = self._resolve(source)
            raw_entries = parser.extract_schedule_entries(source.path)
            entries: List[ScheduleEntry] = [self._to_entry(e) for e in raw_entries]

            unknown_raw: Dict[str, Dict[str, str]] = {}
            if hasattr(parser, "get_unknown_beneficiaries"):
                try:
                    unknown_raw = parser.get_unknown_beneficiaries() or {}
                except Exception:
                    unknown_raw = {}

            unknown = {
                name: BeneficiaryInfo(
                    telephone=info.get("telephone", ""),
                    location=info.get("location", ""),
                    full_description=info.get("full_description", ""),
                )
                for name, info in unknown_raw.items()
            }

            return ScheduleParseResult(
                entries=entries, unknown_beneficiaries=unknown, warnings=[]
            )

        if isinstance(source, TextScheduleSource) and source.kind == "text":
            # Use provided resolver if it returns a parser with parse_schedule, otherwise fallback
            parser_obj = self._resolve(source)
            events: List[Dict] = []
            if parser_obj and hasattr(parser_obj, "parse_schedule"):
                events = parser_obj.parse_schedule(source.text)
            else:
                from p2c.text_processing.auxiliadom_parser import AuxiliadomParser

                if not source.text or not source.text.strip():
                    raise ValueError("Empty text input")
                events = AuxiliadomParser().parse_schedule(source.text)

            # Map events to ScheduleEntry
            entries: List[ScheduleEntry] = []
            for ev in events:
                try:
                    start_dt = self._parse_iso(ev.get("start", {}).get("dateTime"))
                    end_dt = self._parse_iso(ev.get("end", {}).get("dateTime"))
                    if not start_dt or not end_dt:
                        continue
                    raw_name = ev.get("summary", "")
                    normalized_name = self._normalize_beneficiary_name(raw_name)
                    entries.append(
                        ScheduleEntry(
                            day=start_dt.day,
                            start_time=start_dt.strftime("%H:%M"),
                            end_time=end_dt.strftime("%H:%M"),
                            description=normalized_name,
                            normalized_name=normalized_name,
                            location=ev.get("location", ""),
                            month=start_dt.month,
                            year=start_dt.year,
                        )
                    )
                except Exception:
                    continue

            return ScheduleParseResult(
                entries=entries, unknown_beneficiaries={}, warnings=[]
            )

        raise ValueError("Unsupported source type")

    def _to_entry(self, d: Dict) -> ScheduleEntry:
        return ScheduleEntry(
            day=int(d.get("day")),
            start_time=str(d.get("start_time")),
            end_time=str(d.get("end_time")),
            description=str(d.get("description", "")),
            normalized_name=str(d.get("normalized_name", "")),
            colorId=str(d.get("colorId", "1")),
            event_description=str(d.get("event_description", "")),
            location=str(d.get("location", "")),
            month=d.get("month"),
            year=d.get("year"),
        )

    def _parse_iso(self, s: str) -> datetime | None:
        if not s:
            return None
        try:
            return datetime.fromisoformat(s)
        except ValueError:
            # Fallbacks could be added here if needed
            return None

    def _normalize_beneficiary_name(self, name: str) -> str:
        if not name:
            return ""
        # Remove diacritics for consistency
        n = (
            unicodedata.normalize("NFKD", name)
            .encode("ASCII", "ignore")
            .decode("ASCII")
        )
        n = n.strip().strip(",")
        if "," in n:
            last, first = [p.strip() for p in n.split(",", 1)]
            last_up = last.upper()
            first_tc = " ".join(w.capitalize() for w in first.split())
            return f"{last_up}{', ' + first_tc if first_tc else ''}"
        # No comma: assume first token is last name
        parts = [p for p in n.split() if p]
        if not parts:
            return ""
        last = parts[0].upper()
        firsts = " ".join(w.capitalize() for w in parts[1:])
        return f"{last}{', ' + firsts if firsts else ''}"
