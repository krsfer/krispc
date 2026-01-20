# PDF2Calendar Testing Guide

This guide provides a recommended order for running tests, starting with the simplest tests and progressing to more complex ones. This approach helps identify basic issues before tackling more complex integration scenarios.

## Test Execution Order

### 1. Model Tests (Basic Domain Logic)
```bash
/Users/chris/dev/src/py/pdf2cal/venv/bin/python -m pytest tests/domain/models/test_beneficiary_event.py -v
```
Tests basic model functionality without external dependencies.

### 2. Basic API Tests (File Upload)
```bash
/Users/chris/dev/src/py/pdf2cal/venv/bin/python -m pytest tests/api/test_endpoints.py::test_upload_pdf_endpoint -v
```
Tests basic file upload functionality without processing.

### 3. PDF Parser Tests
```bash
/Users/chris/dev/src/py/pdf2cal/venv/bin/python -m pytest tests/unit/pdf_processing/test_pdf_parser.py -v
```
Tests PDF parsing functionality with file system operations.

### 4. Google Calendar Tests
```bash
/Users/chris/dev/src/py/pdf2cal/venv/bin/python -m pytest tests/unit/calendar/test_google_calendar.py -v
```
Tests calendar integration with mocked external services.

### 5. API Processing Tests
```bash
/Users/chris/dev/src/py/pdf2cal/venv/bin/python -m pytest tests/api/test_endpoints.py::test_process_pdf_endpoint -v
```
Tests the complete API processing flow with service interactions.

### 6. Integration Tests
```bash
/Users/chris/dev/src/py/pdf2cal/venv/bin/python -m pytest tests/integration/test_pdf_to_calendar_flow.py -v
```
Tests the complete end-to-end flow.

## Useful pytest Flags

- `-v`: Verbose output
- `-x`: Stop after first failure
- `-k "test_name"`: Only run tests matching the given name
- `--lf`: Run only the tests that failed last time
- `--pdb`: Drop into debugger on failures
- `-s`: Show print statements in output

## Running Specific Tests

To run a specific test class or method:
```bash
/Users/chris/dev/src/py/pdf2cal/venv/bin/python -m pytest path/to/test_file.py::TestClassName::test_method_name -v
```

Example combining multiple flags:
```bash
# Run model tests verbosely and stop at first failure
/Users/chris/dev/src/py/pdf2cal/venv/bin/python -m pytest tests/domain/models/test_beneficiary_event.py -v -x

# Run only failed tests from last run with debugger
/Users/chris/dev/src/py/pdf2cal/venv/bin/python -m pytest --lf --pdb
