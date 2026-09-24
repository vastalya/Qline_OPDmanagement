# Qline Backend

This folder contains the Express API, MongoDB models, Socket.IO server, services, middleware, and background workers for Qline.

## Main Responsibilities

- authentication and session handling
- doctor schedule and availability management
- appointment booking and rescheduling
- live queue control
- medical record management
- notifications, email, reminders, and analytics jobs
- admin operations, support tickets, and audit logs

## Key Entry Points

- `server.js` - API server and Socket.IO bootstrap
- `routes/` - endpoint definitions
- `controllers/` - request handlers
- `services/` - business logic
- `models/` - MongoDB schema definitions
- `workers/` - background job processors

## Run Locally

```bash
cd backend
npm install
npm run dev
```

Optional worker process:

```bash
npm run worker
```

## Documentation

- [Main repository README](../README.md)
- [Backend API reference](../docs/detailed%20documents/04-backend-api-reference.md)
- [Database structure](../docs/detailed%20documents/05-database-structure.md)
- [System workflow and core functions](../docs/detailed%20documents/06-system-workflow-and-core-functions.md)
