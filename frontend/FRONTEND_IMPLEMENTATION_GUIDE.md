# Qline Frontend - Complete Implementation Guide

**Last Updated:** March 3, 2026  
**Status:** Scaffold Phase Complete - Ready for Component Development

---

## ✅ Completed Scaffolds

### Authentication Pages (All Complete)
- ✅ `/forgot-password` - Password reset request with email verification
- ✅ `/reset-password?token=...` - Password reset with strength meter
- ✅ `/verify-email?token=...&email=...` - Email verification with resend

### System/Error Pages (All Complete)
- ✅ `/not-found` - 404 with role-aware navigation
- ✅ `/403` - Unauthorized access page
- ✅ `/500` - Server error with retry and report
- ✅ `/maintenance` - Scheduler maintenance page
- ✅ `/terms` - Terms of Service
- ✅ `/privacy` - Privacy Policy
- ✅ `/support` - FAQ + ticket creation form

### Patient Pages (All Complete)
- ✅ `/patient/dashboard` - Next appointment, queue status, quick actions
- ✅ `/doctors/[id]` - Full doctor profile, availability, booking CTA
- ✅ `/appointments/[id]` - Appointment detail, timeline, actions
- ✅ `/medical-records` - List with filters (doctor, date range)
- ✅ `/medical-records/[id]` - Full record detail (complaint, diagnosis, meds, labs)
- ✅ `/notifications` - Notification center with filters and pagination
- ✅ `/profile` - Personal details form with dirty state warning
- ✅ `/settings/account` - Email, locale, display preferences
- ✅ `/settings/security` - Change password, active sessions, logout all
- ✅ `/settings/notifications` - Per-event toggles + channel selection
- ✅ `/settings/preferences` - Timezone, date/time format, language, accessibility

---

## 📋 Doctor Pages (Need Scaffolding)

### Dashboard & Operations
#### `/doctor/dashboard`
**Status:** Existing (enhance)
- **Components:**
  - Today's queue board (same-day appointments)
  - Call next button with sound notification
  - Complete/No-show/Pause buttons per patient
  - Toggle queue pause/resume with reason modal
  - Priority level selector for queue
  - Real-time patient count in each status
  - Stats cards: on-time, no-shows, avg wait time

- **API calls:**
  - `GET /api/doctor/queue/today` - fetch today's patients
  - `PATCH /api/doctor/queue/status` - update queue status
  - `POST /api/doctor/queue/call-next` - call next patient
  - Socket events: `queue:patient-arrive`, `queue:patient-complete`

- **State Management:**
  - Current queue state (paused/active)
  - Selected patient for actions
  - Real-time socket subscription

---

#### `/doctor/configure`
**Status:** Existing (enhance)
- **Components:**
  - Department selector
  - Consultation duration (minutes)
  - Max patients per day
  - Working hours picker (per day)
  - Walk-in slots percentage
  - Save confirmation modal

- **API:** `PUT /api/doctor/config`

---

### Schedule Management
#### `/doctor/schedule`
**Status:** NEW
- **Components:**
  - Calendar view (week/month toggle)
  - Drag-drop time slots
  - Break slots creator (lunch, breaks)
  - Block/unblock date ranges
  - Override individual days
  - Repeat patterns (weekly, monthly)
  - Holiday marker

- **API calls:**
  - `GET /api/doctor/schedule?from=...&to=...` - fetch schedule
  - `PUT /api/doctor/schedule/slots` - update slots
  - `POST /api/doctor/schedule/blocks` - create blocks
  - `DELETE /api/doctor/schedule/[blockId]` - remove blocks

- **UI Features:**
  - Color-coded slot types (available, booked, break, blocked)
  - Conflict detection (overlapping breaks)
  - Bulk actions (apply to all Mondays, etc.)

---

### Appointment Management
#### `/doctor/appointments`
**Status:** NEW
- **Components:**
  - Daily appointment list (sortable: booked, in-progress, waiting, completed, no-show)
  - Search/filter by patient name, status, time
  - Pagination or infinite scroll
  - Patient info preview cards
  - Quick actions: view detail, mark complete, no-show

- **API:** `GET /api/doctor/appointments?date=...&status=...`

---

#### `/doctor/appointments/[id]`
**Status:** NEW
- **Components:**
  - Patient summary (name, age, contact)
  - Visit history (past 3-5 appointments)
  - Current appointment detail
  - Queue action panel (update status)
  - Medical record preview
  - Call button with notifications
  - Time tracking (waiting, with doctor, completed)

- **API calls:**
  - `GET /api/doctor/appointments/[id]`
  - `PATCH /api/doctor/appointments/[id]/status` - mark complete/no-show
  - Socket: `queue:patient-status`

---

### Patient & Record Management
#### `/doctor/patients/[patientId]`
**Status:** NEW
- **Components:**
  - Patient longitudinal profile (demographics)
  - Visit history list (all past appointments with dates)
  - Cumulative diagnoses/conditions
  - Allergies and medical notes
  - Contact information
  - Link to create new record

- **API:** `GET /api/doctor/patients/[patientId]/history`

---

#### `/doctor/medical-records/new?appointmentId=...`
**Status:** NEW
- **Components:**
  - Patient info (read-only from appointment)
  - Chief complaint (text area)
  - Diagnosis field(s) with dropdown suggestions
  - Vitals input (BP, temp, HR, weight, height)
  - Medications list (add/remove with dosage, frequency, duration)
  - Lab tests/prescription (add/remove)
  - Notes/follow-up instructions (text area)
  - Save/cancel buttons

- **Validations:**
  - Required: complaint, diagnosis, at least one medication or note
  - Date auto-filled to now

- **API:** `POST /api/doctor/medical-records`

---

####  `/doctor/medical-records/[id]/edit`
**Status:** NEW
- **Components:**
  - All fields from create page (pre-filled)
  - Edit history log (when, by whom last modified)
  - Save/cancel/delete buttons
  - Confirmation modal if deleting

- **API calls:**
  - `GET /api/doctor/medical-records/[id]`
  - `PUT /api/doctor/medical-records/[id]`
  - `DELETE /api/doctor/medical-records/[id]`

---

### Analytics & Reporting
#### `/doctor/analytics`
**Status:** NEW
- **Components:**
  - KPI cards: appointments this month, wait time avg, no-show %, on-time %
  - Date range picker (month/week/custom)
  - Line/bar charts: daily patient count, daily wait times
  - Trend indicators (↑ ↓ →)
  - Comparison: this month vs last month

- **API:** `GET /api/doctor/analytics?from=...&to=...`

---

#### `/doctor/analytics/wait-times`
**Status:** NEW
- **Components:**
  - Hour-wise wait time breakdown (8am-6pm)
  - Peak hours indicator
  - Bar chart visualization
  - Date range picker
  - Export CSV button
  - Bottleneck analysis (which hours need adjustment)

- **API:** `GET /api/doctor/analytics/wait-times?date=...`

---

### Notifications & Communication
#### `/doctor/notifications`
**Status:** NEW
- **Components:**
  - Alert inbox (similar to patient notifications page)
  - Types: queue_paused, delayed_alert, no_show_spike, system_alert
  - Mark read, mark all read, delete
  - Pagination

- **API:** `GET /api/doctor/notifications`

---

### Profile & Settings
#### `/doctor/profile`
**Status:** NEW
- **Components:**
  - Professional name, bio/specialization (editable)
  - Department field
  - Consultation type preference (virtual/in-person/both)
  - Professional bio for patients (long text)
  - Save/cancel with dirty state

- **API:** `PUT /api/doctor/profile`

---

#### `/doctor/settings/account`
**Status:** NEW
- **Components:**
  - Email (read-only with change email button)
  - Phone (editable)
  - Department/specialized areas
  - Save changes button

- **API:** `PUT /api/doctor/settings/account`

---

####  `/doctor/settings/security`
**Status:** NEW
- **Components:**
  - Change password (same as patient)
  - Active sessions with device info
  - Logout all devices button

- **API:** `POST /api/doctor/settings/security/change-password` (shared endpoint)

---

#### `/doctor/settings/notifications`
**Status:** NEW
- **Components:**
  - Toggles for:
    - Queue paused alert
    - Doctor delayed alert
    - No-show spike (3+ in one day)
    - New appointment booked
    - System alerts
  - Channels: in-app, email, SMS

- **API:** `PUT /api/doctor/settings/notifications`

---

#### `/doctor/settings/queue`
**Status:** NEW
- **Components:**
  - Default queue mode (FIFO, priority, hybrid)
  - Auto-pause if waiting time exceeds: [X minutes]
  - Alert threshold: [X] no-shows in [Y] hours
  - Allow walk-in overrides (yes/no)
  - After-hours queue close time

- **API:** `PUT /api/doctor/settings/queue`

---

#### `/doctor/settings/preferences`
**Status:** NEW
- **Components:**
  - Timezone (shared with patient)
  - Date/time format
  - Language
  - Accessibility (reduced motion, high contrast)
  - Dashboard widgets preference (customizable)

- **API:** `PUT /api/doctor/settings/preferences`

---

## 👨‍💼 Admin Pages (Need Scaffolding)

### System Overview
#### `/admin/dashboard`
**Status:** Existing (enhance)
- **Components:**
  - KPI cards: total users, doctors, appointments today, avg wait time
  - Line charts: daily appointments, revenue/utilization
  - Doctor utilization table (top 5)
  - Recent audit log preview (5 items)
  - System health status (API, DB, Redis, emails)
  - Quick action buttons: manage doctors, view incidents, system settings

- **API:** `GET /api/admin/dashboard-summary`

---

### User Management
####  `/admin/users`
**Status:** NEW
- **Components:**
  - User list table: name, email, role, status, created date
  - Search by email/name
  - Role filter: patient, doctor, admin
  - Status filter: active, suspended, deleted
  - Actions column: view detail, suspend/activate, delete
  - Pagination
  - Bulk actions (suspend multiple)

- **API:** `GET /api/admin/users?role=...&status=...&search=...&page=...`

---

#### `/admin/users/[id]`
**Status:** NEW
- **Components:**
  - User profile information
  - Role and status (editable dropdown)
  - Activity summary: last login, appointments, actions
  - Audit trail (user-specific events)
  - Action buttons: suspend, delete, force password reset, impersonate (if needed)
  - Email templates quick links

- **API calls:**
  - `GET /api/admin/users/[id]`
  - `PATCH /api/admin/users/[id]/status`
  - `POST /api/admin/users/[id]/password-reset`
  - `GET /api/admin/users/[id]/activity`

---

### Doctor Management
#### `/admin/doctors`
**Status:** NEW
- **Components:**
  - Doctor table: name, department, status, appointments/month, avg rating, capacity
  - Search by name/department
  - Department filter (multi-select)
  - Capacity status filter (under-load, optimal, over-load)
  - Actions: view detail, edit, deactivate, reassign patients
  - Add new doctor button
  - Bulk actions: update department, update status

- **API:** `GET /api/admin/doctors?dept=...&search=...&capacity=...`

---

#### `/admin/doctors/[id]`
**Status:** NEW
- **Components:**
  - Doctor profile (editable name, bio, specialization, department)
  - Workload stats: appointments/month, avg wait time, no-show %, on-time %
  - Queue health: current patients waiting, avg queue time
  - Performance trend (last 30 days)
  - Schedule preview
  - Patient distribution chart
  - Action buttons: edit, deactivate, view audit log, send message

- **API calls:**
  - `GET /api/admin/doctors/[id]/detail`
  - `PUT /api/admin/doctors/[id]` (update profile)
  - `PATCH /api/admin/doctors/[id]/status`
  - `GET /api/admin/doctors/[id]/workload`

---

### Queue & Operations
#### `/admin/queues/live`
**Status:** NEW
- **Components:**
  - Real-time queue monitor across all doctors
  - Cards per doctor: name, current queue size, avg wait, status (active/paused)
  - Heatmap: doctors sorted by queue length (red = high)
  - Actions per doctor: pause queue, clear queue, send notification
  - Filters: department, status
  - Refresh button, auto-refresh toggle

- **API & Sockets:**
  - `GET /api/admin/queues/live`
  - Socket: `admin:queue:update` - real-time updates

---

### Audit & Compliance
#### `/admin/audit-logs`
**Status:** NEW
- **Components:**
  - Advanced audit log table: timestamp, user, action, resource, details, IP, status
  - Search by user/action/resource
  - Multi-filter: action type (create, update, delete, login, etc.), date range, resource type
  - Export CSV/PDF
  - Pagination or infinite scroll
  - Click row to view full details modal

- **API:** `GET /api/admin/audit-logs?action=...&user=...&from=...&to=...&page=...`

- **Filter Options:**
  - Action types: CREATE, UPDATE, DELETE, LOGIN, LOGOUT, SUSPEND, APPROVE, EXPORT
  - Resource types: User, Doctor, Appointment, MedicalRecord, QueueConfig
  - Date range: last 24h, 7d, 30d, custom

---

### Reports & Analytics
#### `/admin/reports`
**Status:** NEW
- **Components:**
  - Report type selector: utilization, no-show analysis, wait-time analysis, revenue
  - Date range picker (month/week/custom)
  - Generate report button
  - Preview table with key metrics
  - Download CSV/PDF buttons
  - Save as template option
  - Scheduled reports section (monthly automation)

- **API:** `POST /api/admin/reports/generate` with payload:
  ```json
  {
    type: "utilization|no-show|wait-time|revenue",
    from: "2026-01-01",
    to: "2026-03-01",
    format: "csv|pdf|html"
  }
  ```

---

#### `/admin/analytics`
**Status:** NEW
- **Components:**
  - System-wide KPI cards: total appointments, unique patients, avg wait time, system uptime
  - Date range selector with presets
  - Charts:
    - Line: daily appointments trend
    - Bar: appointments by department
    - Pie: role distribution (patient vs doctor)
    - Line: wait times trend
  - Heatmap: department utilization by hour
  - Comparison widgets: this month vs last month
  - Export-enabled charts

- **API:** `GET /api/admin/analytics?from=...&to=...`

---

### System Configuration
#### `/admin/settings/general`
**Status:** NEW
- **Components:**
  - Hospital/org name (editable)
  - Timezone default (for all doctors/patients without override)
  - Support email/phone (for footer/pages)
  - Logo/favicon upload
  - System notification banner (alert, maintenance message)
  - Main working hours (e.g., 8am-6pm)

- **API:** `PUT /api/admin/settings/general`

---

#### `/admin/settings/scheduling`
**Status:** NEW
- **Components:**
  - Default slot duration (15, 30, 45, 60 min)
  - Walk-in percentage vs pre-booked percentage
  - Max appointments per day (per doctor guideline)
  - Buffer time between appointments (minutes)
  - Cancellation deadline (hours before appointment)
  - Automatic no-show timeout (minutes without patient arriving)
  - Holiday calendar uploader

- **API:** `PUT /api/admin/settings/scheduling`

---

#### `/admin/settings/security`
**Status:** NEW
- **Components:**
  - IP whitelist management (add/remove IPs)
  - Session timeout (minutes)
  - Require 2FA for admins (toggle)
  - Password policy (min length, complexity requirements)
  - Suspicious activity alert thresholds
  - Export allowed: yes/no (data privacy)

- **API calls:**
  - `PUT /api/admin/settings/security`
  - `POST /api/admin/settings/security/ip-whitelist`
  - `DELETE /api/admin/settings/security/ip-whitelist/[ip]`

---

#### `/admin/settings/notifications`
**Status:** NEW
- **Components:**
  - Global notification templates (email, SMS, in-app)
  - Event type: appointment_booked, appointment_reminder, queue_paused, doctor_delayed
  - Edit template text with placeholders ({{patient}}, {{doctor}}, {{time}})
  - Test send button
  - Enable/disable per event
  - Email provider config (SendGrid, AWS SES, etc.)

- **API:** `PUT /api/admin/settings/notifications`

---

#### `/admin/settings/integrations`
**Status:** NEW
- **Components:**
  - Email provider selector (SendGrid, AWS SES, Nodemailer config)
  - API keys input (password-masked)
  - Test connection button
  - SMS provider selector (Twilio, etc.) with config
  - Future integrations section (EMR, payment gateway placeholders)
  - Webhook configuration (outgoing events)

- **API:** `PUT /api/admin/settings/integrations`

---

### Admin Tools
#### `/admin/profile`
**Status:** NEW
- **Components:**
  - Admin profile similar to doctor/patient
  - Name, email, phone (editable)
  - Role designation
  - Permissions summary (read-only)
  - Last login info
  - Change password, sessions management

- **API:** `PUT /api/admin/profile`, shared password endpoint

---

#### `/admin/support`
**Status:** NEW
- **Components:**
  - Incident/issue reporting form
  - Open incidents list with status
  - Escalation controls
  - Communication log with tech support team
  - System health status component
  - FAQ for admins only
  - Emergency contacts

---

## 🏗️ Component Architecture by Category

### Shared Components Across All Roles
- **Dashboard Cards:** KPI, appointment info, queue status
- **Forms:** Profile update, settings panels, report generators
- **Tables:** Users, doctors, appointments, audit logs (with sorting, filtering)
- **Modals:** Confirmation, detail preview, create/edit dialogs
- **Alerts:** Success, error, warning messages
- **Navigation:** Sidebar (role-aware), breadcrumbs, tabs
- **Charts:** Line, bar, pie, heatmap (using Chart.js or Recharts)
- **Date/Time Pickers:** Calendar, time selector
- **Pagination:** Standard pagination with page size selector
- **Search & Filter:** Text search, dropdown filters, date range

### Role-Specific Components
**Patient:**
- Appointment booking flow
- Queue tracker with real-time updates
- Medical record viewer
- Notification center

**Doctor:**
- Queue board with patient call flow
- Appointment management with quick status updates
- Medical record creator/editor
- Schedule calendar
- Analytics dashboard

**Admin:**
- User/doctor management grid
- Real-time queue monitor
- Advanced audit log explorer
- Report generator
- System settings panels

---

## API Integration Checklist

### Backend Endpoints Confirmed Implemented
- ✅ Auth: login, register, forgot-password, reset-password, verify-email
- ✅ Patient: dashboard, doctors list/detail, appointments list/detail, medical records, notifications
- ✅ Doctor: queue, appointments, medical records
- ✅ Admin: dashboard, users, doctors, audit logs

### Frontend API Calls to Implement (per page)
| Page | HTTP Method | Endpoint | Priority |
|------|-----------|----------|----------|
| /doctor/schedule | GET/PUT | `/api/doctor/schedule/*` | High |
| /doctor/appointments | GET | `/api/doctor/appointments?date=*&status=*` | High |
| /doctor/analytics | GET | `/api/doctor/analytics?from=*&to=*` | High |
| /admin/users | GET | `/api/admin/users?role=*&status=*` | High |
| /admin/doctors | GET | `/api/admin/doctors?dept=*&search=*` | High |
| /admin/queues/live | GET + WS | `/api/admin/queues/live` | High |
| /admin/reports | POST | `/api/admin/reports/generate` | Medium |
| /admin/settings/* | GET/PUT | `/api/admin/settings/*` | Medium |

---

## 📱 Mobile & Responsive Design Checklist

All pages must support:
- ✅ Mobile (375px-480px width)
- ✅ Tablet (768px-1024px width)
- ✅ Desktop (1200px+ width)
- ✅ Touch-friendly buttons (min 44px height)
- ✅ Readable text (min 16px on mobile)
- ✅ Proper spacing for touch interactions
- ✅ Responsive tables (scroll on mobile)
- ✅ Collapsible navigation on mobile

---

## 🎯 Development Order (Recommended)

### Sprint 1: Core Patient Features
1. Patient Dashboard (real-time)
2. Doctor Search & Booking Flow
3. Appointment Detail & Management
4. Notifications
5. Patient Profile

### Sprint 2: Patient Settings & Doctor Basics
1. Patient Settings (all 4 pages)
2. Doctor Dashboard (enhance)
3. Doctor Schedule Management
4. Doctor Appointments List/Detail
5. Doctor Profile

### Sprint 3: Doctor Advanced & Admin Core
1. Doctor Medical Records (create/edit)
2. Doctor Analytics
3. Admin Users Management
4. Admin Doctors Management
5. Admin Audit Logs

### Sprint 4: Admin Advanced & Polish
1. Admin Queue Monitor
2. Admin Reports & Analytics
3. Admin Settings (all pages)
4. Cross-role testing & polishing
5. Performance optimization

---

## ✨ Testing Checklist Per Page

- [ ] Load states (skeleton screens)
- [ ] Error states (API failures, 404s, validation)
- [ ] Empty states (no data scenarios)
- [ ] Success states (happy path with feedback)
- [ ] Form validations (client & server)
- [ ] Unsaved changes warnings (dirty state)
- [ ] Responsive design (mobile, tablet, desktop)
- [ ] Accessibility (keyboard nav, screen readers)
- [ ] Performance (load time, infinite scroll, pagination)
- [ ] Real-time updates (socket events)
- [ ] Role-based access (redirect unauthorized)
- [ ] Edge cases (long names, special characters, dates)

---

## 📚 Documentation & Comments

Each page component should include:
- JSDoc header with purpose, functionality, API calls, state management
- Inline comments for complex logic
- TODO markers for future enhancements
- Copy-pasteable boilerplate for similar pages

---

## 🚀 Deployment Readiness

- [ ] All routes protected by authentication middleware
- [ ] Role-based access middleware implemented
- [ ] Error boundaries on all routes
- [ ] Loading states with skeleton screens
- [ ] Graceful degradation (no JS errors on missing data)
- [ ] Telemetry hooks on critical user actions
- [ ] Environment variable configs (API URLs, etc.)
- [ ] SEO meta tags where applicable (public pages)

---

## 📝 Notes

This document serves as the single source of truth for frontend structure. Use the React/Next.js route tree at the top as the folder structure guide. Each page can be built independently as long as shared components and API contracts are maintained.

For any deviations or additions to this spec, update this document and communicate with the team.
