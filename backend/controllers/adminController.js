const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const DailyQueue = require('../models/DailyQueue');
const AuditLog = require('../models/AuditLog');
const SystemSetting = require('../models/SystemSetting');
const RefreshToken = require('../models/RefreshToken');
const DoctorSchedule = require('../models/DoctorSchedule');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');
const { syncDoctorSchedule } = require('../services/doctorScheduleService');
const { withOptionalTransaction } = require('../utils/transactionManager');

const withSession = (session) => (session ? { session } : {});

const DEFAULT_SYSTEM_SETTINGS = {
    hospitalName: 'Qline Medical Center',
    supportEmail: 'support@qline.app',
    timezone: 'Asia/Kolkata',
    defaultSlotDuration: 15,
    walkinPercentage: 20,
    bufferTime: 5,
    cancellationDeadlineHours: 2,
    noShowTimeoutMinutes: 15,
    sessionTimeoutMinutes: 60,
    requireIpWhitelist: false,
    ipWhitelist: [],
    emailProvider: 'smtp',
    notificationsEnabled: { appointmentBooked: true, appointmentReminder: true, queuePaused: true, doctorDelayed: true },
};

const getSystemSettings = async () => {
    const doc = await SystemSetting.findOne({ key: 'system' }).lean();
    if (!doc) return { ...DEFAULT_SYSTEM_SETTINGS };
    return {
        ...DEFAULT_SYSTEM_SETTINGS,
        ...(doc.settings || {}),
        notificationsEnabled: {
            ...DEFAULT_SYSTEM_SETTINGS.notificationsEnabled,
            ...((doc.settings || {}).notificationsEnabled || {}),
        },
    };
};

/**
 * Get system-wide statistics (admin only)
 * GET /api/admin/stats
 */
exports.getSystemStats = asyncHandler(async (req, res) => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);
    const monthStart = new Date();
    monthStart.setMonth(monthStart.getMonth() - 1);
    monthStart.setHours(0, 0, 0, 0);

    // Run all count queries in PARALLEL (was sequential - 8x slower)
    const [
        totalUsers, totalDoctors, totalPatients, totalAdmins,
        totalAppts, todayAppts, weekAppts, monthAppts,
        activeQueues, pausedQueues,
        completedAppts, cancelledAppts, noShowAppts
    ] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ role: 'doctor' }),
        User.countDocuments({ role: 'patient' }),
        User.countDocuments({ role: 'admin' }),
        Appointment.countDocuments(),
        Appointment.countDocuments({ date: { $gte: todayStart } }),
        Appointment.countDocuments({ date: { $gte: weekStart } }),
        Appointment.countDocuments({ date: { $gte: monthStart } }),
        DailyQueue.countDocuments({ date: { $gte: todayStart }, status: 'active' }),
        DailyQueue.countDocuments({ date: { $gte: todayStart }, status: 'paused' }),
        Appointment.countDocuments({ status: 'completed' }),
        Appointment.countDocuments({ status: 'cancelled' }),
        Appointment.countDocuments({ status: 'no_show' })
    ]);

    const stats = {
        users: { total: totalUsers, doctors: totalDoctors, patients: totalPatients, admins: totalAdmins },
        appointments: { total: totalAppts, today: todayAppts, thisWeek: weekAppts, thisMonth: monthAppts },
        queues: { activeToday: activeQueues, pausedToday: pausedQueues },
        appointmentStatus: { completed: completedAppts, cancelled: cancelledAppts, noShow: noShowAppts }
    };

    res.json({ success: true, stats });
});

/**
 * Get all users (paginated, admin only)
 * GET /api/admin/users
 */
exports.getUsers = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 20,
        role,
        search
    } = req.query;

    const skip = (page - 1) * limit;
    const query = {};

    if (role) {
        query.role = role;
    }

    if (search) {
        query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } }
        ];
    }

    const [users, total] = await Promise.all([
        User.find(query)
            .select('-password')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean(),
        User.countDocuments(query)
    ]);

    res.json({
        success: true,
        users,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
        }
    });
});

/**
 * Update user status (admin only)
 * PATCH /api/admin/users/:id/status
 */
exports.updateUserStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // 'active', 'suspended', etc.
    const allowedStatuses = ['active', 'suspended'];

    if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
            success: false,
            error: `Status must be one of: ${allowedStatuses.join(', ')}`
        });
    }

    const user = await withOptionalTransaction(async ({ session }) => {
        const existingUser = await User.findById(id, null, withSession(session)).select('-password');

        if (!existingUser) {
            res.status(404);
            throw new Error('User not found');
        }

        // Prevent admin from suspending themselves
        if (existingUser._id.toString() === req.user.userId) {
            res.status(400);
            throw new Error('You cannot change your own status');
        }

        existingUser.status = status;
        await existingUser.save(withSession(session));

        // Force re-login from all devices when status changes.
        await RefreshToken.deleteMany({ userId: existingUser._id }, withSession(session));

        return existingUser;
    });

    logger.info(`Admin ${req.user.userId} updated status of user ${id} to ${status}`);

    res.json({
        success: true,
        message: `User status updated to ${status}`,
        user
    });
});

/**
 * Get all doctors with stats (admin only)
 * GET /api/admin/doctors
 */
exports.getDoctors = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 20,
        department
    } = req.query;

    const skip = (page - 1) * limit;
    const query = {};

    if (department) {
        query.department = department;
    }

    const [doctors, total] = await Promise.all([
        Doctor.find(query)
            .populate('userId', 'name email createdAt')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean(),
        Doctor.countDocuments(query)
    ]);

    // Add appointment count for each doctor
    const doctorsWithStats = await Promise.all(
        doctors.map(async (doctor) => {
            const appointmentCount = await Appointment.countDocuments({
                doctorId: doctor._id
            });

            return {
                ...doctor, // already plain object from .lean()
                stats: {
                    totalAppointments: appointmentCount
                }
            };
        })
    );


    res.json({
        success: true,
        doctors: doctorsWithStats,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
        }
    });
});

/**
 * Get audit logs (admin only)
 * GET /api/admin/audit-logs
 */
exports.getAuditLogs = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 50,
        userId,
        action,
        entityType,
        startDate,
        endDate
    } = req.query;

    const skip = (page - 1) * limit;
    const query = {};

    if (userId) {
        query.userId = userId;
    }

    if (action) {
        query.action = action;
    }

    if (entityType) {
        query.entityType = entityType;
    }

    if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) {
            query.createdAt.$gte = new Date(startDate);
        }
        if (endDate) {
            query.createdAt.$lte = new Date(endDate);
        }
    }

    const logs = await AuditLog.find(query)
        .populate('userId', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

    const total = await AuditLog.countDocuments(query);

    logger.info(`Admin ${req.user.userId} accessed audit logs`);

    res.json({
        success: true,
        logs,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
        }
    });
});

/**
 * Get single user by ID (admin only)
 * GET /api/admin/users/:id
 */
exports.getUserById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user = await User.findById(id).select('-password').lean();
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    let doctorProfile = null;
    if (user.role === 'doctor') {
        doctorProfile = await Doctor.findOne({ userId: id }).lean();
    }

    const [totalAppointments, recentAuditLogs] = await Promise.all([
        user.role === 'patient' ? Appointment.countDocuments({ patientId: id }) :
        (user.role === 'doctor' && doctorProfile ? Appointment.countDocuments({ doctorId: doctorProfile._id }) : 0),
        AuditLog.find({ userId: id }).sort({ createdAt: -1 }).limit(10).lean()
    ]);

    res.json({ success: true, user, doctorProfile, stats: { totalAppointments }, recentAuditLogs });
});

/**
 * Get single doctor by ID with workload stats (admin only)
 * GET /api/admin/doctors/:id
 */
exports.getDoctorById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const doctor = await Doctor.findById(id).populate('userId', 'name email createdAt').lean();
    if (!doctor) return res.status(404).json({ success: false, error: 'Doctor not found' });

    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
    const today = new Date(); today.setHours(0,0,0,0);

    const [totalAppts, monthAppts, completedAppts, noShowAppts, todayQueue] = await Promise.all([
        Appointment.countDocuments({ doctorId: id }),
        Appointment.countDocuments({ doctorId: id, date: { $gte: monthStart } }),
        Appointment.countDocuments({ doctorId: id, status: 'completed' }),
        Appointment.countDocuments({ doctorId: id, status: 'no_show' }),
        DailyQueue.findOne({ doctorId: id, date: { $gte: today } }).lean()
    ]);

    res.json({
        success: true,
        doctor,
        stats: {
            totalAppointments: totalAppts,
            monthAppointments: monthAppts,
            completedAppointments: completedAppts,
            noShowAppointments: noShowAppts,
            noShowRate: totalAppts > 0 ? Math.round((noShowAppts / totalAppts) * 100) : 0,
        },
        todayQueue
    });
});

/**
 * Get system-wide analytics (admin only)
 * GET /api/admin/analytics
 */
exports.getAnalytics = asyncHandler(async (req, res) => {
    const { from, to } = req.query;
    const start = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = to ? new Date(to) : new Date();

    const [totalAppts, completedAppts, cancelledAppts, noShowAppts, totalPatients, totalDoctors, deptBreakdown] = await Promise.all([
        Appointment.countDocuments({ date: { $gte: start, $lte: end } }),
        Appointment.countDocuments({ date: { $gte: start, $lte: end }, status: 'completed' }),
        Appointment.countDocuments({ date: { $gte: start, $lte: end }, status: 'cancelled' }),
        Appointment.countDocuments({ date: { $gte: start, $lte: end }, status: 'no_show' }),
        User.countDocuments({ role: 'patient' }),
        User.countDocuments({ role: 'doctor' }),
        Doctor.aggregate([{ $group: { _id: '$department', count: { $sum: 1 } } }, { $sort: { count: -1 } }])
    ]);

    res.json({
        success: true,
        analytics: {
            period: { from: start, to: end },
            appointments: { total: totalAppts, completed: completedAppts, cancelled: cancelledAppts, noShow: noShowAppts },
            users: { patients: totalPatients, doctors: totalDoctors },
            departmentBreakdown: deptBreakdown.map(d => ({ department: d._id || 'Unknown', count: d.count })),
        }
    });
});

/**
 * Get live queue status across all doctors (admin only)
 * GET /api/admin/queues/live
 */
exports.getLiveQueues = asyncHandler(async (req, res) => {
    const today = new Date(); today.setHours(0, 0, 0, 0);

    const queues = await DailyQueue.find({ date: { $gte: today } })
        .populate({ path: 'doctorId', populate: { path: 'userId', select: 'name email' } })
        .lean();

    const result = queues.map(q => ({
        _id: q._id,
        doctor: {
            _id: q.doctorId?._id,
            name: q.doctorId?.userId?.name ?? 'Unknown',
            department: q.doctorId?.department ?? '-',
        },
        status: q.status,
        totalBooked: q.appointmentCount ?? 0,
        waitingCount: (q.waitingList || []).filter(item => item.status === 'waiting').length,
        completedCount: (q.waitingList || []).filter(item => item.status === 'completed').length,
        currentAppointment: (() => {
            const inProgress = (q.waitingList || []).find(item => ['in_progress', 'in_consultation'].includes(item.status));
            if (!inProgress) return null;
            return {
                appointmentId: inProgress.appointmentId,
                tokenNumber: inProgress.tokenNumber
            };
        })(),
        date: q.date,
    }));

    res.json({ success: true, queues: result });
});

/**
 * Get system settings (admin only)
 * GET /api/admin/settings
 */
exports.getSettings = asyncHandler(async (req, res) => {
    const settings = await getSystemSettings();
    res.json({ success: true, settings });
});

/**
 * Update system settings (admin only)
 * PUT /api/admin/settings
 */
exports.updateSettings = asyncHandler(async (req, res) => {
    const current = await getSystemSettings();
    const merged = {
        ...current,
        ...req.body,
        notificationsEnabled: {
            ...current.notificationsEnabled,
            ...(req.body?.notificationsEnabled || {}),
        },
    };

    await SystemSetting.findOneAndUpdate(
        { key: 'system' },
        { $set: { key: 'system', settings: merged } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    logger.info(`Admin ${req.user.userId} updated system settings`);
    res.json({ success: true, settings: merged });
});

/**
 * Admin create doctor directly
 * POST /api/admin/doctors
 */
exports.createDoctor = asyncHandler(async (req, res) => {
    const { name, email, password, department, phone, defaultConsultTime } = req.body;

    const { user, doctor } = await withOptionalTransaction(async ({ session }) => {
        const createdUser = new User({
            name,
            email,
            password,
            role: 'doctor',
            phone,
        });
        await createdUser.save(withSession(session));

        const createdDoctor = new Doctor({
            userId: createdUser._id,
            department: department || 'General',
            workingHours: { start: '09:00', end: '17:00' },
            defaultConsultTime: defaultConsultTime || 15,
            maxPatientsPerDay: 50,
            isConfigured: false,
        });
        await createdDoctor.save(withSession(session));
        await syncDoctorSchedule(createdDoctor, session);

        return {
            user: createdUser,
            doctor: createdDoctor,
        };
    });

    res.status(201).json({ success: true, user, doctor });
});

/**
 * Admin update doctor
 * PATCH /api/admin/doctors/:id
 */
exports.updateDoctor = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { department, defaultConsultTime } = req.body;
    
    const doctor = await Doctor.findByIdAndUpdate(
        id,
        { $set: { department, defaultConsultTime } },
        { new: true }
    );
    
    if (!doctor) {
        res.status(404);
        throw new Error('Doctor not found');
    }
    
    res.json({ success: true, doctor });
});

/**
 * Admin delete doctor
 * DELETE /api/admin/doctors/:id
 */
exports.deleteDoctor = asyncHandler(async (req, res) => {
    const { id } = req.params;

    await withOptionalTransaction(async ({ session }) => {
        const doctor = await Doctor.findById(id, null, withSession(session));
        if (!doctor) {
            res.status(404);
            throw new Error('Doctor not found');
        }

        await RefreshToken.deleteMany({ userId: doctor.userId }, withSession(session));
        await User.deleteOne({ _id: doctor.userId }, withSession(session));
        await Appointment.deleteMany({ doctorId: doctor._id }, withSession(session));
        await DailyQueue.deleteMany({ doctorId: doctor._id }, withSession(session));
        await DoctorSchedule.deleteOne({ doctorId: doctor._id }, withSession(session));
        await Doctor.deleteOne({ _id: id }, withSession(session));
    });

    res.json({ success: true, message: 'Doctor deleted' });
});
