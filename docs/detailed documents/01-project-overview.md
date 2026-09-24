# Qline Project Overview

## Project Summary

Qline is a full-stack OPD queue and appointment management system designed to reduce waiting confusion and improve coordination between patients, doctors, and administrators. The project combines booking, token-based queue handling, real-time updates, medical record access, notifications, and analytics in one platform.

## Main Objectives

- let patients discover doctors and book available slots
- let doctors manage live OPD queues with controlled token flow
- let administrators monitor activity, users, doctors, settings, and audit logs
- preserve medical information securely in MongoDB
- provide real-time queue visibility through Socket.IO

## User Roles

### Patient

- registers and logs in
- browses doctors and available slots
- books, views, reschedules, or cancels appointments
- tracks live queue status and wait information
- reads personal notifications
- views personal medical records and profile settings

### Doctor

- configures schedule, working hours, breaks, and capacity
- updates temporary availability or leave periods
- views daily appointments
- runs the live queue by calling next, completing, pausing, resuming, and marking no-show
- sets appointment priority for emergency and senior cases
- creates and updates medical records
- monitors analytics and patient history

### Admin

- views system-wide stats
- manages doctors and users
- monitors live queues
- reviews analytics and audit logs
- updates system settings
- reviews support-facing operations through admin pages

## High-Level Architecture

### Frontend

- Next.js 14 application in `frontend/`
- role-based routing and route guarding through Next middleware
- authenticated state managed through access tokens plus refresh-cookie session restoration
- real-time updates consumed with Socket.IO client hooks and contexts

### Backend

- Express API in `backend/`
- JWT-based authentication and role-based access control
- MongoDB models for users, appointments, queues, records, notifications, analytics, logs, and support
- service layer for slot generation, queue flow, analytics, notifications, and doctor availability handling
- Socket.IO server for live queue updates

### Background Processing

- MongoDB-backed job queue
- workers for email, reminders, notifications, and analytics
- no Redis dependency in the current runtime

## Major Functional Areas

- Authentication and session management
- Doctor schedule configuration and slot generation
- Appointment booking and rebooking
- Daily queue management
- Medical record creation and retrieval
- Real-time notifications and reminders
- Admin oversight and auditing
- Queue analytics and reporting

## Repository Map

```text
frontend/   UI pages, contexts, hooks, API client, reusable components
backend/    API routes, controllers, models, services, workers, middleware
docs/       reports and structured project documentation
deploy/     infrastructure support files
.github/    CI workflows
```

## Evaluator Quick Notes

- frontend live app: <https://qline-frontend-pv2l.onrender.com>
- backend live API: <https://qline-api.onrender.com/>
- backend health endpoint: <https://qline-api.onrender.com/health>
- presentation: <https://1drv.ms/p/c/54b9ce31ac5c8a9e/IQDOoQ9AEnn8RpqPR4FY1lwZAeJ7igg49jWQ8KS6HAmKVgw?e=BgGhD3>

For detailed references, continue with:

- [Links And Deployments](02-links-and-deployments.md)
- [Frontend Pages And Role Guide](03-frontend-pages-and-role-guide.md)
- [Backend API Reference](04-backend-api-reference.md)
- [Database Structure](05-database-structure.md)
- [System Workflow And Core Functions](06-system-workflow-and-core-functions.md)
