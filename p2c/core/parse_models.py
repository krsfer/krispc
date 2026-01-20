from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Literal, Optional


@dataclass(frozen=True)
class ScheduleEntry:
    day: int
    start_time: str
    end_time: str
    description: str
    normalized_name: str
    colorId: str = "1"
    event_description: str = ""
    location: str = ""
    month: Optional[int] = None
    year: Optional[int] = None


@dataclass(frozen=True)
class BeneficiaryInfo:
    telephone: str = ""
    location: str = ""
    full_description: str = ""


@dataclass
class ScheduleParseResult:
    entries: List[ScheduleEntry] = field(default_factory=list)
    unknown_beneficiaries: Dict[str, BeneficiaryInfo] = field(default_factory=dict)
    warnings: List[str] = field(default_factory=list)


# Schedule sources
@dataclass(frozen=True)
class FileScheduleSource:
    kind: Literal["pdf"]
    path: str
    mime: Optional[str] = None
    filename: Optional[str] = None


@dataclass(frozen=True)
class TextScheduleSource:
    kind: Literal["text"]
    text: str
    locale: Optional[str] = None
    hints: Optional[Dict[str, str]] = None
