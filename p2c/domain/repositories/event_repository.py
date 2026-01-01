from abc import ABC, abstractmethod
from typing import List, Optional

from ..models.beneficiary_event import BeneficiaryEvent


class EventRepository(ABC):
    """Abstract base class for event repository implementations."""

    @abstractmethod
    async def save(self, event: BeneficiaryEvent) -> BeneficiaryEvent:
        """Save a beneficiary event."""
        pass

    @abstractmethod
    async def get_by_id(self, event_id: str) -> Optional[BeneficiaryEvent]:
        """Retrieve a beneficiary event by ID."""
        pass

    @abstractmethod
    async def get_all(self) -> List[BeneficiaryEvent]:
        """Retrieve all beneficiary events."""
        pass

    @abstractmethod
    async def delete(self, event_id: str) -> bool:
        """Delete a beneficiary event by ID."""
        pass
