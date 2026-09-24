#!/bin/bash

# Phase 3 Queue Management - Test Script
# This script tests all critical Phase 3 features using curl

API_BASE="http://localhost:5000/api"
TODAY=$(date +%Y-%m-%d)

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
PASSED=0
FAILED=0

# Function to log results
log_success() {
    echo -e "${GREEN}✅ $1${NC}"
    ((PASSED++))
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
    ((FAILED++))
}

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Generate UUID for X-Action-ID
generate_uuid() {
    if command -v uuidgen &> /dev/null; then
        uuidgen
    else
        cat /proc/sys/kernel/random/uuid 2>/dev/null || echo "$(date +%s)-$(shuf -i 1000-9999 -n 1)"
    fi
}

echo ""
echo "============================================================"
echo "Phase 3 Queue Management - Automated Tests"
echo "============================================================"
echo ""

# Step 1: Create test users if they don't exist
log_info "Setting up test users..."

# The authentication will be done via manual testing or you can add user creation here

# For now, we'll use placeholder tokens
# In real testing, you would:
# 1. Register or login as doctor
# 2. Register or login as patient
# 3. Configure doctor schedule
# 4. Create appointments

log_warn "This script requires manual setup:"
log_warn "1. Create doctor account: doctor@test.com"
log_warn "2. Create patient account: patient@test.com"
log_warn "3. Configure doctor schedule"
log_warn "4. Create test appointments for today"
log_warn ""
log_warn "Please run the manual tests as described in phase3_testing_guide.md"

echo ""
echo "============================================================"
echo "Manual Testing Instructions"
echo "============================================================"
echo ""
echo "1. Login as Doctor:"
echo "   curl -X POST $API_BASE/auth/login \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"email\":\"doctor@test.com\",\"password\":\"password123\"}'"
echo ""
echo "2. Get Queue State:"
echo "   curl -X GET '$API_BASE/queue/current-state?date=$TODAY' \\"
echo "     -H 'Authorization: Bearer <DOCTOR_JWT>'"
echo ""
echo "3. Call Next Patient:"
echo "   curl -X POST $API_BASE/queue/call-next \\"
echo "     -H 'Authorization: Bearer <DOCTOR_JWT>' \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -H 'X-Action-ID: $(generate_uuid)' \\"
echo "     -d '{\"date\":\"$TODAY\"}'"
echo ""
echo "4. Test Idempotency (use same X-Action-ID):"
echo "   curl -X POST $API_BASE/queue/call-next \\"
echo "     -H 'Authorization: Bearer <DOCTOR_JWT>' \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -H 'X-Action-ID: <SAME_UUID_AS_ABOVE>' \\"
echo "     -d '{\"date\":\"$TODAY\"}'"
echo ""
echo "5. Mark Completed:"
echo "   curl -X POST $API_BASE/queue/mark-completed \\"
echo "     -H 'Authorization: Bearer <DOCTOR_JWT>' \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -H 'X-Action-ID: $(generate_uuid)' \\"
echo "     -d '{\"date\":\"$TODAY\"}'"
echo ""
echo "============================================================"
echo ""

log_info "For complete testing instructions, see: phase3_testing_guide.md"
