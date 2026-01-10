# Test Coverage Improvement Plan

## Current State (2026-01-11)

- **Overall Coverage**: 25%
- **Tests Running**: 9 passing, 18 failing
- **Main Issues**:
  - Missing database migrations (created_at field)
  - Many core modules with 0% coverage
  - Failing security and throttling tests
  - MCP server tests causing import errors

## Coverage by Module

### krispc App
- **api.py**: 0% (needs comprehensive API testing)
- **views.py**: 0% (needs view integration tests)
- **models.py**: 92% (good, just needs __str__ test)
- **forms.py**: 0% (needs form validation tests)
- **services.py**: 0% (needs email service tests)
- **serializers.py**: 0% (needs serializer tests)
- **middleware.py**: 0% (needs middleware tests)
- **permissions.py**: 0% (needs permission tests)

### p2c App
- **views.py**: 13% (needs major improvement)
- **models.py**: 79% (good, minor gaps)
- **tasks.py**: 8% (needs Celery task tests)
- **pdf_processing/**: 7-16% (needs parser tests)
- **services/**: 16% (needs service tests)

### Other Apps
- **hello, hub, wat, addthem, chat**: 0% (minimal apps, need basic tests)

## Priority 1: Fix Failing Tests

1. **Add missing database migrations**
   - Add `created_at` field to Contact model
   - Run migrations

2. **Fix serializer validation**
   - Update ContactSerializer with proper validation
   - Add honeypot field handling

3. **Fix throttling configuration**
   - Configure default throttle rates

## Priority 2: Core krispc Module Coverage

### Models (Target: 100%)
- [ ] Test Contact model creation
- [ ] Test Contact __str__ method
- [ ] Test field validations

### API Endpoints (Target: 90%)
- [ ] Test all GET endpoints (products, colophon, marques, villes)
- [ ] Test Contact CRUD operations
- [ ] Test permissions (admin vs anonymous)
- [ ] Test throttling
- [ ] Test i18n language switching
- [ ] Test pagination
- [ ] Test filtering and search
- [ ] Test error responses

### Views (Target: 80%)
- [ ] Test IndexPageView rendering
- [ ] Test PrivacyView
- [ ] Test TermsView
- [ ] Test create_contact form submission
- [ ] Test favicon view
- [ ] Test HTMX interactions

### Forms (Target: 90%)
- [ ] Test all form fields
- [ ] Test form validation
- [ ] Test honeypot field
- [ ] Test message length validation
- [ ] Test email validation
- [ ] Test CSRF protection

### Services (Target: 85%)
- [ ] Test send_contact_email
- [ ] Mock email sending
- [ ] Test email content generation
- [ ] Test error handling

### Serializers (Target: 90%)
- [ ] Test ContactSerializer validation
- [ ] Test ProductSerializer
- [ ] Test ColophonSerializer
- [ ] Test MarqueSerializer
- [ ] Test serialization/deserialization

### Middleware (Target: 75%)
- [ ] Test language middleware
- [ ] Test security middleware
- [ ] Test request/response processing

### Permissions (Target: 85%)
- [ ] Test IsAdminOrReadOnly
- [ ] Test custom permission classes

## Priority 3: MCP Server Coverage (Target: 70%)

- [ ] Fix MCP import issues
- [ ] Test resource listing
- [ ] Test resource reading
- [ ] Test tool listing
- [ ] Test tool execution
- [ ] Test pricing tool
- [ ] Test service locations tool
- [ ] Test PDF processing tool
- [ ] Test error handling

## Priority 4: p2c Module Coverage (Target: 60%)

### Models (increase from 79% to 95%)
- [ ] Test all model methods
- [ ] Test model relationships
- [ ] Test property methods

### PDF Processing (increase from 15% to 60%)
- [ ] Test parser factory
- [ ] Test AuxiliaDom parser
- [ ] Test schedule parser
- [ ] Test PDF processor
- [ ] Test error cases

### Services (increase from 16% to 65%)
- [ ] Test conversion service
- [ ] Test ingest service
- [ ] Test calendar integration
- [ ] Mock external dependencies

### Tasks (increase from 8% to 50%)
- [ ] Test Celery tasks with mocks
- [ ] Test task error handling
- [ ] Test task scheduling

### Views (increase from 13% to 70%)
- [ ] Test all view endpoints
- [ ] Test authentication
- [ ] Test JSON responses
- [ ] Test file uploads
- [ ] Test error handling

## Priority 5: Integration Tests

- [ ] End-to-end API workflows
- [ ] Contact form submission flow
- [ ] PDF upload and processing flow
- [ ] Calendar integration flow
- [ ] Authentication flows

## Priority 6: Performance & Load Tests

- [ ] API response time tests
- [ ] Database query optimization tests
- [ ] Throttling effectiveness tests
- [ ] Concurrent request tests

## Testing Infrastructure Improvements

### Test Utilities
- [ ] Create factory classes for models (using factory_boy)
- [ ] Create fixtures for common test data
- [ ] Create custom test assertions
- [ ] Create mock helpers for external services

### CI/CD Integration
- [ ] Set up pytest in CI pipeline
- [ ] Add coverage reporting to CI
- [ ] Set minimum coverage thresholds
- [ ] Add coverage badges to README

### Test Organization
- [ ] Separate unit, integration, and e2e tests
- [ ] Create conftest.py for shared fixtures
- [ ] Organize tests by feature/module
- [ ] Add docstrings to all tests

## Coverage Goals

### Short-term (1-2 weeks)
- Fix all failing tests
- Reach 50% overall coverage
- 80% coverage for krispc core (api, views, models)

### Medium-term (1 month)
- Reach 70% overall coverage
- 90% coverage for krispc app
- 60% coverage for p2c app
- 70% coverage for MCP server

### Long-term (2-3 months)
- Reach 85% overall coverage
- 95% coverage for critical paths
- Full integration test suite
- Performance test suite

## Implementation Strategy

1. **Week 1**: Fix failing tests and database issues
2. **Week 2**: Core krispc API and model tests
3. **Week 3**: krispc views, forms, and services
4. **Week 4**: MCP server tests
5. **Week 5-6**: p2c module tests
6. **Week 7**: Integration tests
7. **Week 8**: Performance tests and cleanup

## Metrics to Track

- Overall line coverage percentage
- Branch coverage percentage
- Number of passing/failing tests
- Test execution time
- Code quality (complexity, duplication)
- Number of critical bugs found by tests

## Notes

- Focus on testing business logic and critical paths first
- Don't aim for 100% coverage - focus on meaningful tests
- Write tests that document expected behavior
- Keep tests fast and isolated
- Use mocks for external dependencies
- Test both happy paths and error cases
