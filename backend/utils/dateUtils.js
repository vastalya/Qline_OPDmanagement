/**
 * Date utility functions for UTC-based time handling
 * All dates are normalized to midnight UTC for consistency
 */

const DAY_NAMES = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
];

/**
 * Normalize a date to midnight UTC (00:00:00.000)
 * @param {Date|string} dateInput - Date to normalize
 * @returns {Date} - Normalized date at midnight UTC
 */
const normalizeDate = (dateInput) => {
    const d = new Date(dateInput);
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};

/**
 * Get weekday name for a date in UTC
 * @param {Date|string} dateInput
 * @returns {string}
 */
const getWeekdayName = (dateInput) => DAY_NAMES[normalizeDate(dateInput).getUTCDay()];

/**
 * Normalize a weekday label to the canonical full English name
 * @param {string} day
 * @returns {string|null}
 */
const normalizeWeekdayName = (day) => {
    if (!day || typeof day !== 'string') {
        return null;
    }

    const normalized = day.trim().toLowerCase();
    if (!normalized) {
        return null;
    }

    return DAY_NAMES.find((value) => {
        const lowerValue = value.toLowerCase();
        return lowerValue === normalized || lowerValue.slice(0, 3) === normalized.slice(0, 3);
    }) || null;
};

/**
 * Normalize a working-day array to canonical weekday names
 * @param {string[]} workingDays
 * @returns {string[]}
 */
const normalizeWorkingDays = (workingDays = []) => {
    const uniqueDays = new Set();

    for (const day of workingDays) {
        const normalized = normalizeWeekdayName(day);
        if (normalized) {
            uniqueDays.add(normalized);
        }
    }

    return DAY_NAMES.filter((day) => uniqueDays.has(day));
};

/**
 * Parse time string "HH:MM" to full Date object in UTC
 * @param {string} timeString - Time in "HH:MM" format
 * @param {Date} dateBase - Base date for the time
 * @returns {Date} - Full datetime in UTC
 */
const parseTimeString = (timeString, dateBase) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    return new Date(Date.UTC(
        dateBase.getUTCFullYear(),
        dateBase.getUTCMonth(),
        dateBase.getUTCDate(),
        hours,
        minutes
    ));
};

/**
 * Format Date to "HH:MM" string in UTC
 * @param {Date} date - Date to format
 * @returns {string} - Time in "HH:MM" format
 */
const formatTimeString = (date) => {
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
};

/**
 * Validate time format "HH:MM"
 * @param {string} timeString - Time string to validate
 * @returns {boolean} - True if valid format
 */
const validateTimeFormat = (timeString) => {
    const regex = /^([01]\d|2[0-3]):[0-5]\d$/;
    return regex.test(timeString);
};

/**
 * Check if date is in the past (UTC comparison)
 * @param {Date} date - Date to check
 * @returns {boolean} - True if date is in past
 */
const isInPast = (date) => {
    return date < new Date();
};

/**
 * Add minutes to a date (millisecond arithmetic, no floating point)
 * @param {Date} date - Starting date
 * @param {number} minutes - Minutes to add
 * @returns {Date} - New date with added minutes
 */
const addMinutes = (date, minutes) => {
    return new Date(date.getTime() + minutes * 60 * 1000);
};

/**
 * Get duration between two dates in milliseconds
 * @param {Date} start - Start date
 * @param {Date} end - End date
 * @returns {number} - Duration in milliseconds
 */
const getSlotDuration = (start, end) => {
    return end.getTime() - start.getTime();
};

/**
 * Check if two time ranges overlap
 * @param {Date} start1 - Start of first range
 * @param {Date} end1 - End of first range
 * @param {Date} start2 - Start of second range
 * @param {Date} end2 - End of second range
 * @returns {boolean} - True if ranges overlap
 */
const hasOverlap = (start1, end1, start2, end2) => {
    return start1 < end2 && start2 < end1;
};

/**
 * Validate break slots don't overlap and are within working hours
 * @param {Array} breakSlots - Array of break slot objects with start/end
 * @param {Object} workingHours - Object with start/end time strings
 * @throws {Error} - If breaks overlap or outside working hours
 */
const validateBreakSlots = (breakSlots, workingHours) => {
    if (!breakSlots || breakSlots.length === 0) {
        return;
    }

    // Sort breaks by start time
    const sorted = [...breakSlots].sort((a, b) =>
        a.start.localeCompare(b.start)
    );

    // Check each break is within working hours
    for (const br of sorted) {
        if (br.start < workingHours.start || br.end > workingHours.end) {
            throw new Error('Break slots must be within working hours');
        }
        if (br.start >= br.end) {
            throw new Error('Break end time must be after start time');
        }
    }

    // Check for overlaps between consecutive breaks
    for (let i = 0; i < sorted.length - 1; i++) {
        if (sorted[i].end > sorted[i + 1].start) {
            throw new Error('Break slots cannot overlap with each other');
        }
    }
};

/**
 * Check if two dates are the same day in UTC
 * @param {Date} date1 - First date
 * @param {Date} date2 - Second date
 * @returns {boolean} - True if same day
 */
const isSameDay = (date1, date2) => {
    return (
        date1.getUTCFullYear() === date2.getUTCFullYear() &&
        date1.getUTCMonth() === date2.getUTCMonth() &&
        date1.getUTCDate() === date2.getUTCDate()
    );
};

/**
 * Check whether a normalized UTC date falls inside an inclusive UTC date range
 * @param {Date|string} date
 * @param {Date|string|null} start
 * @param {Date|string|null} end
 * @returns {boolean}
 */
const isDateWithinRange = (date, start, end) => {
    if (!start || !end) {
        return false;
    }

    const value = normalizeDate(date).getTime();
    const rangeStart = normalizeDate(start).getTime();
    const rangeEnd = normalizeDate(end).getTime();

    return value >= rangeStart && value <= rangeEnd;
};

module.exports = {
    DAY_NAMES,
    normalizeDate,
    getWeekdayName,
    normalizeWeekdayName,
    normalizeWorkingDays,
    parseTimeString,
    formatTimeString,
    validateTimeFormat,
    isInPast,
    addMinutes,
    getSlotDuration,
    hasOverlap,
    validateBreakSlots,
    isSameDay,
    isDateWithinRange,
};
