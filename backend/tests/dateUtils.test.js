const test = require('node:test');
const assert = require('node:assert/strict');
const {
    getWeekdayName,
    normalizeWeekdayName,
    normalizeWorkingDays,
    normalizeDate,
    parseTimeString,
    formatTimeString,
    validateTimeFormat,
    addMinutes,
    getSlotDuration,
    hasOverlap,
    validateBreakSlots,
    isSameDay,
    isDateWithinRange,
} = require('../utils/dateUtils');

test('normalizeDate returns midnight UTC for input date', () => {
    const normalized = normalizeDate('2026-03-09T17:45:30.000Z');
    assert.equal(normalized.toISOString(), '2026-03-09T00:00:00.000Z');
});

test('parseTimeString and formatTimeString roundtrip', () => {
    const base = new Date('2026-03-09T00:00:00.000Z');
    const parsed = parseTimeString('14:30', base);
    assert.equal(parsed.toISOString(), '2026-03-09T14:30:00.000Z');
    assert.equal(formatTimeString(parsed), '14:30');
});

test('validateTimeFormat enforces HH:MM', () => {
    assert.equal(validateTimeFormat('09:15'), true);
    assert.equal(validateTimeFormat('23:59'), true);
    assert.equal(validateTimeFormat('24:00'), false);
    assert.equal(validateTimeFormat('9:15'), false);
    assert.equal(validateTimeFormat('12:60'), false);
});

test('addMinutes and getSlotDuration produce expected values', () => {
    const start = new Date('2026-03-09T10:00:00.000Z');
    const end = addMinutes(start, 20);
    assert.equal(end.toISOString(), '2026-03-09T10:20:00.000Z');
    assert.equal(getSlotDuration(start, end), 20 * 60 * 1000);
});

test('hasOverlap detects overlapping ranges', () => {
    const aStart = new Date('2026-03-09T10:00:00.000Z');
    const aEnd = new Date('2026-03-09T10:20:00.000Z');
    const bStart = new Date('2026-03-09T10:15:00.000Z');
    const bEnd = new Date('2026-03-09T10:35:00.000Z');
    const cStart = new Date('2026-03-09T10:21:00.000Z');
    const cEnd = new Date('2026-03-09T10:40:00.000Z');

    assert.equal(hasOverlap(aStart, aEnd, bStart, bEnd), true);
    assert.equal(hasOverlap(aStart, aEnd, cStart, cEnd), false);
});

test('validateBreakSlots accepts valid, rejects overlapping/outside breaks', () => {
    const workingHours = { start: '09:00', end: '17:00' };

    assert.doesNotThrow(() => validateBreakSlots(
        [
            { start: '11:00', end: '11:15' },
            { start: '13:00', end: '13:30' },
        ],
        workingHours
    ));

    assert.throws(
        () => validateBreakSlots(
            [
                { start: '10:00', end: '10:30' },
                { start: '10:20', end: '10:45' },
            ],
            workingHours
        ),
        /cannot overlap/i
    );

    assert.throws(
        () => validateBreakSlots(
            [{ start: '08:50', end: '09:10' }],
            workingHours
        ),
        /within working hours/i
    );
});

test('isSameDay compares dates in UTC day space', () => {
    const d1 = new Date('2026-03-09T00:10:00.000Z');
    const d2 = new Date('2026-03-09T23:59:59.000Z');
    const d3 = new Date('2026-03-10T00:00:00.000Z');

    assert.equal(isSameDay(d1, d2), true);
    assert.equal(isSameDay(d1, d3), false);
});

test('weekday helpers normalize and order working days', () => {
    assert.equal(getWeekdayName('2026-03-09T08:00:00.000Z'), 'Monday');
    assert.equal(normalizeWeekdayName('thu'), 'Thursday');
    assert.equal(normalizeWeekdayName('Sunday'), 'Sunday');
    assert.deepEqual(
        normalizeWorkingDays(['fri', 'monday', 'Wed', 'invalid']),
        ['Monday', 'Wednesday', 'Friday']
    );
});

test('isDateWithinRange checks inclusive UTC date ranges', () => {
    assert.equal(
        isDateWithinRange('2026-03-11T15:00:00.000Z', '2026-03-10T00:00:00.000Z', '2026-03-12T23:59:59.000Z'),
        true
    );
    assert.equal(
        isDateWithinRange('2026-03-13T00:00:00.000Z', '2026-03-10T00:00:00.000Z', '2026-03-12T23:59:59.000Z'),
        false
    );
});
