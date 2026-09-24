# Qline Backend API Reference

## Base URLs

- Live API: <https://qline-api.onrender.com/>
- Health check: <https://qline-api.onrender.com/health>

## Authentication Model

- access token: Bearer token in `Authorization` header
- refresh token: HTTP-only cookie handled by `/api/auth/refresh`
- role checks: `patient`, `doctor`, `admin`
- queue mutation endpoints use `X-Action-ID` for idempotency where noted

## System Endpoints

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/` | Public | API root metadata and endpoint map |
| `GET` | `/health` | Public | Health status and MongoDB connectivity |

## Auth Endpoints

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | Public | Register a new user |
| `POST` | `/api/auth/login` | Public | Authenticate user and issue session |
| `POST` | `/api/auth/refresh` | Public | Refresh access token from refresh cookie |
| `POST` | `/api/auth/logout` | Public | Logout and invalidate session |
| `POST` | `/api/auth/forgot-password` | Public | Start password reset flow |
| `GET` | `/api/auth/reset-password/validate` | Public | Validate reset token |
| `POST` | `/api/auth/reset-password` | Public | Complete password reset |
| `GET` | `/api/auth/verify-email` | Public | Verify email token |
| `POST` | `/api/auth/verify-email/resend` | Public | Resend verification email |
| `POST` | `/api/auth/change-password` | Authenticated | Change password for current user |

## Doctor Endpoints

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/doctors/configure` | Doctor | Configure doctor schedule |
| `PATCH` | `/api/doctors/availability` | Doctor | Mark doctor active or unavailable |
| `GET` | `/api/doctors/my-schedule` | Doctor | Fetch doctor schedule and setup status |
| `GET` | `/api/doctors` | Public | List and search doctors |
| `GET` | `/api/doctors/today-appointments` | Doctor | Get today's appointments for the logged-in doctor |
| `GET` | `/api/doctors/:id/slots` | Public | Get available slots for a doctor and date |
| `GET` | `/api/doctors/:id` | Public | Fetch doctor profile by id |

## Appointment Endpoints

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/appointments/book` | Patient | Book an appointment slot |
| `GET` | `/api/appointments/my-appointments` | Patient | List current patient's appointments |
| `GET` | `/api/appointments/doctor-appointments` | Doctor | List doctor's appointments for a date |
| `DELETE` | `/api/appointments/:id/cancel` | Owner patient or doctor | Cancel an appointment |
| `PATCH` | `/api/appointments/:id/reschedule` | Owner patient or doctor | Reschedule an appointment |
| `POST` | `/api/appointments/:id/reassign-next-available` | Authenticated | Reassign appointment to next available slot |
| `PATCH` | `/api/appointments/:id/priority` | Doctor | Set appointment priority |
| `GET` | `/api/appointments/:id/wait-info` | Patient | Get wait estimate for own appointment |
| `GET` | `/api/appointments/:id` | Owner patient or doctor | Fetch appointment detail |

## Queue Endpoints

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/queue/call-next` | Doctor | Call next patient in queue |
| `POST` | `/api/queue/mark-completed` | Doctor | Mark current patient completed |
| `POST` | `/api/queue/mark-no-show` | Doctor | Mark current patient as no-show |
| `POST` | `/api/queue/pause` | Doctor | Pause the queue |
| `POST` | `/api/queue/resume` | Doctor | Resume the queue |
| `GET` | `/api/queue/current-state` | Doctor | Fetch live queue state |

## Notification Endpoints

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/notifications` | Authenticated | Get paginated notifications |
| `GET` | `/api/notifications/unread-count` | Authenticated | Get unread notification count |
| `PATCH` | `/api/notifications/read-all` | Authenticated | Mark all notifications as read |
| `PATCH` | `/api/notifications/:id/read` | Authenticated | Mark one notification as read |
| `DELETE` | `/api/notifications/:id` | Authenticated | Delete one notification |

## Medical Record Endpoints

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/medical-records/doctor/patients` | Doctor | List doctor-linked patients |
| `GET` | `/api/medical-records/doctor/patients/:patientId/history` | Doctor | View a patient's timeline |
| `GET` | `/api/medical-records/doctor` | Doctor | List records created by the doctor |
| `POST` | `/api/medical-records` | Doctor | Create a medical record |
| `GET` | `/api/medical-records/my-history` | Patient | Get own medical history |
| `GET` | `/api/medical-records/patient/:patientId` | Doctor or same patient | Get patient medical history |
| `GET` | `/api/medical-records/:id` | Doctor or patient | Get single medical record |
| `PATCH` | `/api/medical-records/:id` | Doctor | Update a medical record |

## Analytics Endpoints

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/analytics/dashboard` | Doctor | Real-time dashboard statistics |
| `GET` | `/api/analytics/range` | Doctor | Analytics over a date range |
| `GET` | `/api/analytics/wait-times` | Doctor | Wait-time analysis |

## Admin Endpoints

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/admin/stats` | Admin | System-wide statistics |
| `GET` | `/api/admin/users` | Admin | Paginated user list |
| `GET` | `/api/admin/users/:id` | Admin | User detail |
| `PATCH` | `/api/admin/users/:id/status` | Admin | Activate or suspend a user |
| `GET` | `/api/admin/doctors` | Admin | Paginated doctor list |
| `GET` | `/api/admin/doctors/:id` | Admin | Doctor detail |
| `POST` | `/api/admin/doctors` | Admin | Create doctor account and profile |
| `PATCH` | `/api/admin/doctors/:id` | Admin | Update doctor profile |
| `DELETE` | `/api/admin/doctors/:id` | Admin | Delete doctor profile |
| `GET` | `/api/admin/queues/live` | Admin | Monitor live queues |
| `GET` | `/api/admin/audit-logs` | Admin | Fetch audit logs |
| `GET` | `/api/admin/analytics` | Admin | Fetch administrative analytics |
| `GET` | `/api/admin/settings` | Admin | Read system settings |
| `PUT` | `/api/admin/settings` | Admin | Update system settings |

## Profile Endpoints

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/profile` | Authenticated | Get current profile |
| `PUT` | `/api/profile` | Authenticated | Update current profile |

## User Settings Endpoints

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `PUT` | `/api/settings/account` | Authenticated | Update account settings |
| `PUT` | `/api/settings/notifications` | Authenticated | Update notification settings |
| `PUT` | `/api/settings/preferences` | Authenticated | Update preference settings |
| `POST` | `/api/settings/security/change-password` | Authenticated | Change password |
| `POST` | `/api/settings/security/logout-all` | Authenticated | Revoke all sessions |
| `POST` | `/api/settings/security/logout-session` | Authenticated | Revoke one session |
| `GET` | `/api/settings/security/sessions` | Authenticated | List active sessions |

## Patient-Specific Endpoints

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/patient/doctors` | Patient | Fetch patient-facing doctor list |
| `GET` | `/api/patient/medical-records` | Patient | List own medical records with filters |
| `GET` | `/api/patient/medical-records/:id` | Patient | Get one of the patient's medical records |

## Support And Error Endpoints

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/support/create-ticket` | Public | Create support ticket, optionally with user context |
| `POST` | `/api/errors/report` | Public | Report client-side error payloads |

## Real-Time Socket Events

Socket.IO runs on the same backend service.

### Client events

- `join:doctor-room`
- `leave:doctor-room`
- `get:my-appointment`

### Server events

- `queue:updated`
- `queue:update`
- `queue:error`
- `appointment:data`

## Notes For Evaluators

- queue actions are designed for doctors only
- patient pages consume queue state indirectly through appointment and notification flows
- medical record routes are authenticated and sensitive data fields are encrypted when the encryption key is configured
