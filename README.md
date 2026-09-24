# Qline

Qline is a role-based OPD queue and appointment management system built for patients, doctors, and administrators. It combines appointment booking, real-time queue updates, medical record management, analytics, notifications, and admin oversight in one full-stack project.

## Live Links

- Frontend: <https://qline-frontend-pv2l.onrender.com>
- Backend API: <https://qline-api.onrender.com/>
- Backend health check: <https://qline-api.onrender.com/health>
- Project presentation: <https://1drv.ms/p/c/54b9ce31ac5c8a9e/IQDOoQ9AEnn8RpqPR4FY1lwZAeJ7igg49jWQ8KS6HAmKVgw?e=BgGhD3>
- Final report document: [docs/QLINE Final Report.docx](docs/QLINE%20Final%20Report.docx)

## What The Project Covers

- Patient portal for registration, doctor discovery, slot booking, live queue tracking, notifications, and medical record access
- Doctor portal for schedule configuration, appointment handling, queue control, patient history review, analytics, and medical record creation
- Admin portal for doctor and user management, live queue monitoring, system analytics, audit logs, support tickets, and settings
- Real-time queue synchronization through Socket.IO
- MongoDB-backed background workers for reminders, email, analytics, and notifications

## Tech Stack

- Frontend: Next.js 14, React 18, Tailwind CSS, Axios, Socket.IO Client
- Backend: Node.js, Express, Mongoose, Socket.IO
- Database: MongoDB
- Security: JWT access tokens, refresh-token sessions, bcrypt, Helmet, rate limiting
- Operations: Render deployment blueprints, PM2, GitHub Actions, Nginx template

## Repository Structure

```text
.
|-- frontend/   Next.js application
|-- backend/    Express API, MongoDB models, workers, services, sockets
|-- docs/       Reports, deployment guides, and evaluator documentation
|-- deploy/     Deployment assets such as Nginx configuration
|-- .github/    CI workflows
```

## Quick Start

### 1. Install dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2. Configure environment variables

Backend uses `backend/.env` or the repo-root `.env`. Frontend uses `frontend/.env.local`.

Minimum backend values:

- `MONGODB_URI`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `MEDICAL_RECORD_ENCRYPTION_KEY`
- `FRONTEND_URL=http://localhost:3000`

Minimum frontend values:

- `NEXT_PUBLIC_API_URL=http://localhost:5000`

### 3. Run locally

Backend API:

```bash
cd backend
npm run dev
```

Frontend:

```bash
cd frontend
npm run dev
```

Optional standalone workers:

```bash
cd backend
npm run worker
```

## Deployment Notes

- Current runtime is MongoDB-only. Redis is not required.
- Docker files remain in the repo as legacy artifacts, but the active deployment flow does not depend on Docker.
- The backend exposes `/` and `/health` for environment verification.
- Render deployment manifests are available in [render.yaml](render.yaml) and [render-paid.yaml](render-paid.yaml).

## Detailed Documentation

Evaluator-oriented documentation lives in [`docs/detailed documents`](docs/detailed%20documents/README.md):

- [Project Overview](docs/detailed%20documents/01-project-overview.md)
- [Links And Deployments](docs/detailed%20documents/02-links-and-deployments.md)
- [Frontend Pages And Roles](docs/detailed%20documents/03-frontend-pages-and-role-guide.md)
- [Backend API Reference](docs/detailed%20documents/04-backend-api-reference.md)
- [Database Structure](docs/detailed%20documents/05-database-structure.md)
- [System Workflow And Core Functions](docs/detailed%20documents/06-system-workflow-and-core-functions.md)

Additional supporting docs:

- [Deployment Guide](docs/DEPLOYMENT.md)
- [Render Deployment Guide](docs/RENDER_DEPLOYMENT.md)
- [Design Document](docs/qline_design_document.md)
- [Product Requirements](docs/qline_product_requirements_document.md)
- [Tech Stack Document](docs/qline_tech_stack_document.md)

## Project Support Files

- [LICENSE](LICENSE)
- [CONTRIBUTING.md](CONTRIBUTING.md)
- [SECURITY.md](SECURITY.md)
- [backend/README.md](backend/README.md)
- [frontend/README.md](frontend/README.md)

## License

This repository is licensed under the ISC License. See [LICENSE](LICENSE).
