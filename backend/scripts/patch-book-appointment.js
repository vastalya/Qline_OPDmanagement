/**
 * Patches appointmentController.js to remove MongoDB transactions from bookAppointment.
 * Transactions require a replica set. This version uses atomic findOneAndUpdate ops instead.
 */
const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, '..', 'controllers', 'appointmentController.js');
let c = fs.readFileSync(filePath, 'utf8');

const newBookFn = `const bookAppointment = asyncHandler(async (req, res) => {
    const { doctorId, date, slotStart, slotEnd } = req.body;
    const patientId = req.user.userId;

    const dateObj = new Date(date);
    const slotStartDate = new Date(slotStart);
    const slotEndDate = new Date(slotEnd);

    // 1. Fetch doctor
    const doctor = await Doctor.findById(doctorId);
    if (!doctor || !doctor.workingHours || !doctor.defaultConsultTime || !doctor.maxPatientsPerDay) {
        res.status(400);
        throw new Error('Doctor has not fully configured their schedule');
    }

    // 2. Normalize date
    const normalizedDate = normalizeDate(dateObj);

    // 3. Validate slot day matches
    const slotDay = normalizeDate(slotStartDate);
    if (slotDay.getTime() !== normalizedDate.getTime()) {
        res.status(400);
        throw new Error('Slot must be on the same day as booking date');
    }

    // 4. Validate time range
    if (slotEndDate <= slotStartDate) {
        res.status(400);
        throw new Error('Invalid slot time range');
    }

    // 5. Validate slot duration
    const duration = getSlotDuration(slotStartDate, slotEndDate);
    const expectedDuration = doctor.defaultConsultTime * 60 * 1000;
    if (Math.abs(duration - expectedDuration) > 1000) {
        res.status(400);
        throw new Error(\`Slot duration must be exactly \${doctor.defaultConsultTime} minutes\`);
    }

    // 6. Check not in past
    if (isInPast(slotStartDate)) {
        res.status(400);
        throw new Error('Cannot book appointments in the past');
    }

    // 7. Check slot not already booked (atomic: slot uniqueness via unique index)
    const existingSlot = await Appointment.findOne({
        doctorId,
        date: normalizedDate,
        slotStart: slotStartDate,
        status: { $in: ['booked', 'waiting', 'in_progress'] },
    });
    if (existingSlot) {
        res.status(409);
        throw new Error('This slot is no longer available');
    }

    // 8. Atomic increment queue count (upsert creates queue if not exists)
    const queue = await DailyQueue.findOneAndUpdate(
        {
            doctorId,
            date: normalizedDate,
            appointmentCount: { $lt: doctor.maxPatientsPerDay },
        },
        { $inc: { appointmentCount: 1, lastTokenNumber: 1 } },
        { new: true, upsert: true }
    );

    if (!queue) {
        res.status(400);
        throw new Error('Doctor has reached maximum appointments for this day');
    }

    const tokenNumber = queue.lastTokenNumber;

    // 9. Create the appointment
    let createdAppointment;
    try {
        createdAppointment = await Appointment.create({
            doctorId,
            patientId,
            date: normalizedDate,
            slotStart: slotStartDate,
            slotEnd: slotEndDate,
            tokenNumber,
            status: 'waiting',
        });
    } catch (err) {
        // Roll back the queue increment on failure
        await DailyQueue.findOneAndUpdate(
            { doctorId, date: normalizedDate },
            { $inc: { appointmentCount: -1, lastTokenNumber: -1 } }
        );
        if (err.code === 11000) {
            res.status(409);
            throw new Error('This slot is no longer available');
        }
        throw err;
    }

    // 10. Add to queue waiting list
    await DailyQueue.findOneAndUpdate(
        { doctorId, date: normalizedDate },
        {
            $push: {
                waitingList: {
                    appointmentId: createdAppointment._id,
                    tokenNumber,
                    status: 'waiting',
                },
            },
        }
    );

    // 11. Log queue events (best-effort)
    QueueEvent.create([
        {
            appointmentId: createdAppointment._id,
            doctorId,
            patientId,
            queueId: queue._id,
            event: 'created',
            timestamp: new Date(),
            metadata: { tokenNumber, estimatedWaitTime: 0 }
        },
        {
            appointmentId: createdAppointment._id,
            doctorId,
            patientId,
            queueId: queue._id,
            event: 'waiting',
            previousEvent: 'created',
            timestamp: new Date(),
            metadata: { tokenNumber, position: queue.appointmentCount }
        }
    ]).catch(() => {});

    // Notifications (best-effort)
    notificationService
        .sendAppointmentBookedNotification(createdAppointment, req.app.get('io'))
        .catch(() => {});

    res.status(201).json({
        success: true,
        appointment: createdAppointment,
        message: \`Appointment booked successfully. Token number: \${tokenNumber}\`,
    });
});`;

// Find and replace the bookAppointment function
const startMarker = 'const bookAppointment = asyncHandler(async (req, res) => {';
const startIdx = c.indexOf(startMarker);
if (startIdx === -1) {
    console.error('Could not find bookAppointment function');
    process.exit(1);
}

// Find the end: scan for "});" that closes the asyncHandler wrapper
let depth = 0;
let i = startIdx;
let foundEnd = -1;
while (i < c.length) {
    if (c[i] === '{') depth++;
    else if (c[i] === '}') {
        depth--;
        if (depth === 0) {
            // Check for ");" after this closing brace
            let j = i + 1;
            while (j < c.length && (c[j] === '\r' || c[j] === '\n' || c[j] === ' ')) j++;
            if (c[j] === ')') {
                j++;
                if (c[j] === ';') {
                    foundEnd = j + 1;
                    break;
                }
            }
        }
    }
    i++;
}

if (foundEnd === -1) {
    console.error('Could not find end of bookAppointment');
    process.exit(1);
}

c = c.slice(0, startIdx) + newBookFn + c.slice(foundEnd);
fs.writeFileSync(filePath, c, 'utf8');
console.log('Patched bookAppointment successfully - removed transactions');
