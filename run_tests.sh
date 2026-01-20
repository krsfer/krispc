#!/bin/bash
# Test Coverage Helper Script
# This script provides easy commands to run the new tests

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔═══════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   KrisPC Test Coverage Helper         ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════╝${NC}"
echo ""

# Function to run tests
run_tests() {
    local test_file=$1
    local description=$2
    
    echo -e "${YELLOW}Running: ${description}${NC}"
    python -m pytest "$test_file" -v
    echo ""
}

# Main menu
if [ "$1" == "all" ]; then
    echo -e "${GREEN}Running all new tests...${NC}"
    python -m pytest krispc/tests_models.py krispc/tests_serializers.py -v
    
elif [ "$1" == "models" ]; then
    run_tests "krispc/tests_models.py" "Model Tests (All Passing ✅)"
    
elif [ "$1" == "serializers" ]; then
    run_tests "krispc/tests_serializers.py" "Serializer Tests (11/12 Passing ✅)"
    
elif [ "$1" == "services" ]; then
    echo -e "${RED}⚠️  Service tests need SendGrid mocking fixes${NC}"
    run_tests "krispc/tests_services.py" "Service Tests (Need Fixes)"
    
elif [ "$1" == "views" ]; then
    echo -e "${YELLOW}⚠️  Some view tests need URL fixing${NC}"
    run_tests "krispc/tests_views.py" "View Tests (7/12 Passing ⚠️)"
    
elif [ "$1" == "coverage" ]; then
    echo -e "${GREEN}Generating coverage report...${NC}"
    python -m pytest krispc/tests_models.py krispc/tests_serializers.py \
        --cov=krispc --cov-report=html --cov-report=term-missing
    echo ""
    echo -e "${GREEN}✅ Coverage report generated!${NC}"
    echo -e "Open: ${BLUE}htmlcov/index.html${NC}"
    
elif [ "$1" == "passing" ]; then
    echo -e "${GREEN}Running only passing tests...${NC}"
    python -m pytest krispc/tests_models.py krispc/tests_serializers.py::ContactSerializerTest -v -k "not unicode_content"
    
elif [ "$1" == "stats" ]; then
    echo -e "${BLUE}Test Statistics:${NC}"
    echo ""
    echo "Model Tests:      $(grep -c "def test_" krispc/tests_models.py) tests"
    echo "Serializer Tests: $(grep -c "def test_" krispc/tests_serializers.py) tests"
    echo "Service Tests:    $(grep -c "def test_" krispc/tests_services.py) tests"
    echo "View Tests:       $(grep -c "def test_" krispc/tests_views.py) tests"
    echo ""
    echo -e "${GREEN}Total New Tests: ~50${NC}"
    
else
    echo -e "${BLUE}Usage:${NC}"
    echo "  $0 all          - Run all new passing tests"
    echo "  $0 models       - Run model tests (all passing)"
    echo "  $0 serializers  - Run serializer tests (11/12 passing)"
    echo "  $0 services     - Run service tests (need fixes)"
    echo "  $0 views        - Run view tests (7/12 passing)"
    echo "  $0 coverage     - Generate coverage report"
    echo "  $0 passing      - Run only tests that pass"
    echo "  $0 stats        - Show test statistics"
    echo ""
    echo -e "${YELLOW}Examples:${NC}"
    echo "  $0 models       # Quick check that models work"
    echo "  $0 coverage     # Full coverage report"
    echo "  $0 all          # Run all new tests"
    echo ""
fi
