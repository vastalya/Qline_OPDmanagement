const Doctor = require('../models/Doctor');
const DailyQueue = require('../models/DailyQueue');
const Appointment = require('../models/Appointment');
const { normalizeDate } = require('../utils/dateUtils');
const logger = require('../utils/logger');

/**
 * Search doctors with advanced filters
 */
exports.searchDoctors = async (filters = {}) => {
    try {
        const {
            query = '',
            department,
            minRating = 0,
            availability, // 'today', 'tomorrow', 'this_week'
            maxWaitTime,
            page = 1,
            limit = 20
        } = filters;

        const skip = (page - 1) * limit;

        // Build aggregation pipeline
        const pipeline = [];

        // Stage 1: Lookup user details
        pipeline.push({
            $lookup: {
                from: 'users',
                localField: 'userId',
                foreignField: '_id',
                as: 'user'
            }
        });

        pipeline.push({ $unwind: '$user' });

        // Stage 2: Match filters
        const matchStage = {
            $match: {}
        };

        // Name search
        if (query) {
            matchStage.$match['user.name'] = { $regex: query, $options: 'i' };
        }

        // Department filter
        if (department) {
            matchStage.$match.department = department;
        }

        // Only show fully configured doctors
        matchStage.$match.workingHours = { $exists: true };
        matchStage.$match.defaultConsultTime = { $exists: true };
        matchStage.$match.maxPatientsPerDay = { $exists: true };

        if (Object.keys(matchStage.$match).length > 0) {
            pipeline.push(matchStage);
        }

        // Stage 3: Get current queue stats
        const today = normalizeDate(new Date());
        pipeline.push({
            $lookup: {
                from: 'dailyqueues',
                let: { doctorId: '$_id' },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ['$doctorId', '$$doctorId'] },
                                    { $eq: ['$date', today] }
                                ]
                            }
                        }
                    }
                ],
                as: 'todayQueue'
            }
        });

        // Stage 4: Calculate ratings (placeholder - would need separate ratings collection)
        pipeline.push({
            $addFields: {
                todayQueue: { $arrayElemAt: ['$todayQueue', 0] },
                averageRating: 4.5, // Placeholder
                totalRatings: 100 // Placeholder
            }
        });

        // Stage 5: Calculate current wait time
        pipeline.push({
            $addFields: {
                currentWaitTime: {
                    $cond: {
                        if: { $gte: ['$todayQueue.waitingList', null] },
                        then: {
                            $multiply: [
                                { $size: { $ifNull: ['$todayQueue.waitingList', []] } },
                                '$defaultConsultTime'
                            ]
                        },
                        else: 0
                    }
                },
                waitingCount: {
                    $size: { $ifNull: ['$todayQueue.waitingList', []] }
                }
            }
        });

        // Stage 6: Filter by rating
        if (minRating > 0) {
            pipeline.push({
                $match: {
                    averageRating: { $gte: minRating }
                }
            });
        }

        // Stage 7: Filter by wait time
        if (maxWaitTime) {
            pipeline.push({
                $match: {
                    currentWaitTime: { $lte: parseInt(maxWaitTime) }
                }
            });
        }

        // Stage 8: Project final fields
        pipeline.push({
            $project: {
                _id: 1,
                userId: '$user._id',
                name: '$user.name',
                email: '$user.email',
                department: 1,
                specialty: 1,
                qualification: 1,
                experience: 1,
                workingHours: 1,
                defaultConsultTime: 1,
                maxPatientsPerDay: 1,
                averageRating: 1,
                totalRatings: 1,
                currentWaitTime: 1,
                waitingCount: 1,
                queueStatus: { $ifNull: ['$todayQueue.status', 'inactive'] }
            }
        });

        // Stage 9: Sort by rating (default)
        pipeline.push({
            $sort: { averageRating: -1, waitingCount: 1 }
        });

        // Get total count
        const countPipeline = [...pipeline];
        countPipeline.push({ $count: 'total' });
        const countResult = await Doctor.aggregate(countPipeline);
        const total = countResult.length > 0 ? countResult[0].total : 0;

        // Add pagination
        pipeline.push({ $skip: skip });
        pipeline.push({ $limit: limit });

        const doctors = await Doctor.aggregate(pipeline);

        return {
            doctors,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };

    } catch (error) {
        logger.error('Error searching doctors:', error);
        throw error;
    }
};

/**
 * Get doctor profile with comprehensive stats
 */
exports.getDoctorProfile = async (doctorId) => {
    try {
        const doctor = await Doctor.findById(doctorId).populate('userId', 'name email');

        if (!doctor) {
            throw new Error('Doctor not found');
        }

        // Get today's queue
        const today = normalizeDate(new Date());
        const todayQueue = await DailyQueue.findOne({
            doctorId,
            date: today
        });

        // Calculate next available slot (simplified)
        let nextAvailable = null;
        if (doctor.workingHours && todayQueue) {
            const waiting = todayQueue.waitingList?.filter(w => w.status === 'waiting').length || 0;
            const estimatedWaitTime = waiting * doctor.defaultConsultTime;
            nextAvailable = {
                date: today,
                estimatedWaitTime
            };
        }

        // Get appointment statistics
        const totalAppointments = await Appointment.countDocuments({ doctorId });
        const completedAppointments = await Appointment.countDocuments({
            doctorId,
            status: 'completed'
        });

        return {
            _id: doctor._id,
            userId: doctor.userId._id,
            name: doctor.userId.name,
            email: doctor.userId.email,
            department: doctor.department,
            specialty: doctor.specialty,
            qualification: doctor.qualification,
            experience: doctor.experience,
            workingHours: doctor.workingHours,
            breakSlots: doctor.breakSlots,
            defaultConsultTime: doctor.defaultConsultTime,
            maxPatientsPerDay: doctor.maxPatientsPerDay,
            currentQueue: {
                status: todayQueue?.status || 'inactive',
                waiting: todayQueue?.waitingList?.filter(w => w.status === 'waiting').length || 0,
                currentToken: todayQueue?.currentToken || 0
            },
            nextAvailable,
            stats: {
                totalAppointments,
                completedAppointments,
                averageRating: 4.5, // Placeholder
                totalRatings: 100 // Placeholder
            }
        };

    } catch (error) {
        logger.error('Error getting doctor profile:', error);
        throw error;
    }
};

/**
 * Get available doctors for immediate appointment
 */
exports.getAvailableDoctors = async () => {
    try {
        const today = normalizeDate(new Date());
        const currentHour = new Date().getUTCHours();
        const currentMinute = new Date().getUTCMinutes();
        const currentTime = currentHour * 60 + currentMinute;

        const pipeline = [
            // Lookup user details
            {
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            { $unwind: '$user' },

            // Only configured doctors
            {
                $match: {
                    workingHours: { $exists: true },
                    defaultConsultTime: { $exists: true }
                }
            },

            // Lookup today's queue
            {
                $lookup: {
                    from: 'dailyqueues',
                    let: { doctorId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$doctorId', '$$doctorId'] },
                                        { $eq: ['$date', today] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: 'todayQueue'
                }
            },

            {
                $addFields: {
                    todayQueue: { $arrayElemAt: ['$todayQueue', 0] }
                }
            },

            // Filter only active queues with capacity
            {
                $match: {
                    'todayQueue.status': 'active',
                    $expr: {
                        $lt: ['$todayQueue.appointmentCount', '$maxPatientsPerDay']
                    }
                }
            },

            // Project
            {
                $project: {
                    name: '$user.name',
                    department: 1,
                    workingHours: 1,
                    defaultConsultTime: 1,
                    waitingCount: { $size: { $ifNull: ['$todayQueue.waitingList', []] } },
                    queueStatus: '$todayQueue.status'
                }
            },

            { $sort: { waitingCount: 1 } },
            { $limit: 10 }
        ];

        const doctors = await Doctor.aggregate(pipeline);
        return doctors;

    } catch (error) {
        logger.error('Error getting available doctors:', error);
        throw error;
    }
};
