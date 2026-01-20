import logging
from typing import List, Optional, Tuple

from ...domain.models.beneficiary_event import BeneficiaryEvent
from ...domain.repositories.event_repository import EventRepository
from ...domain.services.calendar_service import CalendarService
from ...domain.services.pdf_processor import PDFProcessor

logger = logging.getLogger(__name__)


class ProcessScheduleUseCase:
    """Application use case for processing beneficiary schedules."""

    def __init__(
        self,
        pdf_processor: PDFProcessor,
        calendar_service: CalendarService,
        event_repository: EventRepository,
    ):
        """
        Initialize the use case.

        Args:
            pdf_processor: Service for processing PDF files
            calendar_service: Service for calendar operations
            event_repository: Repository for storing events
        """
        self.pdf_processor = pdf_processor
        self.calendar_service = calendar_service
        self.event_repository = event_repository
        self.logger = logger

    async def execute(
        self, pdf_content: bytes
    ) -> Tuple[List[BeneficiaryEvent], List[str]]:
        """
        Process a PDF schedule and create calendar events.

        Args:
            pdf_content: Raw PDF file content

        Returns:
            Tuple of (processed events, error messages)
        """
        events = []
        errors = []

        try:
            # Extract events from PDF
            extracted_events = self.pdf_processor.extract_events(pdf_content)

            # Process each event
            for event in extracted_events:
                try:
                    if not event.is_valid():
                        errors.append(f"Invalid event data: {event}")
                        continue

                    # Create calendar event
                    calendar_event_id = await self.calendar_service.create_event(event)
                    if not calendar_event_id:
                        errors.append(f"Failed to create calendar event: {event}")
                        continue

                    # Store event in repository
                    event.id = calendar_event_id
                    saved_event = await self.event_repository.save(event)
                    events.append(saved_event)

                except Exception as e:
                    error_msg = f"Error processing event: {str(e)}"
                    self.logger.error(error_msg)
                    errors.append(error_msg)

        except Exception as e:
            error_msg = f"Error processing PDF: {str(e)}"
            self.logger.error(error_msg)
            errors.append(error_msg)

        return events, errors
