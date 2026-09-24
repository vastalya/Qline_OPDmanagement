# Qline Database Structure

## Database Overview

Qline uses MongoDB as the primary and only runtime data store in the current architecture. The codebase models operational data, queue state, analytics, notifications, support tickets, and worker jobs as MongoDB collections.

## Core Entity Relationships

- `User` stores identity, auth, profile, settings, and role
- `Doctor` extends a user with OPD schedule and availability information
- `Appointment` links one patient to one doctor for a specific slot
- `DailyQueue` stores queue state for one doctor on one date
- `MedicalRecord` links to an appointment, patient, and doctor
- `Notification` links to a user
- `RefreshToken` links to a user session

## Main Collections

| Collection / Model | Purpose | Key Fields | Notes |
| --- | --- | --- | --- |
| `User` | Identity, auth, profile, settings | `name`, `email`, `password`, `role`, `status`, `settings.*` | Password is hashed with bcrypt; roles are `patient`, `doctor`, `admin` |
| `Doctor` | Doctor profile and availability | `userId`, `department`, `workingHours`, `breakSlots`, `workingDays`, `maxPatientsPerDay`, `isActive`, `inactiveFrom`, `inactiveUntil` | One doctor profile belongs to one user |
| `Appointment` | Booking and consultation lifecycle | `doctorId`, `patientId`, `date`, `slotStart`, `slotEnd`, `tokenNumber`, `status`, `priority` | Prevents active double-booking with a compound unique index |
| `DailyQueue` | Queue state for a doctor on a date | `doctorId`, `date`, `currentToken`, `appointmentCount`, `lastTokenNumber`, `waitingList`, `status` | Stores idempotency metadata for queue actions |
| `MedicalRecord` | Clinical record for an appointment | `patientId`, `doctorId`, `appointmentId`, `chiefComplaint`, `diagnosis`, `notes`, `medications`, `labTests`, `vitals`, `followUp` | Sensitive fields are encrypted when `MEDICAL_RECORD_ENCRYPTION_KEY` is set |
| `Notification` | In-app notification feed | `userId`, `type`, `title`, `message`, `read`, `readAt` | Auto-expires after 30 days |
| `RefreshToken` | Persistent auth sessions | `userId`, `token`, `expiresAt`, `userAgent`, `ipAddress` | TTL index removes expired sessions automatically |

## Operational And Reporting Collections

| Collection / Model | Purpose | Key Fields | Notes |
| --- | --- | --- | --- |
| `QueueEvent` | Queue lifecycle event stream | `appointmentId`, `doctorId`, `patientId`, `queueId`, `event`, `previousEvent`, `metadata` | Supports analytics and timeline reconstruction |
| `QueueAnalytics` | Daily doctor analytics | `doctorId`, `date`, `averageWaitTime`, `averageConsultTime`, `efficiencyRate`, `hourlyStats` | One document per doctor per day |
| `ConsultationHistory` | Completed consultation timing | `appointmentId`, `doctorId`, `patientId`, `startTime`, `endTime`, `consultationDuration` | Used for timing history and analytics |
| `AuditLog` | Administrative audit trail | `userId`, `action`, `entityType`, `entityId`, `changes`, `status` | Tracks sensitive admin operations |
| `SystemSetting` | Central system settings document | `key`, `settings` | Stores admin-managed settings |
| `SupportTicket` | Support requests | `category`, `subject`, `description`, `email`, `userId`, `status` | Public support endpoint can attach user context if token is present |
| `ErrorReport` | Client-side error submissions | `url`, `userAgent`, `timestamp`, `userId`, `context` | Used for front-end issue reporting |
| `EmailLog` | Email delivery tracking | `recipient`, `subject`, `status`, `provider`, `attempts`, `error` | Used by email worker flow |
| `Job` via `JobQueue` | MongoDB-backed background jobs | `queue`, `type`, `data`, `status`, `attempts`, `scheduledAt` | Replaces Redis/BullMQ in current architecture |
| `DoctorSchedule` | Supporting doctor schedule representation | `doctorId`, `workingDays`, `startTime`, `endTime`, `consultationDuration` | Helper schedule model retained in repo |

## Appointment Status Values

Appointments move through these states:

- `booked`
- `waiting`
- `in_progress`
- `in_consultation`
- `completed`
- `cancelled`
- `no_show`

## Priority Queue Values

- `emergency`
- `senior`
- `standard`

## Notification Types

- `appointment_booked`
- `appointment_reminder`
- `appointment_rescheduled`
- `appointment_cancelled`
- `doctor_unavailable`
- `token_called`
- `queue_paused`
- `queue_resumed`
- `doctor_delayed`
- `system_alert`

## Important Index And Retention Rules

### Appointment

- unique compound index on `doctorId + date + slotStart` for non-cancelled appointments
- queue-oriented indexes for doctor/date/status/token lookups
- priority-aware queue ordering index

### DailyQueue

- unique compound index on `doctorId + date`
- TTL cleanup after 30 days

### MedicalRecord

- indexes on patient/date and doctor/date
- unique `appointmentId` to keep one record per appointment

### Notification

- indexes for unread and recent-notification queries
- TTL cleanup after 30 days

### RefreshToken

- TTL cleanup at `expiresAt`

### QueueAnalytics

- unique one-record-per-doctor-per-day rule

### Job Queue

- completed and failed jobs expire after 7 days

## Security Notes

- user passwords are hashed before save
- JWT refresh sessions are persisted separately from user documents
- medical records support field-level encryption
- audit logs capture admin-sensitive actions
- error and support collections keep operational visibility without mixing that data into core patient records
