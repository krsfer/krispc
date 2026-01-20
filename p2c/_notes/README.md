# P2C (PDF to Calendar) Web Application
## Technical Specification and Development Guidelines

## Table of Contents
1. [Project Overview](#project-overview)
2. [Core Development Principles](#core-development-principles)
3. [Technical Requirements](#technical-requirements)
4. [Development Guidelines](#development-guidelines)
5. [Testing Strategy](#testing-strategy)
6. [Architecture & Implementation](#architecture--implementation)
7. [Deployment & Documentation](#deployment--documentation)

## Project Overview

P2C is a Django and JavaScript ES2024 web application designed to convert PDF-based beneficiary schedules into Google Calendar events. The application provides a complete solution for processing PDF schedules and integrating with Google Calendar.

## Core Development Principles

### Test-Driven Development (TDD)
The project strictly follows TDD methodology with the following principles:

1. **Red-Green-Refactor Cycle**
   - Red: Write failing tests first
   - Green: Implement minimum code to pass tests
   - Refactor: Improve code while maintaining passing tests

2. **Test Pyramid Structure**
   ```
   /\      E2E Tests
  /  \     Integration Tests
 /____\    Unit Tests
   ```
   - Base Layer: Comprehensive unit tests (60% of testing effort)
   - Middle Layer: Integration tests (30% of testing effort)
   - Top Layer: End-to-end tests (10% of testing effort)

3. **Coverage Requirements**
   - Minimum 90% overall code coverage
   - 100% coverage for critical paths
   - Test coverage reporting in CI/CD pipeline

### SOLID Principles Implementation

1. **Single Responsibility Principle (SRP)**
   ```python
   # Good Example
   class PDFParser:
       def parse_pdf(self, pdf_file):
           pass

   class EventCreator:
       def create_calendar_event(self, event_data):
           pass

   # Instead of
   class PDFProcessor:
       def parse_pdf(self, pdf_file):
           pass
       def create_calendar_event(self, event_data):
           pass
   ```

2. **Open/Closed Principle (OCP)**
   ```python
   from abc import ABC, abstractmethod

   class Parser(ABC):
       @abstractmethod
       def parse(self, file):
           pass

   class PDFParser(Parser):
       def parse(self, file):
           # PDF specific implementation

   class WordParser(Parser):
       def parse(self, file):
           # Word specific implementation
   ```

3. **Liskov Substitution Principle (LSP)**
   ```python
   class CalendarEvent:
       def schedule(self, start_time, end_time):
           pass

   class RecurringEvent(CalendarEvent):
       def schedule(self, start_time, end_time):
           # Must work wherever CalendarEvent is expected
           pass
   ```

4. **Interface Segregation Principle (ISP)**
   ```python
   # Good Example
   class PDFReader:
       def read_pdf(self):
           pass

   class TextExtractor:
       def extract_text(self):
           pass

   # Instead of
   class DocumentProcessor:
       def read_pdf(self):
           pass
       def extract_text(self):
           pass
       def create_event(self):
           pass
   ```

5. **Dependency Inversion Principle (DIP)**
   ```python
   class CalendarService:
       def __init__(self, event_repository):
           self.event_repository = event_repository

   # Usage
   calendar_service = CalendarService(GoogleCalendarRepository())
   ```

### Separation of Concerns (SoC)

1. **Layer Separation**
   ```
   └── p2c/
       ├── presentation/        # UI Layer
       ├── application/        # Application Services
       ├── domain/            # Business Logic
       ├── infrastructure/    # External Services
       └── persistence/       # Data Access
   ```

2. **Module Independence**
   ```python
   # presentation/views.py
   class UploadView:
       def __init__(self, upload_service):
           self.upload_service = upload_service

   # application/services.py
   class UploadService:
       def __init__(self, pdf_repository, event_creator):
           self.pdf_repository = pdf_repository
           self.event_creator = event_creator
   ```

## Technical Requirements

### Technology Stack
- Backend: Django 5.0+
- Frontend: JavaScript ES2024
- Styling: Tailwind CSS
- PDF Processing: pdfminer.six
- Calendar Integration: Google Calendar API
- Testing: pytest, Jest, Cypress

### Project Structure
```
p2c/
├── backend/
│   ├── domain/
│   │   ├── models/
│   │   ├── services/
│   │   └── repositories/
│   ├── application/
│   │   ├── usecases/
│   │   └── interfaces/
│   └── infrastructure/
│       ├── persistence/
│       └── external_services/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── services/
│   │   └── hooks/
│   └── tests/
└── tests/
    ├── unit/
    ├── integration/
    └── e2e/
```

## Testing Strategy

### Unit Testing Example
```python
# test_pdf_parser.py
def test_should_extract_event_data_when_given_valid_pdf():
    # Arrange
    parser = PDFParser()
    test_pdf = create_test_pdf()
    expected_events = [
        Event(date="2024-01-01", time="09:00")
    ]
    
    # Act
    actual_events = parser.parse(test_pdf)
    
    # Assert
    assert actual_events == expected_events
```

### Integration Testing Example
```python
# test_calendar_integration.py
def test_should_create_calendar_event_when_processing_pdf():
    # Arrange
    pdf_service = PDFService()
    calendar_service = CalendarService()
    test_pdf = create_test_pdf()
    
    # Act
    result = pdf_service.process_and_create_event(test_pdf)
    
    # Assert
    assert calendar_service.get_event(result.event_id) is not None
```

## Architecture & Implementation

### Domain Model Example
```python
from dataclasses import dataclass
from datetime import datetime

@dataclass
class BeneficiaryEvent:
    id: str
    beneficiary_name: str
    start_time: datetime
    end_time: datetime
    location: str
    
    def duration_in_minutes(self) -> int:
        return (self.end_time - self.start_time).minutes
    
    def is_valid(self) -> bool:
        return (
            self.start_time < self.end_time and
            bool(self.beneficiary_name)
        )
```

### Service Layer Example
```python
class PDFProcessingService:
    def __init__(
        self,
        pdf_repository: PDFRepository,
        event_repository: EventRepository,
        calendar_service: CalendarService
    ):
        self.pdf_repository = pdf_repository
        self.event_repository = event_repository
        self.calendar_service = calendar_service
    
    async def process_pdf(self, pdf_file: UploadedFile) -> List[BeneficiaryEvent]:
        pdf_content = await self.pdf_repository.save(pdf_file)
        events = self.extract_events(pdf_content)
        
        for event in events:
            if event.is_valid():
                await self.event_repository.save(event)
                await self.calendar_service.create_event(event)
        
        return events
```

## Deployment & Documentation

### CI/CD Pipeline
```yaml
# .github/workflows/main.yml
name: P2C CI/CD

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run Tests
        run: |
          python -m pytest --cov
          npm test
          
  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to Production
        run: ./deploy.sh
```

### Environment Variables
```env
# .env.example
DJANGO_SECRET_KEY=your-secret-key
GOOGLE_CALENDAR_API_KEY=your-api-key
PDF_PROCESSING_TIMEOUT=300
TEST_DATABASE_URL=postgresql://test:test@localhost:5432/test_db
```

### API Documentation Example
```python
@api.route('/api/v1/pdf/upload', methods=['POST'])
@jwt_required
def upload_pdf():
    """
    Upload PDF for processing
    ---
    parameters:
      - name: file
        in: formData
        type: file
        required: true
    responses:
      200:
        description: PDF successfully processed
      400:
        description: Invalid PDF format
    """
    pass
```

## Security Considerations

1. Input Validation
2. Authentication & Authorization
3. Data Encryption
4. API Security
5. File Upload Security

## Performance Optimization

1. Caching Strategy
2. Database Optimization
3. Frontend Performance
4. API Response Time
5. PDF Processing Optimization

For detailed implementation examples and specific component documentation, refer to the respective sections in the codebase.