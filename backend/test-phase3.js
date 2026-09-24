const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

// Store tokens and IDs from login
let doctorToken = '';
let patientToken = '';
let doctorId = '';
let patientId = '';

// Test configuration
const testDate = new Date().toISOString().split('T')[0]; // Today's date

// Color output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m'
};

const log = {
    success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
    error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
    info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
    warn: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`)
};

// Test results
const results = {
    passed: 0,
    failed: 0,
    tests: []
};

function recordTest(name, passed, message = '') {
    results.tests.push({ name, passed, message });
    if (passed) {
        results.passed++;
        log.success(`${name} ${message}`);
    } else {
        results.failed++;
        log.error(`${name} ${message}`);
    }
}

// Helper to generate UUID for X-Action-ID
function generateActionId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Test 1: Doctor Login
async function test1_DoctorLogin() {
    log.info('Test 1: Doctor Login');
    try {
        const response = await axios.post(`${API_BASE}/auth/login`, {
            email: 'doctor@test.com',
            password: 'password123'
        });

        if (response.data.token) {
            doctorToken = response.data.token;
            doctorId = response.data.user.userId;
            recordTest('Doctor Login', true, `Token received for ${response.data.user.email}`);
            return true;
        } else {
            recordTest('Doctor Login', false, 'No token received');
            return false;
        }
    } catch (error) {
        recordTest('Doctor Login', false, error.response?.data?.message || error.message);
        return false;
    }
}

// Test 2: Patient Login
async function test2_PatientLogin() {
    log.info('Test 2: Patient Login');
    try {
        const response = await axios.post(`${API_BASE}/auth/login`, {
            email: 'patient@test.com',
            password: 'password123'
        });

        if (response.data.token) {
            patientToken = response.data.token;
            patientId = response.data.user.userId;
            recordTest('Patient Login', true, `Token received for ${response.data.user.email}`);
            return true;
        } else {
            recordTest('Patient Login', false, 'No token received');
            return false;
        }
    } catch (error) {
        recordTest('Patient Login', false, error.response?.data?.message || error.message);
        return false;
    }
}

// Test 3: Get Current Queue State
async function test3_GetQueueState() {
    log.info('Test 3: Get Current Queue State');
    try {
        const response = await axios.get(`${API_BASE}/queue/current-state`, {
            params: { date: testDate },
            headers: { 'Authorization': `Bearer ${doctorToken}` }
        });

        if (response.data && response.data.status) {
            recordTest('Get Queue State', true, `Status: ${response.data.status}, Waiting: ${response.data.counts?.waiting || 0}`);
            console.log('Queue State:', JSON.stringify(response.data, null, 2));
            return true;
        } else {
            recordTest('Get Queue State', false, 'Invalid response structure');
            return false;
        }
    } catch (error) {
        recordTest('Get Queue State', false, error.response?.data?.message || error.message);
        return false;
    }
}

// Test 4: Call Next Patient
async function test4_CallNextPatient() {
    log.info('Test 4: Call Next Patient');
    const actionId = generateActionId();

    try {
        const response = await axios.post(`${API_BASE}/queue/call-next`,
            { date: testDate },
            {
                headers: {
                    'Authorization': `Bearer ${doctorToken}`,
                    'X-Action-ID': actionId,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (response.data.success) {
            recordTest('Call Next Patient', true, `Token ${response.data.currentToken} called`);
            console.log('Response:', JSON.stringify(response.data, null, 2));
            return { success: true, actionId };
        } else {
            recordTest('Call Next Patient', false, 'Success flag not true');
            return { success: false };
        }
    } catch (error) {
        const message = error.response?.data?.message || error.response?.data?.error || error.message;
        recordTest('Call Next Patient', false, message);
        console.log('Full error:', error.response?.data || error.message);
        return { success: false };
    }
}

// Test 5: Idempotency - Duplicate Call Next
async function test5_IdempotencyTest(previousActionId) {
    log.info('Test 5: Idempotency - Duplicate Request');

    if (!previousActionId) {
        recordTest('Idempotency Test', false, 'No previous action ID to test');
        return false;
    }

    try {
        const response = await axios.post(`${API_BASE}/queue/call-next`,
            { date: testDate },
            {
                headers: {
                    'Authorization': `Bearer ${doctorToken}`,
                    'X-Action-ID': previousActionId,
                    'Content-Type': 'application/json'
                }
            }
        );

        // Should return cached response
        if (response.data.success) {
            recordTest('Idempotency Test', true, 'Returned cached response without duplicate action');
            return true;
        } else {
            recordTest('Idempotency Test', false, 'Unexpected response');
            return false;
        }
    } catch (error) {
        recordTest('Idempotency Test', false, error.response?.data?.message || error.message);
        return false;
    }
}

// Test 6: Missing X-Action-ID Header
async function test6_MissingActionId() {
    log.info('Test 6: Missing X-Action-ID Header');

    try {
        const response = await axios.post(`${API_BASE}/queue/call-next`,
            { date: testDate },
            {
                headers: {
                    'Authorization': `Bearer ${doctorToken}`,
                    'Content-Type': 'application/json'
                    // Missing X-Action-ID
                }
            }
        );

        recordTest('Missing Action ID', false, 'Should have rejected request');
        return false;
    } catch (error) {
        const message = error.response?.data?.message || error.response?.data?.error || '';
        if (message.includes('X-Action-ID')) {
            recordTest('Missing Action ID', true, 'Correctly rejected: ' + message);
            return true;
        } else {
            recordTest('Missing Action ID', false, 'Wrong error: ' + message);
            return false;
        }
    }
}

// Test 7: Authorization - Patient Cannot Access
async function test7_PatientCannotAccess() {
    log.info('Test 7: Authorization - Patient Cannot Access Queue');

    try {
        const response = await axios.post(`${API_BASE}/queue/call-next`,
            { date: testDate },
            {
                headers: {
                    'Authorization': `Bearer ${patientToken}`,
                    'X-Action-ID': generateActionId(),
                    'Content-Type': 'application/json'
                }
            }
        );

        recordTest('Patient Authorization', false, 'Patient should not have access');
        return false;
    } catch (error) {
        const status = error.response?.status;
        if (status === 403 || status === 401) {
            recordTest('Patient Authorization', true, 'Correctly rejected patient access');
            return true;
        } else {
            recordTest('Patient Authorization', false, `Unexpected status: ${status}`);
            return false;
        }
    }
}

// Test 8: Mark Patient as Completed
async function test8_MarkCompleted() {
    log.info('Test 8: Mark Patient as Completed');
    const actionId = generateActionId();

    try {
        const response = await axios.post(`${API_BASE}/queue/mark-completed`,
            { date: testDate },
            {
                headers: {
                    'Authorization': `Bearer ${doctorToken}`,
                    'X-Action-ID': actionId,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (response.data.success) {
            recordTest('Mark Completed', true, `Completed token ${response.data.completedToken}, Next: ${response.data.nextToken}`);
            console.log('Response:', JSON.stringify(response.data, null, 2));
            return true;
        } else {
            recordTest('Mark Completed', false, 'Success flag not true');
            return false;
        }
    } catch (error) {
        const message = error.response?.data?.message || error.response?.data?.error || error.message;
        recordTest('Mark Completed', false, message);
        return false;
    }
}

// Test 9: Pause Queue
async function test9_PauseQueue() {
    log.info('Test 9: Pause Queue');

    try {
        const response = await axios.post(`${API_BASE}/queue/pause`,
            { date: testDate },
            {
                headers: {
                    'Authorization': `Bearer ${doctorToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (response.data.success) {
            recordTest('Pause Queue', true, response.data.message);
            return true;
        } else {
            recordTest('Pause Queue', false, 'Success flag not true');
            return false;
        }
    } catch (error) {
        const message = error.response?.data?.message || error.response?.data?.error || error.message;
        recordTest('Pause Queue', false, message);
        return false;
    }
}

// Test 10: Resume Queue
async function test10_ResumeQueue() {
    log.info('Test 10: Resume Queue');

    try {
        const response = await axios.post(`${API_BASE}/queue/resume`,
            { date: testDate },
            {
                headers: {
                    'Authorization': `Bearer ${doctorToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (response.data.success) {
            recordTest('Resume Queue', true, response.data.message);
            return true;
        } else {
            recordTest('Resume Queue', false, 'Success flag not true');
            return false;
        }
    } catch (error) {
        const message = error.response?.data?.message || error.response?.data?.error || error.message;
        recordTest('Resume Queue', false, message);
        return false;
    }
}

// Run all tests
async function runAllTests() {
    console.log('\n' + '='.repeat(60));
    console.log('Phase 3 Queue Management - Automated Tests');
    console.log('='.repeat(60) + '\n');

    // Authentication tests
    const doctorLoggedIn = await test1_DoctorLogin();
    const patientLoggedIn = await test2_PatientLogin();

    if (!doctorLoggedIn) {
        log.error('Cannot proceed without doctor login');
        return;
    }

    // Queue operation tests
    await test3_GetQueueState();

    const callNextResult = await test4_CallNextPatient();

    if (callNextResult.success && callNextResult.actionId) {
        await test5_IdempotencyTest(callNextResult.actionId);
    }

    await test6_MissingActionId();

    if (patientLoggedIn) {
        await test7_PatientCannotAccess();
    }

    await test8_MarkCompleted();
    await test9_PauseQueue();
    await test10_ResumeQueue();

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('Test Summary');
    console.log('='.repeat(60));
    console.log(`${colors.green}✅ Passed: ${results.passed}${colors.reset}`);
    console.log(`${colors.red}❌ Failed: ${results.failed}${colors.reset}`);
    console.log(`Total: ${results.passed + results.failed}`);

    if (results.failed > 0) {
        console.log('\nFailed Tests:');
        results.tests.filter(t => !t.passed).forEach(t => {
            console.log(`  - ${t.name}: ${t.message}`);
        });
    }

    console.log('\n' + '='.repeat(60) + '\n');
}

// Run tests
runAllTests().catch(error => {
    console.error('Test suite error:', error);
    process.exit(1);
});
