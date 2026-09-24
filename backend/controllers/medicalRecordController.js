const MedicalRecord = require('../models/MedicalRecord');
const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');
const { withOptionalTransaction } = require('../utils/transactionManager');

const withSession = (session) => (session ? { session } : {});

/**
 * Create medical record (doctor only)
 * POST /api/medical-records
 */
exports.createRecord = asyncHandler(async (req, res) => {
    const doctorUserId = req.user.userId;
    const {
        appointmentId,
        chiefComplaint,
        symptoms,
        diagnosis,
        notes,
        medications,
        labTests,
        vitals,
        followUp
    } = req.body;

    const record = await withOptionalTransaction(async ({ session }) => {
        // Fetch appointment with doctor populated
        const appointment = await Appointment.findById(appointmentId)
            .populate({ path: 'doctorId', populate: { path: 'userId' } })
            .session(session || null);

        if (!appointment) {
            res.status(404);
            throw new Error('Appointment not found');
        }

        // Verify doctor owns this appointment
        if (appointment.doctorId.userId._id.toString() !== doctorUserId) {
            res.status(403);
            throw new Error('You are not authorized to create a record for this appointment');
        }

        // Check if record already exists
        const existingRecord = await MedicalRecord.findOne({ appointmentId }, null, withSession(session));
        if (existingRecord) {
            res.status(400);
            throw new Error('Medical record already exists for this appointment');
        }

        const createdRecord = new MedicalRecord({
            patientId: appointment.patientId,
            doctorId: appointment.doctorId._id,
            appointmentId,
            date: appointment.date,
            chiefComplaint,
            symptoms,
            diagnosis,
            notes,
            medications,
            labTests,
            vitals,
            followUp
        });
        await createdRecord.save(withSession(session));

        // Update appointment status to completed
        appointment.status = 'completed';
        await appointment.save(withSession(session));

        return createdRecord;
    });

    logger.info(`Medical record created for appointment ${appointmentId}`);

    res.status(201).json({
        success: true,
        record
    });
});

/**
 * Get doctor's patient roster
 * GET /api/medical-records/doctor/patients
 */
exports.getDoctorPatients = asyncHandler(async (req, res) => {
    const doctor = await Doctor.findOne({ userId: req.user.userId }).lean();
    if (!doctor) {
        return res.status(404).json({
            success: false,
            error: 'Doctor profile not found',
        });
    }

    const [appointments, records] = await Promise.all([
        Appointment.find({ doctorId: doctor._id })
            .populate('patientId', 'name email phone')
            .sort({ date: -1, slotStart: -1, createdAt: -1 })
            .lean(),
        MedicalRecord.find({ doctorId: doctor._id })
            .populate('patientId', 'name email phone')
            .sort({ date: -1, createdAt: -1 })
            .lean(),
    ]);

    const patientMap = new Map();

    appointments.forEach((appointment) => {
        const patient = appointment.patientId;
        if (!patient?._id) {
            return;
        }

        const patientKey = patient._id.toString();
        const existing = patientMap.get(patientKey);

        if (!existing) {
            patientMap.set(patientKey, {
                patientId: patient._id,
                name: patient.name,
                email: patient.email,
                phone: patient.phone,
                totalVisits: 0,
                totalRecords: 0,
                lastVisitDate: appointment.slotStart || appointment.date,
                lastAppointmentStatus: appointment.status,
                lastAppointmentId: appointment._id,
                lastTokenNumber: appointment.tokenNumber,
                latestRecordId: null,
                latestDiagnosis: '',
                latestComplaint: '',
            });
        }

        const entry = patientMap.get(patientKey);
        entry.totalVisits += 1;

        if (!entry.lastVisitDate || new Date(appointment.slotStart || appointment.date) > new Date(entry.lastVisitDate)) {
            entry.lastVisitDate = appointment.slotStart || appointment.date;
            entry.lastAppointmentStatus = appointment.status;
            entry.lastAppointmentId = appointment._id;
            entry.lastTokenNumber = appointment.tokenNumber;
        }
    });

    records.forEach((record) => {
        const patient = record.patientId;
        if (!patient?._id) {
            return;
        }

        const patientKey = patient._id.toString();
        if (!patientMap.has(patientKey)) {
            patientMap.set(patientKey, {
                patientId: patient._id,
                name: patient.name,
                email: patient.email,
                phone: patient.phone,
                totalVisits: 0,
                totalRecords: 0,
                lastVisitDate: record.date,
                lastAppointmentStatus: null,
                lastAppointmentId: null,
                lastTokenNumber: null,
                latestRecordId: null,
                latestDiagnosis: '',
                latestComplaint: '',
            });
        }

        const entry = patientMap.get(patientKey);
        entry.totalRecords += 1;

        if (!entry.latestRecordId) {
            entry.latestRecordId = record._id;
            entry.latestDiagnosis = record.diagnosis || '';
            entry.latestComplaint = record.chiefComplaint || '';
        }

        if (!entry.lastVisitDate || new Date(record.date) > new Date(entry.lastVisitDate)) {
            entry.lastVisitDate = record.date;
        }
    });

    const patients = Array.from(patientMap.values()).sort((a, b) => {
        const aTime = a.lastVisitDate ? new Date(a.lastVisitDate).getTime() : 0;
        const bTime = b.lastVisitDate ? new Date(b.lastVisitDate).getTime() : 0;
        if (bTime !== aTime) {
            return bTime - aTime;
        }
        return (a.name || '').localeCompare(b.name || '');
    });

    res.json({
        success: true,
        patients,
    });
});

/**
 * Get doctor's appointment + record history for one patient
 * GET /api/medical-records/doctor/patients/:patientId/history
 */
exports.getDoctorPatientTimeline = asyncHandler(async (req, res) => {
    const doctor = await Doctor.findOne({ userId: req.user.userId }).lean();
    if (!doctor) {
        return res.status(404).json({
            success: false,
            error: 'Doctor profile not found',
        });
    }

    const { patientId } = req.params;

    const [patient, appointments, records] = await Promise.all([
        User.findById(patientId).select('name email phone').lean(),
        Appointment.find({ doctorId: doctor._id, patientId })
            .sort({ date: -1, slotStart: -1, createdAt: -1 })
            .lean(),
        MedicalRecord.find({ doctorId: doctor._id, patientId })
            .populate('appointmentId', 'tokenNumber slotStart slotEnd status')
            .sort({ date: -1, createdAt: -1 })
            .lean(),
    ]);

    if (!patient) {
        return res.status(404).json({
            success: false,
            error: 'Patient not found',
        });
    }

    const summary = {
        totalAppointments: appointments.length,
        completedAppointments: appointments.filter((appointment) => appointment.status === 'completed').length,
        activeAppointments: appointments.filter((appointment) => ['booked', 'waiting', 'in_progress', 'in_consultation'].includes(appointment.status)).length,
        noShowAppointments: appointments.filter((appointment) => appointment.status === 'no_show').length,
        cancelledAppointments: appointments.filter((appointment) => appointment.status === 'cancelled').length,
        totalRecords: records.length,
        lastVisitDate: appointments[0]?.slotStart || appointments[0]?.date || records[0]?.date || null,
    };

    res.json({
        success: true,
        patient,
        summary,
        appointments,
        records,
    });
});

/**
 * Get doctor's own medical records
 * GET /api/medical-records/doctor
 */
exports.getDoctorRecords = asyncHandler(async (req, res) => {
    const doctor = await Doctor.findOne({ userId: req.user.userId }).lean();
    if (!doctor) {
        return res.status(404).json({
            success: false,
            error: 'Doctor profile not found',
        });
    }

    const { patientId } = req.query;
    const filter = { doctorId: doctor._id };
    if (patientId) {
        filter.patientId = patientId;
    }

    const records = await MedicalRecord.find(filter)
        .populate('patientId', 'name email')
        .populate('appointmentId', 'tokenNumber slotStart')
        .sort({ date: -1, createdAt: -1 })
        .lean();

    res.json({
        success: true,
        records,
    });
});

/**
 * Get patient medical history (doctor or patient themselves)
 * GET /api/medical-records/patient/:patientId
 */
exports.getPatientHistory = asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const { patientId } = req.params;
    const filter = { patientId };

    // Patients can only view their own records
    if (req.user.role === 'patient' && userId !== patientId) {
        return res.status(403).json({
            success: false,
            error: 'You can only view your own medical records'
        });
    }

    if (req.user.role === 'doctor') {
        const doctor = await Doctor.findOne({ userId }).lean();
        if (!doctor) {
            return res.status(404).json({
                success: false,
                error: 'Doctor profile not found',
            });
        }
        filter.doctorId = doctor._id;
    }

    const records = await MedicalRecord.find(filter)
        .populate('doctorId')
        .populate({ path: 'doctorId', populate: { path: 'userId', select: 'name email' } })
        .populate('patientId', 'name email')
        .populate({ path: 'appointmentId', select: 'tokenNumber slotStart' })
        .sort({ date: -1 });

    res.json({
        success: true,
        count: records.length,
        records
    });
});

/**
 * Get my medical history (patient only)
 * GET /api/medical-records/my-history
 */
exports.getMyHistory = asyncHandler(async (req, res) => {
    const patientId = req.user.userId;

    const records = await MedicalRecord.find({ patientId })
        .populate({ path: 'doctorId', populate: { path: 'userId', select: 'name email' } })
        .populate({ path: 'appointmentId', select: 'date slotStart slotEnd tokenNumber' })
        .sort({ date: -1 });

    res.json({
        success: true,
        count: records.length,
        records
    });
});

/**
 * Get single medical record
 * GET /api/medical-records/:id
 */
exports.getRecord = asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const { id } = req.params;

    const record = await MedicalRecord.findById(id)
        .populate({ path: 'doctorId', populate: { path: 'userId', select: 'name email' } })
        .populate('patientId', 'name email')
        .populate('appointmentId');

    if (!record) {
        return res.status(404).json({
            success: false,
            error: 'Medical record not found'
        });
    }

    // Check authorization - doctor who created it or patient
    const isDoctorOwner = record.doctorId.userId._id.toString() === userId;
    const isPatientOwner = record.patientId._id.toString() === userId;

    if (!isDoctorOwner && !isPatientOwner) {
        return res.status(403).json({
            success: false,
            error: 'You are not authorized to view this record'
        });
    }

    res.json({
        success: true,
        record
    });
});

/**
 * Update medical record (doctor only, own records only)
 * PATCH /api/medical-records/:id
 */
exports.updateRecord = asyncHandler(async (req, res) => {
    const doctorUserId = req.user.userId;
    const { id } = req.params;

    const record = await MedicalRecord.findById(id)
        .populate({ path: 'doctorId', populate: { path: 'userId' } });

    if (!record) {
        return res.status(404).json({
            success: false,
            error: 'Medical record not found'
        });
    }

    // Verify doctor owns this record
    if (record.doctorId.userId._id.toString() !== doctorUserId) {
        return res.status(403).json({
            success: false,
            error: 'You can only update your own medical records'
        });
    }

    if (req.body.deleted === true) {
        await MedicalRecord.deleteOne({ _id: id });
        logger.info(`Medical record ${id} deleted by doctor ${doctorUserId}`);
        return res.json({
            success: true,
            message: 'Medical record deleted',
        });
    }

    // Update allowed fields
    const allowedUpdates = [
        'chiefComplaint',
        'symptoms',
        'diagnosis',
        'notes',
        'medications',
        'labTests',
        'vitals',
        'followUp'
    ];

    allowedUpdates.forEach(field => {
        if (req.body[field] !== undefined) {
            record[field] = req.body[field];
        }
    });

    await record.save();

    logger.info(`Medical record ${id} updated by doctor ${doctorUserId}`);

    res.json({
        success: true,
        record
    });
});
