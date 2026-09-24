# Qline Frontend Pages And Role Guide

## Route Protection Model

Frontend access is enforced by `frontend/middleware.js`.

- public routes remain accessible without login
- authenticated users are redirected from public auth pages to their role dashboard
- unauthenticated users are redirected to `/login`
- role mismatch redirects the user back to their own dashboard

## Role Dashboards

| Role | Default landing page |
| --- | --- |
| Patient | `/patient/dashboard` |
| Doctor | `/doctor/dashboard` |
| Admin | `/admin/dashboard` |

## Public Pages

| Route | Purpose |
| --- | --- |
| `/` | Redirects to login or the correct dashboard |
| `/login` | Sign-in page |
| `/register` | New account registration |
| `/forgot-password` | Password reset request |
| `/reset-password` | Password reset completion |
| `/verify-email` | Email verification |
| `/terms` | Terms page |
| `/privacy` | Privacy page |
| `/support` | Public support ticket form |
| `/maintenance` | Maintenance information |
| `/403` | Forbidden page |
| `/500` | Server error page |
| `/not-found` | Not-found handling |

## Patient Pages

| Route | Purpose |
| --- | --- |
| `/patient/dashboard` | Patient home with upcoming appointment and recent notifications |
| `/doctors` | Browse and search available doctors |
| `/doctors/[id]` | Doctor profile page |
| `/doctors/[id]/book` | Slot booking page for a selected doctor |
| `/appointments` | Patient appointment history and upcoming bookings |
| `/appointments/[id]` | Appointment detail view |
| `/queue/[appointmentId]` | Live queue tracking for a booked appointment |
| `/medical-records` | Patient medical record list |
| `/medical-records/[id]` | Individual medical record view |
| `/notifications` | Notification center |
| `/profile` | Patient profile page |
| `/settings/account` | Account settings |
| `/settings/preferences` | UI and locale preferences |
| `/settings/notifications` | Notification preferences |
| `/settings/security` | Password and session security settings |

## Doctor Pages

| Route | Purpose |
| --- | --- |
| `/doctor/configure` | First-time doctor schedule setup |
| `/doctor/dashboard` | Daily dashboard with queue controls and availability management |
| `/doctor/appointments` | Doctor appointment list |
| `/doctor/appointments/[id]` | Appointment detail page |
| `/doctor/schedule` | Schedule management page |
| `/doctor/patients` | Patient directory for the doctor |
| `/doctor/patients/[patientId]` | Patient detail and history page |
| `/doctor/medical-records` | Medical records list |
| `/doctor/medical-records/new` | Create a new medical record |
| `/doctor/medical-records/[id]/edit` | Edit an existing medical record |
| `/doctor/analytics` | Queue and performance analytics |
| `/doctor/notifications` | Doctor notification center |
| `/doctor/profile` | Doctor profile page |
| `/doctor/settings/account` | Doctor account settings |
| `/doctor/settings/preferences` | Doctor preference settings |
| `/doctor/settings/notifications` | Doctor notification settings |
| `/doctor/settings/security` | Doctor password and session settings |
| `/doctor/settings/queue` | Queue-related doctor settings |

## Admin Pages

| Route | Purpose |
| --- | --- |
| `/admin/dashboard` | System summary, doctors table, and audit overview |
| `/admin/doctors` | Doctor management list |
| `/admin/doctors/[id]` | Doctor detail page |
| `/admin/users` | User management list |
| `/admin/users/[id]` | User detail page |
| `/admin/queues/live` | Live queue monitoring |
| `/admin/analytics` | Administrative analytics page |
| `/admin/audit-logs` | Audit log viewer |
| `/admin/reports` | Reporting page |
| `/admin/support` | Admin support management page |
| `/admin/profile` | Admin profile page |
| `/admin/settings/general` | General settings |
| `/admin/settings/notifications` | Notification settings |
| `/admin/settings/security` | Security settings |
| `/admin/settings/integrations` | Integration settings page |
| `/admin/settings/scheduling` | Scheduling settings page |

## Shared Frontend Behavior

### Authentication

- `AuthContext` restores sessions by calling `/api/auth/refresh`
- the frontend stores the access token in client state and a `qline_role` cookie for route gating
- logout clears local auth state and returns the user to `/login`

### Real-Time Updates

- authenticated layouts connect to the Socket.IO backend
- doctor and patient pages subscribe to queue and notification events
- queue pages hydrate current state after socket room join to support reconnects

### Doctor Setup Guard

Doctor pages run an additional check through `/api/doctors/my-schedule`.

- if a doctor has not configured a schedule yet, the frontend redirects them to `/doctor/configure`
- if auto-carry-forward moved past appointments, the doctor receives a toast summary

## Main Navigation By Role

### Patient navigation

- Dashboard
- Find Doctor
- My Appointments
- Medical Records
- Notifications
- Profile

### Doctor navigation

- Dashboard
- Appointments
- Schedule
- Patients
- Records
- Analytics
- Notifications

### Admin navigation

- Dashboard
- Doctors
- Users
- Live Queues
- Analytics
- Audit Logs
- Settings
