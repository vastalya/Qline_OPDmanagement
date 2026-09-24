const test = require('node:test');
const assert = require('node:assert/strict');

const {
    getNormalizedWorkingDays,
    isDoctorInactiveOnDate,
    getDoctorAvailabilityForDate,
} = require('../services/slotService');

const baseDoctor = {
    isConfigured: true,
    workingHours: { start: '09:00', end: '17:00' },
    defaultConsultTime: 10,
    maxPatientsPerDay: 20,
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    breakSlots: [],
    isActive: true,
    inactiveFrom: null,
    inactiveUntil: null,
    inactiveReason: '',
};

test('getNormalizedWorkingDays falls back to weekdays when schedule is empty', () => {
    assert.deepEqual(
        getNormalizedWorkingDays({ workingDays: [] }),
        ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    );
});

test('isDoctorInactiveOnDate respects bounded inactive windows', () => {
    const doctor = {
        ...baseDoctor,
        isActive: false,
        inactiveFrom: new Date('2026-03-10T00:00:00.000Z'),
        inactiveUntil: new Date('2026-03-12T00:00:00.000Z'),
    };

    assert.equal(isDoctorInactiveOnDate(doctor, new Date('2026-03-11T12:00:00.000Z')), true);
    assert.equal(isDoctorInactiveOnDate(doctor, new Date('2026-03-14T12:00:00.000Z')), false);
});

test('getDoctorAvailabilityForDate blocks non-working days', () => {
    const doctor = { ...baseDoctor };
    const availability = getDoctorAvailabilityForDate(doctor, new Date('2026-03-08T12:00:00.000Z'));

    assert.equal(availability.available, false);
    assert.equal(availability.reasonCode, 'non_working_day');
});

test('getDoctorAvailabilityForDate blocks inactive dates and exposes reason', () => {
    const doctor = {
        ...baseDoctor,
        isActive: false,
        inactiveFrom: new Date('2026-03-10T00:00:00.000Z'),
        inactiveUntil: new Date('2026-03-12T00:00:00.000Z'),
        inactiveReason: 'Medical conference',
    };

    const availability = getDoctorAvailabilityForDate(doctor, new Date('2026-03-11T12:00:00.000Z'));

    assert.equal(availability.available, false);
    assert.equal(availability.reasonCode, 'doctor_inactive');
    assert.match(availability.message, /Medical conference/);
});

test('getDoctorAvailabilityForDate allows configured working day outside inactive window', () => {
    const doctor = { ...baseDoctor };
    const availability = getDoctorAvailabilityForDate(doctor, new Date('2026-03-09T12:00:00.000Z'));

    assert.equal(availability.available, true);
    assert.equal(availability.reasonCode, 'available');
    assert.equal(availability.dayName, 'Monday');
});
