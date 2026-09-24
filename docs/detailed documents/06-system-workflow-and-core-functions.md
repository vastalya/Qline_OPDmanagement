# Qline System Workflow And Core Functions

## End-To-End Flow

Qline works as a connected system across authentication, booking, queue management, records, notifications, analytics, and admin oversight.

## 1. Authentication And Session Flow

### Main flow

1. User registers or logs in through `/api/auth/*`.
2. Backend validates credentials and returns an access token.
3. Backend also manages refresh-token sessions through cookies and the `RefreshToken` collection.
4. Frontend restores sessions by calling `/api/auth/refresh` on load.
5. Route middleware uses the `qline_role` cookie to redirect users into the correct role area.

### Core backend functions

| Module | Responsibility |
| --- | --- |
| `authController` | register, login, refresh, logout, password reset, email verification |
| `middleware/auth.js` | verifies Bearer access token |
| `middleware/roleCheck.js` | enforces role-based access |
| `settingsController` | password changes and session revocation |

## 2. Doctor Schedule And Slot Setup

### Main flow

1. A doctor configures working hours, break slots, working days, consultation duration, and daily capacity.
2. The backend stores this in the `Doctor` profile and supporting schedule structures.
3. Frontend doctor layout checks whether setup is complete.
4. If setup is incomplete, the doctor is redirected to `/doctor/configure`.

### Core backend functions

| Module | Responsibility |
| --- | --- |
| `doctorController.configureSchedule` | saves doctor schedule configuration |
| `doctorScheduleService.syncDoctorSchedule` | keeps schedule representations aligned |
| `slotService.generateSlots` | generates valid bookable slots |
| `slotService.checkSlotAvailability` | validates requested slot against availability rules |

## 3. Appointment Booking Workflow

### Main flow

1. Patient chooses a doctor and date.
2. Frontend fetches available slots from `/api/doctors/:id/slots`.
3. Patient books through `/api/appointments/book`.
4. Backend validates doctor configuration, working day, slot duration, break windows, inactivity, occupancy, and daily limit.
5. Backend creates or updates the related `DailyQueue`.
6. Backend assigns the next token number atomically.
7. Notification and queue update flows are triggered.

### Core backend functions

| Module | Responsibility |
| --- | --- |
| `appointmentController.bookAppointment` | handles booking transaction and validation |
| `queueService.createQueueIfMissing` | initializes daily queue state |
| `slotService.checkSlotAvailability` | confirms slot can be booked |
| `notificationService.sendAppointmentBookedNotification` | creates in-app and email notification |

## 4. Queue Lifecycle Workflow

### Main flow

1. Doctor opens the dashboard for the day.
2. Frontend loads appointments, queue state, and schedule.
3. Doctor uses queue controls to call next, complete, mark no-show, pause, or resume.
4. Backend updates appointment statuses, queue state, consultation history, and queue event records.
5. Socket.IO broadcasts queue changes to room subscribers.
6. Patient views update in real time.

### Core backend functions

| Module | Responsibility |
| --- | --- |
| `queueController` | exposes queue action endpoints |
| `queueService.callNextPatient` | promotes next waiting patient |
| `queueService.markCompleted` | completes current consultation |
| `queueService.markNoShow` | closes current patient as no-show |
| `queueService.pauseQueue` | pauses the queue |
| `queueService.resumeQueue` | resumes the queue |
| `queueService.emitQueueUpdated` | broadcasts queue state to Socket.IO rooms |
| `queueService.recordQueueEvent` | stores queue transition history |
| `estimationService.getPatientWaitInfo` | calculates patient-facing wait info |

### Queue real-time behavior

- doctors and authorized patients join doctor-date rooms
- on join, the server immediately sends the current queue snapshot
- the server emits `queue:updated` and `queue:update` after relevant changes

## 5. Doctor Availability And Carry-Forward Workflow

### Main flow

1. Doctor marks themselves unavailable for a date range.
2. Doctor selects how affected appointments should be handled:
   - reschedule
   - cancel
3. Backend updates doctor availability.
4. Affected appointments are either moved to the next valid slot or cancelled.
5. Patients receive notifications about the change.

### Core backend functions

| Module | Responsibility |
| --- | --- |
| `doctorController.updateAvailabilityStatus` | receives availability change request |
| `doctorAvailabilityService.updateAvailability` | applies availability logic |
| `appointmentCarryForwardService.autoCarryForwardPastAppointmentsForDoctor` | shifts stale appointments forward |
| `notificationService.sendAppointmentRescheduledNotification` | informs patients of new schedule |
| `notificationService.sendDoctorUnavailableNotification` | informs patients when appointments are affected |

## 6. Medical Record Workflow

### Main flow

1. Doctor opens or creates a record tied to an appointment.
2. Backend stores diagnosis, notes, medications, lab tests, vitals, and follow-up data.
3. Sensitive fields are encrypted when the encryption key is configured.
4. Patients can view their own history.
5. Doctors can review patient history and timelines.

### Core backend functions

| Module | Responsibility |
| --- | --- |
| `medicalRecordController.createRecord` | creates appointment-linked medical record |
| `medicalRecordController.getDoctorPatientTimeline` | shows longitudinal patient history |
| `medicalRecordController.getMyHistory` | returns patient history |
| `medicalRecordController.updateRecord` | updates doctor-authored record |

## 7. Notifications And Background Jobs

### Main flow

1. User-facing actions generate notification or email jobs.
2. Jobs are stored in MongoDB instead of Redis.
3. Worker processes claim pending jobs and mark them completed or failed.
4. Notifications appear in-app and selected events can also send email.

### Core backend functions

| Module | Responsibility |
| --- | --- |
| `notificationService.createNotification` | stores notification records |
| `notificationService.sendEmail` | queues email work |
| `JobQueue.addJob` | writes a MongoDB-backed job |
| `emailWorker` | sends email jobs |
| `reminderWorker` | sends appointment reminders |
| `notificationWorker` | processes notification jobs |
| `analyticsWorker` | processes analytics jobs |

## 8. Analytics Workflow

### Main flow

1. Queue and consultation events accumulate throughout the day.
2. Analytics jobs calculate daily metrics such as wait time and efficiency.
3. Doctors view dashboards and range reports.
4. Admins view broader system summaries.

### Core backend functions

| Module | Responsibility |
| --- | --- |
| `analyticsService.calculateDailyAnalytics` | computes daily queue metrics |
| `analyticsService.getDashboardStats` | real-time doctor dashboard stats |
| `analyticsService.getWaitTimeAnalysis` | doctor wait-time reporting |
| `adminController.getSystemStats` | system-wide admin metrics |
| `adminController.getAnalytics` | admin analytics endpoint |

## 9. Admin Oversight Workflow

### Main flow

1. Admin accesses protected `/admin/*` pages.
2. Backend verifies admin role before allowing access.
3. Admin can review users, doctors, live queues, logs, settings, and analytics.
4. Sensitive updates are recorded in `AuditLog`.

### Core backend functions

| Module | Responsibility |
| --- | --- |
| `adminController.getUsers` | paginated user management |
| `adminController.updateUserStatus` | activate or suspend users |
| `adminController.createDoctor` | create doctor account and profile |
| `adminController.getLiveQueues` | monitor current queues |
| `adminController.getAuditLogs` | review admin event history |
| `middleware/auditLog.js` | records auditable changes |

## 10. Frontend Core Building Blocks

| Module | Responsibility |
| --- | --- |
| `AuthContext` | auth state, login, logout, refresh-based restoration |
| `SocketContext` | socket lifecycle, room joins, event subscriptions |
| `api.js` | Axios client with token attachment and refresh retry |
| `middleware.js` | role-based route guarding on the frontend |
| `Navbar` | role-specific navigation |
| `QueueControlPanel` | doctor queue controls |

## Summary

The project is organized around a clear operational flow:

- authenticate the user
- route them into their role workspace
- let patients book valid slots
- let doctors operate the queue in real time
- persist medical and operational data in MongoDB
- notify users and calculate analytics in the background
- give admins oversight over the whole system
