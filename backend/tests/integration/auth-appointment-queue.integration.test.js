const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const request = require('supertest');

const integrationEnabled = process.env.ENABLE_INTEGRATION_TESTS === 'true';
const cookieName = process.env.REFRESH_COOKIE_NAME || 'qline_rt';

if (!integrationEnabled) {
    test(
        'integration suite disabled',
        { skip: 'Set ENABLE_INTEGRATION_TESTS=true to run integration tests' },
        () => {}
    );
} else {
    const {
        ensureTestEnv,
        connectTestDb,
        clearTestDb,
        disconnectTestDb,
    } = require('../helpers/testDb');
    const { createTestApp } = require('../helpers/createTestApp');
    const Appointment = require('../../models/Appointment');
    const DailyQueue = require('../../models/DailyQueue');
    const User = require('../../models/User');
    const { normalizeDate } = require('../../utils/dateUtils');

    ensureTestEnv();

    const app = createTestApp();
    let dbAvailable = false;
    let dbConnectError = null;

    const registerUser = async (agent, payload) => {
        const res = await agent.post('/api/auth/register').send(payload);
        assert.equal(res.status, 201, `register failed: ${JSON.stringify(res.body)}`);
        assert.ok(res.body.accessToken, 'accessToken missing on register');
        assert.ok(res.body.user, 'user missing on register');
        return res;
    };

    before(async () => {
        try {
            await connectTestDb();
            dbAvailable = true;
        } catch (error) {
            dbConnectError = error;
            dbAvailable = false;
        }
    });

    beforeEach(async () => {
        if (!dbAvailable) {
            return;
        }
        await clearTestDb();
    });

    after(async () => {
        if (!dbAvailable) {
            return;
        }
        await clearTestDb();
        await disconnectTestDb();
    });

    test('auth uses secure refresh cookie flow', async (t) => {
        if (!dbAvailable) {
            t.skip(`MongoDB unavailable for integration tests: ${dbConnectError?.message || 'unknown error'}`);
            return;
        }

        const agent = request.agent(app);
        const unique = Date.now();

        const registerRes = await registerUser(agent, {
            name: 'Cookie Test Patient',
            email: `cookie.patient.${unique}@example.com`,
            password: 'Password123!',
            role: 'patient',
        });

        assert.equal(registerRes.body.refreshToken, undefined, 'refreshToken should not be in response');
        assert.ok(
            registerRes.headers['set-cookie']?.some((value) => value.startsWith(`${cookieName}=`)),
            'refresh cookie was not set on register'
        );

        const refreshRes = await agent.post('/api/auth/refresh').send({});
        assert.equal(refreshRes.status, 200, `refresh failed: ${JSON.stringify(refreshRes.body)}`);
        assert.ok(refreshRes.body.accessToken, 'refresh did not return access token');
        assert.ok(
            refreshRes.headers['set-cookie']?.some((value) => value.startsWith(`${cookieName}=`)),
            'refresh cookie was not rotated'
        );

        const logoutRes = await agent.post('/api/auth/logout').send({});
        assert.equal(logoutRes.status, 200, `logout failed: ${JSON.stringify(logoutRes.body)}`);
        assert.ok(
            logoutRes.headers['set-cookie']?.some((value) => value.includes(`${cookieName}=;`)),
            'logout did not clear refresh cookie'
        );
    });

    test('auth normalizes mixed-case emails across register, login, forgot-password, resend verification, and reset-password', async (t) => {
        if (!dbAvailable) {
            t.skip(`MongoDB unavailable for integration tests: ${dbConnectError?.message || 'unknown error'}`);
            return;
        }

        const agent = request.agent(app);
        const unique = Date.now();
        const mixedCaseEmail = `Case.User.${unique}@Example.COM`;
        const normalizedEmail = mixedCaseEmail.toLowerCase();

        const registerRes = await registerUser(agent, {
            name: 'Case Test User',
            email: mixedCaseEmail,
            password: 'Password123!',
            role: 'patient',
        });

        assert.equal(registerRes.body.user.email, normalizedEmail);

        const registeredUser = await User.findOne({ email: normalizedEmail })
            .select('+emailVerificationToken +emailVerificationExpires')
            .lean();
        assert.ok(registeredUser, 'registered user was not found with normalized email');
        assert.equal(registeredUser.email, normalizedEmail);
        assert.ok(registeredUser.emailVerificationToken, 'verification token should be created during register');

        const loginRes = await agent.post('/api/auth/login').send({
            email: normalizedEmail.toUpperCase(),
            password: 'Password123!',
        });

        assert.equal(loginRes.status, 200, `login failed: ${JSON.stringify(loginRes.body)}`);
        assert.equal(loginRes.body.user.email, normalizedEmail);

        const forgotPasswordRes = await agent.post('/api/auth/forgot-password').send({
            email: normalizedEmail.toUpperCase(),
        });

        assert.equal(
            forgotPasswordRes.status,
            200,
            `forgot-password failed: ${JSON.stringify(forgotPasswordRes.body)}`
        );

        const afterForgotPassword = await User.findOne({ email: normalizedEmail })
            .select('+passwordResetToken +passwordResetExpires +emailVerificationToken')
            .lean();
        assert.ok(afterForgotPassword.passwordResetToken, 'forgot-password should store a reset token');
        assert.ok(afterForgotPassword.passwordResetExpires, 'forgot-password should store a reset expiry');

        const previousVerificationToken = afterForgotPassword.emailVerificationToken;

        const resendVerificationRes = await agent.post('/api/auth/verify-email/resend').send({
            email: normalizedEmail.toUpperCase(),
        });

        assert.equal(
            resendVerificationRes.status,
            200,
            `resend verification failed: ${JSON.stringify(resendVerificationRes.body)}`
        );
        assert.equal(resendVerificationRes.body.message, 'Verification email sent');

        const afterResendVerification = await User.findOne({ email: normalizedEmail })
            .select('+emailVerificationToken +emailVerificationExpires')
            .lean();
        assert.ok(afterResendVerification.emailVerificationToken, 'resend verification should keep a token');
        assert.notEqual(
            afterResendVerification.emailVerificationToken,
            previousVerificationToken,
            'resend verification should rotate the token'
        );

        const resetToken = `reset-token-${unique}`;
        await User.updateOne(
            { email: normalizedEmail },
            {
                $set: {
                    passwordResetToken: crypto.createHash('sha256').update(resetToken).digest('hex'),
                    passwordResetExpires: new Date(Date.now() + 15 * 60 * 1000),
                },
            }
        );

        const resetPasswordRes = await agent.post('/api/auth/reset-password').send({
            token: resetToken,
            password: 'NewPassword123!',
        });

        assert.equal(
            resetPasswordRes.status,
            200,
            `reset-password failed: ${JSON.stringify(resetPasswordRes.body)}`
        );

        const loginAfterResetRes = await agent.post('/api/auth/login').send({
            email: mixedCaseEmail,
            password: 'NewPassword123!',
        });

        assert.equal(
            loginAfterResetRes.status,
            200,
            `login after reset failed: ${JSON.stringify(loginAfterResetRes.body)}`
        );
        assert.equal(loginAfterResetRes.body.user.email, normalizedEmail);
    });

    test('doctor can serve a booked patient through queue lifecycle', async (t) => {
        if (!dbAvailable) {
            t.skip(`MongoDB unavailable for integration tests: ${dbConnectError?.message || 'unknown error'}`);
            return;
        }

        const doctorAgent = request.agent(app);
        const patientAgent = request.agent(app);
        const unique = Date.now();

        const doctorRegister = await registerUser(doctorAgent, {
            name: 'Queue Doctor',
            email: `queue.doctor.${unique}@example.com`,
            password: 'Password123!',
            role: 'doctor',
        });

        const patientRegister = await registerUser(patientAgent, {
            name: 'Queue Patient',
            email: `queue.patient.${unique}@example.com`,
            password: 'Password123!',
            role: 'patient',
        });

        const doctorAccessToken = doctorRegister.body.accessToken;
        const patientAccessToken = patientRegister.body.accessToken;

        const doctorConfigRes = await doctorAgent
            .post('/api/doctors/configure')
            .set('Authorization', `Bearer ${doctorAccessToken}`)
            .send({
                department: 'General Medicine',
                workingHours: { start: '09:00', end: '17:00' },
                breakSlots: [],
                defaultConsultTime: 15,
                maxPatientsPerDay: 20,
            });

        assert.equal(doctorConfigRes.status, 200, `doctor config failed: ${JSON.stringify(doctorConfigRes.body)}`);
        const doctorId = doctorConfigRes.body.doctor.id;
        assert.ok(doctorId, 'doctorId missing after schedule configuration');

        const nextWorkingDay = new Date();
        nextWorkingDay.setUTCHours(0, 0, 0, 0);
        do {
            nextWorkingDay.setUTCDate(nextWorkingDay.getUTCDate() + 1);
        } while ([0, 6].includes(nextWorkingDay.getUTCDay()));
        const date = nextWorkingDay.toISOString().split('T')[0];

        const slotStart = new Date(`${date}T10:00:00.000Z`);
        const slotEnd = new Date(`${date}T10:15:00.000Z`);

        const bookingRes = await patientAgent
            .post('/api/appointments/book')
            .set('Authorization', `Bearer ${patientAccessToken}`)
            .send({
                doctorId,
                date,
                slotStart: slotStart.toISOString(),
                slotEnd: slotEnd.toISOString(),
            });

        assert.equal(bookingRes.status, 201, `booking failed: ${JSON.stringify(bookingRes.body)}`);
        assert.equal(bookingRes.body.appointment.status, 'waiting');
        assert.equal(bookingRes.body.appointment.tokenNumber, 1);
        const appointmentId = bookingRes.body.appointment._id;

        const callNextRes = await doctorAgent
            .post('/api/queue/call-next')
            .set('Authorization', `Bearer ${doctorAccessToken}`)
            .set('X-Action-ID', `call-next-${unique}`)
            .send({ date });

        assert.equal(callNextRes.status, 200, `call-next failed: ${JSON.stringify(callNextRes.body)}`);
        assert.equal(callNextRes.body.success, true);
        assert.equal(callNextRes.body.currentToken, 1);
        assert.equal(callNextRes.body.appointment._id, appointmentId);

        const markCompletedRes = await doctorAgent
            .post('/api/queue/mark-completed')
            .set('Authorization', `Bearer ${doctorAccessToken}`)
            .set('X-Action-ID', `mark-completed-${unique}`)
            .send({ date });

        assert.equal(markCompletedRes.status, 200, `mark-completed failed: ${JSON.stringify(markCompletedRes.body)}`);
        assert.equal(markCompletedRes.body.success, true);
        assert.equal(markCompletedRes.body.completedToken, 1);

        const queueStateRes = await doctorAgent
            .get('/api/queue/current-state')
            .query({ date })
            .set('Authorization', `Bearer ${doctorAccessToken}`);

        assert.equal(queueStateRes.status, 200, `current-state failed: ${JSON.stringify(queueStateRes.body)}`);
        assert.equal(queueStateRes.body.counts.waiting, 0);
        assert.equal(queueStateRes.body.counts.inProgress, 0);
        assert.equal(queueStateRes.body.counts.completed, 1);

        const appointmentRes = await patientAgent
            .get(`/api/appointments/${appointmentId}`)
            .set('Authorization', `Bearer ${patientAccessToken}`);

        assert.equal(appointmentRes.status, 200, `appointment read failed: ${JSON.stringify(appointmentRes.body)}`);
        assert.equal(appointmentRes.body.data.status, 'completed');
    });

    test('doctor can reassign a pending appointment to the next available slot', async (t) => {
        if (!dbAvailable) {
            t.skip(`MongoDB unavailable for integration tests: ${dbConnectError?.message || 'unknown error'}`);
            return;
        }

        const doctorAgent = request.agent(app);
        const patientAgent = request.agent(app);
        const unique = Date.now();

        const doctorRegister = await registerUser(doctorAgent, {
            name: 'Reassign Doctor',
            email: `reassign.doctor.${unique}@example.com`,
            password: 'Password123!',
            role: 'doctor',
        });

        const patientRegister = await registerUser(patientAgent, {
            name: 'Reassign Patient',
            email: `reassign.patient.${unique}@example.com`,
            password: 'Password123!',
            role: 'patient',
        });

        const doctorAccessToken = doctorRegister.body.accessToken;
        const patientAccessToken = patientRegister.body.accessToken;

        const doctorConfigRes = await doctorAgent
            .post('/api/doctors/configure')
            .set('Authorization', `Bearer ${doctorAccessToken}`)
            .send({
                department: 'General Medicine',
                workingHours: { start: '09:00', end: '11:00' },
                breakSlots: [],
                defaultConsultTime: 15,
                maxPatientsPerDay: 20,
                workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
            });

        assert.equal(doctorConfigRes.status, 200, `doctor config failed: ${JSON.stringify(doctorConfigRes.body)}`);
        const doctorId = doctorConfigRes.body.doctor.id;

        const nextWorkingDay = new Date();
        nextWorkingDay.setUTCHours(0, 0, 0, 0);
        do {
            nextWorkingDay.setUTCDate(nextWorkingDay.getUTCDate() + 1);
        } while ([0, 6].includes(nextWorkingDay.getUTCDay()));
        const date = nextWorkingDay.toISOString().split('T')[0];

        const slotStart = new Date(`${date}T09:00:00.000Z`);
        const slotEnd = new Date(`${date}T09:15:00.000Z`);

        const bookingRes = await patientAgent
            .post('/api/appointments/book')
            .set('Authorization', `Bearer ${patientAccessToken}`)
            .send({
                doctorId,
                date,
                slotStart: slotStart.toISOString(),
                slotEnd: slotEnd.toISOString(),
            });

        assert.equal(bookingRes.status, 201, `booking failed: ${JSON.stringify(bookingRes.body)}`);
        const appointmentId = bookingRes.body.appointment._id;

        const reassignRes = await doctorAgent
            .post(`/api/appointments/${appointmentId}/reassign-next-available`)
            .set('Authorization', `Bearer ${doctorAccessToken}`)
            .send({});

        assert.equal(reassignRes.status, 200, `reassign failed: ${JSON.stringify(reassignRes.body)}`);
        assert.equal(reassignRes.body.appointment.status, 'waiting');
        assert.notEqual(
            new Date(reassignRes.body.appointment.slotStart).toISOString(),
            slotStart.toISOString(),
            'slotStart should change after reassignment'
        );
    });

    test('doctor schedule load auto-carries past pending appointments forward', async (t) => {
        if (!dbAvailable) {
            t.skip(`MongoDB unavailable for integration tests: ${dbConnectError?.message || 'unknown error'}`);
            return;
        }

        const doctorAgent = request.agent(app);
        const patientAgent = request.agent(app);
        const unique = Date.now();

        const doctorRegister = await registerUser(doctorAgent, {
            name: 'Auto Carry Doctor',
            email: `autocarry.doctor.${unique}@example.com`,
            password: 'Password123!',
            role: 'doctor',
        });

        const patientRegister = await registerUser(patientAgent, {
            name: 'Auto Carry Patient',
            email: `autocarry.patient.${unique}@example.com`,
            password: 'Password123!',
            role: 'patient',
        });

        const doctorAccessToken = doctorRegister.body.accessToken;
        const patientId = patientRegister.body.user.id;

        const doctorConfigRes = await doctorAgent
            .post('/api/doctors/configure')
            .set('Authorization', `Bearer ${doctorAccessToken}`)
            .send({
                department: 'General Medicine',
                workingHours: { start: '09:00', end: '11:00' },
                breakSlots: [],
                defaultConsultTime: 15,
                maxPatientsPerDay: 20,
                workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
            });

        assert.equal(doctorConfigRes.status, 200, `doctor config failed: ${JSON.stringify(doctorConfigRes.body)}`);
        const doctorId = doctorConfigRes.body.doctor.id;

        const previousWorkingDay = new Date();
        previousWorkingDay.setUTCHours(0, 0, 0, 0);
        do {
            previousWorkingDay.setUTCDate(previousWorkingDay.getUTCDate() - 1);
        } while ([0, 6].includes(previousWorkingDay.getUTCDay()));

        const pastSlotStart = new Date(`${previousWorkingDay.toISOString().split('T')[0]}T09:00:00.000Z`);
        const pastSlotEnd = new Date(`${previousWorkingDay.toISOString().split('T')[0]}T09:15:00.000Z`);

        const appointment = await Appointment.create({
            doctorId,
            patientId,
            date: previousWorkingDay,
            slotStart: pastSlotStart,
            slotEnd: pastSlotEnd,
            tokenNumber: 1,
            status: 'waiting',
        });

        await DailyQueue.create({
            doctorId,
            date: previousWorkingDay,
            currentToken: null,
            appointmentCount: 1,
            lastTokenNumber: 1,
            waitingList: [{
                appointmentId: appointment._id,
                tokenNumber: 1,
                status: 'waiting',
            }],
            status: 'active',
        });

        const scheduleRes = await doctorAgent
            .get('/api/doctors/my-schedule')
            .set('Authorization', `Bearer ${doctorAccessToken}`);

        assert.equal(scheduleRes.status, 200, `my-schedule failed: ${JSON.stringify(scheduleRes.body)}`);
        assert.equal(scheduleRes.body.autoReassignedAppointments, 1);

        const movedAppointment = await Appointment.findById(appointment._id).lean();
        assert.equal(movedAppointment.status, 'waiting');
        assert.ok(
            normalizeDate(movedAppointment.date).getTime() > normalizeDate(previousWorkingDay).getTime(),
            'appointment date should move to a future day'
        );
    });
}
