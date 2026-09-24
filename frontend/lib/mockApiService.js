'use client';

// Mock API Service for Demo
// Provides realistic test data for all endpoints

const mockUsers = {
    patient1: {
        _id: 'patient1_id',
        email: 'patient1@test.com',
        name: 'John Patient',
        firstName: 'John',
        lastName: 'Patient',
        role: 'patient',
        phone: '+1234567890',
        avatar: null,
    },
    patient2: {
        _id: 'patient2_id',
        email: 'patient2@test.com',
        name: 'Jane Doe',
        firstName: 'Jane',
        lastName: 'Doe',
        role: 'patient',
        phone: '+1987654321',
    },
    doctor: {
        _id: 'doctor_id',
        email: 'doctor@test.com',
        name: 'Dr. Smith',
        firstName: 'Dr.',
        lastName: 'Smith',
        role: 'doctor',
        phone: '+1111111111',
    },
    admin: {
        _id: 'admin_id',
        email: 'admin@test.com',
        name: 'Admin User',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        phone: '+2222222222',
    },
};

const mockDoctors = [
    {
        _id: 'doc1',
        userId: mockUsers.doctor._id,
        user: mockUsers.doctor,
        name: 'Dr. Ahmed Smith',
        specialization: 'General Practitioner',
        department: 'General Medicine',
        phone: '+1111111111',
        email: 'ahmed.smith@hospital.com',
        rating: 4.8,
        reviews: 127,
        qualifications: ['MBBS', 'MD'],
        experience: 12,
        defaultConsultTime: 15,
        workingHours: {
            start: '09:00',
            end: '17:00',
        },
        nextAvailableSlot: new Date(Date.now() + 3600000).toISOString(),
        maxPatientsPerDay: 20,
        waitingTime: {
            estimatedWaitMinutes: 25,
            patientsInQueue: 3,
            averageConsultationTime: 15,
            description: '25 min wait • 3 in queue'
        }
    },
    {
        _id: 'doc2',
        userId: 'doctor2_id',
        user: { _id: 'doctor2_id', name: 'Dr. Fatima Khan', email: 'fatima.khan@hospital.com' },
        name: 'Dr. Fatima Khan',
        specialization: 'Cardiologist',
        department: 'Cardiology',
        phone: '+1222222222',
        email: 'fatima.khan@hospital.com',
        rating: 4.9,
        reviews: 245,
        qualifications: ['MBBS', 'MD', 'DM Cardiology'],
        experience: 15,
        defaultConsultTime: 20,
        workingHours: {
            start: '08:00',
            end: '16:00',
        },
        nextAvailableSlot: new Date(Date.now() + 7200000).toISOString(),
        maxPatientsPerDay: 15,
        waitingTime: {
            estimatedWaitMinutes: 40,
            patientsInQueue: 5,
            averageConsultationTime: 20,
            description: '40 min wait • 5 in queue'
        }
    },
    {
        _id: 'doc3',
        userId: 'doctor3_id',
        user: { _id: 'doctor3_id', name: 'Dr. Ali Hassan', email: 'ali.hassan@hospital.com' },
        name: 'Dr. Ali Hassan',
        specialization: 'ENT Specialist',
        department: 'ENT',
        phone: '+1333333333',
        email: 'ali.hassan@hospital.com',
        rating: 4.6,
        reviews: 89,
        qualifications: ['MBBS', 'MD'],
        experience: 8,
        defaultConsultTime: 15,
        workingHours: {
            start: '10:00',
            end: '18:00',
        },
        nextAvailableSlot: new Date(Date.now() + 10800000).toISOString(),
        maxPatientsPerDay: 25,
        waitingTime: {
            estimatedWaitMinutes: 15,
            patientsInQueue: 2,
            averageConsultationTime: 15,
            description: '15 min wait • 2 in queue'
        }
    },
];

const mockAppointments = [
    {
        _id: 'apt1',
        patientId: 'patient1_id',
        doctorId: 'doc1',
        doctor: mockDoctors[0],
        date: new Date().toISOString().split('T')[0],
        slotStart: new Date(Date.now() + 3600000).toISOString(),
        slotEnd: new Date(Date.now() + 5400000).toISOString(),
        status: 'booked',
        token: 1,
        symptoms: 'General checkup and blood pressure monitoring',
        notes: 'Regular follow-up appointment',
    },
    {
        _id: 'apt2',
        patientId: 'patient1_id',
        doctorId: 'doc2',
        doctor: mockDoctors[1],
        date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        slotStart: new Date(Date.now() + 90000000).toISOString(),
        slotEnd: new Date(Date.now() + 91800000).toISOString(),
        status: 'waiting',
        token: 5,
        symptoms: 'Heart palpitations and chest pain',
    },
];

const mockNotifications = [
    {
        _id: 'notif1',
        userId: 'patient1_id',
        type: 'appointment',
        title: 'Appointment Confirmed',
        message: 'Your appointment with Dr. Ahmed Smith is confirmed for tomorrow at 2:00 PM',
        read: false,
        createdAt: new Date(Date.now() - 300000).toISOString(),
    },
    {
        _id: 'notif2',
        userId: 'patient1_id',
        type: 'appointment',
        title: 'Appointment Reminder',
        message: 'Your appointment is in 1 hour',
        read: false,
        createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
];

const mockMedicalRecords = [
    {
        _id: 'rec1',
        patientId: 'patient1_id',
        doctorId: 'doc1',
        doctor: mockDoctors[0],
        date: new Date(Date.now() - 604800000).toISOString(),
        visitReason: 'General Checkup',
        diagnosis: 'Normal health status',
        vitals: {
            bloodPressure: '120/80',
            temperature: '98.6°F',
            heartRate: 72,
            respiratoryRate: 16,
        },
        notes: 'Patient is healthy, continue with regular lifestyle',
        attachments: [],
    },
];

// Mock credentials storage
let mockAuthToken = null;
let currentUser = null;

export const mockApiService = {
    // Auth endpoints
    async login(email, password) {
        console.log('Mock login:', email);
        const user = Object.values(mockUsers).find((u) => u.email === email);
        if (!user) throw new Error('User not found');
        
        mockAuthToken = 'mock_token_' + user._id;
        currentUser = user;
        
        return {
            success: true,
            message: 'Login successful',
            data: {
                user,
                accessToken: mockAuthToken,
                refreshToken: 'mock_refresh_token',
            },
        };
    },

    async register(data) {
        console.log('Mock register:', data.email);
        const newUser = {
            _id: 'new_user_' + Date.now(),
            email: data.email,
            name: data.name,
            firstName: data.firstName || data.name.split(' ')[0],
            lastName: data.lastName || data.name.split(' ')[1],
            role: data.role,
            phone: data.phone || '',
        };
        mockUsers[newUser._id] = newUser;
        mockAuthToken = 'mock_token_' + newUser._id;
        currentUser = newUser;
        
        return {
            success: true,
            message: 'Registration successful',
            data: { user: newUser, accessToken: mockAuthToken },
        };
    },

    async logout() {
        mockAuthToken = null;
        currentUser = null;
        return { success: true, message: 'Logged out' };
    },

    // Doctor endpoints
    async getDoctors(page = 1, limit = 10, filters = {}) {
        let doctors = [...mockDoctors];
        
        if (filters.department) {
            doctors = doctors.filter((d) => 
                d.department.toLowerCase().includes(filters.department.toLowerCase())
            );
        }
        
        if (filters.q) {
            doctors = doctors.filter((d) => 
                d.name.toLowerCase().includes(filters.q.toLowerCase())
            );
        }
        
        const start = (page - 1) * limit;
        const end = start + limit;
        
        // Add waitingTime to all doctors
        const doctorsWithWaitingTime = doctors.map(d => ({
            ...d,
            waitingTime: d.waitingTime || {
                estimatedWaitMinutes: 20,
                patientsInQueue: 2,
                averageConsultationTime: d.defaultConsultTime || 15,
                description: '20 min wait • 2 in queue'
            }
        }));
        
        return {
            data: doctorsWithWaitingTime.slice(start, end),
            pagination: {
                page,
                limit,
                total: doctors.length,
                pages: Math.ceil(doctors.length / limit),
            },
        };
    },

    async getDoctorById(doctorId) {
        const doctor = mockDoctors.find((d) => d._id === doctorId);
        if (!doctor) throw new Error('Doctor not found');
        
        return { 
            data: {
                ...doctor,
                waitingTime: doctor.waitingTime || {
                    estimatedWaitMinutes: 20,
                    patientsInQueue: 2,
                    averageConsultationTime: doctor.defaultConsultTime || 15,
                    description: '20 min wait • 2 in queue'
                }
            }
        };
    },

    async getDoctorSlots(doctorId, date) {
        const slots = [];
        const slotDate = new Date(date);
        
        for (let hour = 9; hour < 17; hour++) {
            const slotTime = new Date(slotDate);
            slotTime.setHours(hour, 0, 0, 0);
            
            // Make some slots booked
            const isBooked = Math.random() < 0.3;
            
            slots.push({
                id: `slot_${hour}`,
                time: slotTime.toISOString(),
                available: !isBooked,
                duration: 30,
            });
        }
        
        return { data: slots };
    },

    // Appointment endpoints
    async getAppointments(filters = {}) {
        let appointments = [...mockAppointments];
        
        if (filters.status) {
            appointments = appointments.filter((a) => a.status === filters.status);
        }
        
        return {
            data: appointments,
            pagination: { total: appointments.length },
        };
    },

    async getAppointmentById(appointmentId) {
        const appointment = mockAppointments.find((a) => a._id === appointmentId);
        if (!appointment) throw new Error('Appointment not found');
        return { data: appointment };
    },

    async bookAppointment(doctorId, slotStart, symptoms) {
        const newAppointment = {
            _id: 'apt_' + Date.now(),
            patientId: currentUser._id,
            doctorId,
            doctor: mockDoctors.find((d) => d._id === doctorId),
            slotStart,
            slotEnd: new Date(new Date(slotStart).getTime() + 1800000).toISOString(),
            status: 'booked',
            token: Math.floor(Math.random() * 20) + 1,
            symptoms,
            createdAt: new Date().toISOString(),
        };
        
        mockAppointments.push(newAppointment);
        mockNotifications.unshift({
            _id: 'notif_' + Date.now(),
            userId: currentUser._id,
            type: 'appointment',
            title: 'Appointment Booked',
            message: `Your appointment with ${newAppointment.doctor.name} is confirmed`,
            read: false,
            createdAt: new Date().toISOString(),
        });
        
        return { success: true, data: newAppointment };
    },

    async cancelAppointment(appointmentId, reason) {
        const appointment = mockAppointments.find((a) => a._id === appointmentId);
        if (appointment) {
            appointment.status = 'cancelled';
            appointment.cancelledReason = reason;
        }
        return { success: true };
    },

    // Medical Records endpoints
    async getMedicalRecords(page = 1, limit = 10) {
        const start = (page - 1) * limit;
        const end = start + limit;
        
        return {
            data: mockMedicalRecords.slice(start, end),
            pagination: {
                page,
                limit,
                total: mockMedicalRecords.length,
                pages: Math.ceil(mockMedicalRecords.length / limit),
            },
        };
    },

    async getMedicalRecordById(recordId) {
        const record = mockMedicalRecords.find((r) => r._id === recordId);
        if (!record) throw new Error('Record not found');
        return { data: record };
    },

    // Notifications endpoints
    async getNotifications(page = 1, limit = 10) {
        const start = (page - 1) * limit;
        const end = start + limit;
        
        return {
            data: mockNotifications.slice(start, end),
            pagination: {
                page,
                limit,
                total: mockNotifications.length,
            },
        };
    },

    async markNotificationAsRead(notificationId) {
        const notification = mockNotifications.find((n) => n._id === notificationId);
        if (notification) {
            notification.read = true;
        }
        return { success: true };
    },

    // Patient Dashboard
    async getPatientDashboard() {
        return {
            data: {
                user: currentUser,
                nextAppointment: mockAppointments[0],
                upcomingAppointments: mockAppointments.filter((a) => a.status !== 'cancelled'),
                recentNotifications: mockNotifications.slice(0, 5),
                stats: {
                    totalAppointments: mockAppointments.length,
                    upcomingAppointments: mockAppointments.filter((a) => ['booked', 'waiting'].includes(a.status)).length,
                    completedAppointments: mockAppointments.filter((a) => a.status === 'completed').length,
                },
            },
        };
    },

    // Doctor Queue Dashboard
    async getDoctorDashboard() {
        return {
            data: {
                user: mockUsers.doctor,
                todayQueue: {
                    activePatients: 5,
                    waitingPatients: 3,
                    completedToday: 12,
                    currentToken: 4,
                },
                todayAppointments: mockAppointments.slice(0, 5),
                stats: {
                    patientsToday: 12,
                    averageWaitTime: 15,
                    noShowCount: 1,
                },
            },
        };
    },

    // Admin Dashboard
    async getAdminDashboard() {
        return {
            data: {
                stats: {
                    totalUsers: 150,
                    totalDoctors: 25,
                    totalPatients: 500,
                    totalAppointments: 1200,
                    averageWaitTime: 18,
                    appointmentCompletionRate: 92,
                },
                recentUsers: Object.values(mockUsers),
                topDoctors: mockDoctors,
                queueStatus: {
                    active: 18,
                    paused: 2,
                    offline: 5,
                },
            },
        };
    },

    // Settings/Profile
    async updateProfile(data) {
        currentUser = { ...currentUser, ...data };
        return { success: true, data: currentUser };
    },

    async getCurrentUser() {
        return { data: currentUser || mockUsers.patient1 };
    },

    // Utility - check if authenticated
    isAuthenticated() {
        return !!mockAuthToken && !!currentUser;
    },

    getCurrentToken() {
        return mockAuthToken;
    },

    getCurrentUserData() {
        return currentUser;
    },
};

export default mockApiService;
