const mongoose = require('mongoose');
const MedicalRecord = require('../models/MedicalRecord');
const asyncHandler = require('../utils/asyncHandler');

exports.getPatientDoctors = asyncHandler(async (req, res) => {
    const patientId = req.user.userId;

    const doctors = await MedicalRecord.aggregate([
        { $match: { patientId: new mongoose.Types.ObjectId(patientId) } },
        {
            $group: {
                _id: '$doctorId',
                lastConsultationDate: { $max: '$date' },
            },
        },
        {
            $lookup: {
                from: 'doctors',
                localField: '_id',
                foreignField: '_id',
                as: 'doctor',
            },
        },
        { $unwind: '$doctor' },
        {
            $lookup: {
                from: 'users',
                localField: 'doctor.userId',
                foreignField: '_id',
                as: 'doctorUser',
            },
        },
        { $unwind: '$doctorUser' },
        {
            $project: {
                _id: 0,
                id: '$doctor._id',
                name: '$doctorUser.name',
                department: '$doctor.department',
                lastConsultationDate: 1,
            },
        },
        { $sort: { name: 1 } },
    ]);

    res.json({
        success: true,
        doctors,
    });
});

exports.getPatientMedicalRecords = asyncHandler(async (req, res) => {
    const patientId = req.user.userId;
    const { doctorId, month } = req.query;

    const filter = { patientId };
    if (doctorId) filter.doctorId = doctorId;

    if (month) {
        const [year, mon] = String(month).split('-').map((v) => parseInt(v, 10));
        if (!Number.isNaN(year) && !Number.isNaN(mon)) {
            const start = new Date(Date.UTC(year, mon - 1, 1));
            const end = new Date(Date.UTC(year, mon, 1));
            filter.date = { $gte: start, $lt: end };
        }
    }

    const records = await MedicalRecord.find(filter)
        .populate({ path: 'doctorId', populate: { path: 'userId', select: 'name' } })
        .sort({ date: -1 })
        .lean();

    const data = records.map((r) => ({
        id: r._id,
        doctorName: r.doctorId?.userId?.name || 'Unknown',
        department: r.doctorId?.department || '',
        complaint: r.chiefComplaint || '',
        diagnosis: r.diagnosis || '',
        consultationDate: r.date,
        medications: r.medications || [],
        vitals: r.vitals || {},
        labTests: r.labTests || [],
        followUp: r.followUp || null,
    }));

    res.json({
        success: true,
        records: data,
    });
});

exports.getPatientMedicalRecordById = asyncHandler(async (req, res) => {
    const patientId = req.user.userId;
    const { id } = req.params;

    const record = await MedicalRecord.findOne({ _id: id, patientId })
        .populate({ path: 'doctorId', populate: { path: 'userId', select: 'name' } })
        .lean();

    if (!record) {
        res.status(404);
        throw new Error('Record not found');
    }

    res.json({
        success: true,
        record: {
            id: record._id,
            doctorName: record.doctorId?.userId?.name || 'Unknown',
            department: record.doctorId?.department || '',
            consultationDate: record.date,
            complaint: record.chiefComplaint || '',
            diagnosis: record.diagnosis || '',
            vitals: record.vitals || {},
            medications: record.medications || [],
            labTests: record.labTests || [],
            followUp: record.followUp?.notes || record.followUp || '',
        },
    });
});
