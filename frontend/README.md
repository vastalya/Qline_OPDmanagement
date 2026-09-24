# Qline Frontend

This folder contains the Next.js frontend for Qline.

## Main Responsibilities

- role-based authentication experience
- patient, doctor, and admin dashboards
- doctor discovery and slot booking
- live queue views and notifications
- medical record and profile pages
- route protection through Next middleware

## Key Areas

- `app/` - route-based pages and layouts
- `components/` - reusable UI and feature components
- `contexts/` - auth, toast, and socket state
- `hooks/` - reusable frontend behavior
- `lib/` - API client, utilities, token storage

## Run Locally

```bash
cd frontend
npm install
npm run dev
```

## Documentation

- [Main repository README](../README.md)
- [Frontend pages and role guide](../docs/detailed%20documents/03-frontend-pages-and-role-guide.md)
- [System workflow and core functions](../docs/detailed%20documents/06-system-workflow-and-core-functions.md)
