"""
Diff utilities for planning snapshots.

Contract:
- Input: two snapshots, each a dict with key 'appointments' -> list of appointment dicts.
- Appointment keys used: normalized_name, day, month, year, start_time, end_time, location, event_description, description
- Output: dict with 'added', 'deleted', 'modified', and 'summary' counts.

Matching strategy:
- Use (normalized_name, day, month, year) as the identity key to detect modifications across time changes.
- If the key is missing, fallback to (description, day, month, year).
- Modified is reported when any of start_time, end_time, location, or event_description differ for the same key.
- Items present only in after are 'added'; only in before are 'deleted'.
Limitations:
- Multiple same-day entries for the same beneficiary will be matched 1:1 by stable ordering per key; collisions may degrade to add/delete instead of modify in edge cases.
"""
from __future__ import annotations

from typing import Dict, List, Tuple


def _key(appt: Dict) -> Tuple:
    name = appt.get("normalized_name") or appt.get("description") or ""
    return (
        str(name).strip(),
        int(appt.get("year") or 0),
        int(appt.get("month") or 0),
        int(appt.get("day") or 0),
    )


def diff_snapshots(before: Dict, after: Dict) -> Dict:
    before_items = before.get("appointments") or []
    after_items = after.get("appointments") or []

    before_map: Dict[Tuple, List[Dict]] = {}
    for it in before_items:
        before_map.setdefault(_key(it), []).append(it)

    after_map: Dict[Tuple, List[Dict]] = {}
    for it in after_items:
        after_map.setdefault(_key(it), []).append(it)

    added: List[Dict] = []
    deleted: List[Dict] = []
    modified: List[Dict] = []

    # For keys present in both, match by index and compare significant fields
    all_keys = set(before_map.keys()) | set(after_map.keys())
    for k in sorted(all_keys):
        b_list = before_map.get(k, [])
        a_list = after_map.get(k, [])
        # Pairwise compare up to min length
        min_len = min(len(b_list), len(a_list))
        for idx in range(min_len):
            b = b_list[idx]
            a = a_list[idx]
            changes = {}
            for field in ("start_time", "end_time", "location", "event_description"):
                if (b.get(field) or "") != (a.get(field) or ""):
                    changes[field] = {
                        "old": b.get(field) or "",
                        "new": a.get(field) or "",
                    }
            if changes:
                modified.append(
                    {
                        "key": k,
                        "before": b,
                        "after": a,
                        "changes": changes,
                    }
                )
        # Remainders
        if len(a_list) > min_len:
            added.extend(a_list[min_len:])
        if len(b_list) > min_len:
            deleted.extend(b_list[min_len:])

    summary = {
        "added": len(added),
        "deleted": len(deleted),
        "modified": len(modified),
        "total": len(added) + len(deleted) + len(modified),
    }

    return {
        "added": added,
        "deleted": deleted,
        "modified": modified,
        "summary": summary,
    }
