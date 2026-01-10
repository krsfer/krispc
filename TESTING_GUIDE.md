# Testing Quick Reference Guide

## Running Tests

### Run All Tests
```bash
python -m pytest
```

### Run Tests with Coverage Report
```bash
python -m pytest --cov=. --cov-report=term-missing --cov-report=html
```

### Run Specific Test File
```bash
python -m pytest krispc/tests_models.py -v
```

### Run Specific Test Class
```bash
python -m pytest krispc/tests_models.py::ContactModelTest -v
```

### Run Specific Test Method
```bash
python -m pytest krispc/tests_models.py::ContactModelTest::test_create_contact -v
```

### Run Tests for Specific App
```bash
python -m pytest krispc/ -v
```

### Run Tests with Different Verbosity
```bash
# Quiet
python -m pytest -q

# Verbose
python -m pytest -v

# Very verbose
python -m pytest -vv
```

### Run Only Failed Tests
```bash
python -m pytest --lf  # last failed
python -m pytest --ff  # failed first
```

### Run Tests in Parallel (faster)
```bash
python -m pytest -n auto  # requires pytest-xdist
```

### Stop on First Failure
```bash
python -m pytest -x
```

### Show Print Statements
```bash
python -m pytest -s
```

## Coverage Commands

### Generate HTML Coverage Report
```bash
python -m pytest --cov=krispc --cov-report=html
open htmlcov/index.html  # macOS
```

### Show Missing Lines
```bash
python -m pytest --cov=krispc --cov-report=term-missing
```

### Generate Coverage for Specific Module
```bash
python -m pytest krispc/ --cov=krispc --cov-report=term-missing
```

### Check Coverage Threshold
```bash
python -m pytest --cov=krispc --cov-fail-under=50
```

## Useful Options

### Skip Slow Tests
```bash
python -m pytest -m "not slow"
```

### Run Only Slow/Integration Tests
```bash
python -m pytest -m "slow or integration"
```

### Show Test Duration
```bash
python -m pytest --durations=10  # Show slowest 10 tests
```

### Re-run Flaky Tests
```bash
python -m pytest --reruns 3  # requires pytest-rerunfailures
```

## Debugging Tests

### Drop into Debugger on Failure
```bash
python -m pytest --pdb
```

### Drop into Debugger on First Failure
```bash
python -m pytest -x --pdb
```

### Show Local Variables on Failure
```bash
python -m pytest -l
```

### Show Full Traceback
```bash
python -m pytest --tb=long
```

### Show Short Traceback
```bash
python -m pytest --tb=short
```

### Show No Traceback
```bash
python -m pytest --tb=no
```

## Pytest Markers

```python
# In your test file
import pytest

@pytest.mark.slow
def test_slow_operation():
    ...

@pytest.mark.integration
def test_api_integration():
    ...

@pytest.mark.skip(reason="Not implemented yet")
def test_future_feature():
    ...

@pytest.mark.skipif(sys.version_info < (3, 10), reason="Requires Python 3.10+")
def test_new_python_feature():
    ...

@pytest.mark.parametrize("input,expected", [
    (1, 2),
    (2, 4),
    (3, 6),
])
def test_double(input, expected):
    assert input * 2 == expected
```

## Django-Specific Commands

### Run Django Tests (traditional)
```bash
python manage.py test
```

### Run pytest with Django
```bash
python -m pytest  # Uses pytest-django plugin
```

### Run Tests with Specific Settings
```bash
DJANGO_SETTINGS_MODULE=_main.test_settings python -m pytest
```

### Create Test Database
```bash
python manage.py test --keepdb  # Keep test database between runs
```

## Coverage Configuration

Create a `.coveragerc` file in project root:

```ini
[run]
source = .
omit = 
    */migrations/*
    */tests/*
    */test_*.py
    */__pycache__/*
    */venv/*
    */env/*
    manage.py
    */staticfiles/*

[report]
exclude_lines =
    pragma: no cover
    def __repr__
    raise AssertionError
    raise NotImplementedError
    if __name__ == .__main__.:
    if TYPE_CHECKING:
    @abstractmethod
```

## Current Test Organization

```
krispc/
├── tests.py              # Legacy (minimal)
├── tests_api.py          # API endpoint tests
├── tests_models.py       # ✅ NEW: Model tests
├── tests_serializers.py  # ✅ NEW: Serializer tests
├── tests_services.py     # ✅ NEW: Service tests
├── tests_views.py        # ✅ NEW: View tests
├── tests_i18n.py         # Internationalization tests
├── tests_security.py     # Security feature tests
└── tests_throttling.py   # Rate limiting tests
```

## Common Test Patterns

### Testing Models
```python
from django.test import TestCase
from myapp.models import MyModel

class MyModelTest(TestCase):
    def setUp(self):
        self.obj = MyModel.objects.create(name="Test")
    
    def test_str_method(self):
        self.assertEqual(str(self.obj), "Test")
```

### Testing APIs
```python
from rest_framework.test import APITestCase
from django.urls import reverse

class MyAPITest(APITestCase):
    def test_get_endpoint(self):
        url = reverse('my-endpoint')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
```

### Mocking External Services
```python
from unittest.mock import patch, MagicMock

class ServiceTest(TestCase):
    @patch('myapp.services.external_api_call')
    def test_service(self, mock_api):
        mock_api.return_value = {'status': 'success'}
        result = my_service_function()
        self.assertEqual(result, 'success')
```

## Best Practices

1. **Keep tests isolated** - Each test should be independent
2. **Use fixtures and factories** - Don't repeat test data setup
3. **Test behavior, not implementation** - Focus on what, not how
4. **Mock external dependencies** - Tests should be fast and reliable
5. **Use descriptive test names** - test_should_return_error_when_invalid_email
6. **Test edge cases** - Empty strings, None, very large numbers, etc.
7. **Keep tests fast** - Slow tests won't get run
8. **Aim for 80% coverage** - 100% is rarely worth it
9. **Test critical paths first** - Authentication, payments, data loss scenarios
10. **Write tests first** - TDD when possible

## Troubleshooting

### Tests failing with database errors
```bash
python manage.py migrate --run-syncdb
python manage.py migrate
```

### Tests can't find modules
```bash
# Make sure you're in the project root
cd /Users/chris/dev/src/py/krispcBase
```

### Coverage not showing all files
Check your `.coveragerc` or `pytest.ini` configuration

### Tests are very slow
- Use `--durations=10` to find slow tests
- Mock external API calls
- Use `pytest-xdist` for parallel execution
- Consider using `--reuse-db` for Django tests

## Additional Resources

- [pytest documentation](https://docs.pytest.org/)
- [pytest-django documentation](https://pytest-django.readthedocs.io/)
- [Django testing documentation](https://docs.djangoproject.com/en/stable/topics/testing/)
- [Coverage.py documentation](https://coverage.readthedocs.io/)
