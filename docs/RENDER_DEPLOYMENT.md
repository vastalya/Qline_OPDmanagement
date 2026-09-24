# Render Deployment

Qline can be deployed to Render with three services:

- `qline-frontend`: Next.js web service
- `qline-api`: Express API web service
- `qline-worker`: background worker for async jobs

Use one of these Blueprint files:

- Full setup: [`render.yaml`](/d:/Projects/Qline/render.yaml)
- All-free demo setup: [`render-free.yaml`](/d:/Projects/Qline/render-free.yaml)

## Recommended setup

- Frontend: Render Web Service
- Backend: Render Web Service
- Worker: Render Background Worker
- Database: MongoDB Atlas

This matches the architecture already used in the repo.

## Important pricing note

Render free instances are available for web services, but not for background workers.

If you want the full production-style setup on Render:

- keep `qline-worker`
- keep `RUN_WORKERS_IN_API=false`
- use [`render.yaml`](/d:/Projects/Qline/render.yaml)

If you want the cheapest demo setup:

- do not create the worker service
- set backend `RUN_WORKERS_IN_API=true`
- use [`render-free.yaml`](/d:/Projects/Qline/render-free.yaml)

That demo setup is simpler and cheaper, but less production-friendly.

## Deploy with Blueprint

1. Push this repo to GitHub.
2. In Render, click `New` -> `Blueprint`.
3. Connect the repository.
4. Render will detect a `render.yaml`-style Blueprint file from the repo.
5. If you want the free demo setup, temporarily rename [`render-free.yaml`](/d:/Projects/Qline/render-free.yaml) to `render.yaml` before connecting the repo, or use the full setup file and remove the worker service manually in Render.
6. Fill the prompted `sync: false` environment variables.
7. Deploy.

## Environment values to provide

Frontend:

- `NEXT_PUBLIC_API_URL`
  - Example: `https://qline-api.onrender.com`

Backend:

- `MONGODB_URI`
- `FRONTEND_URL`
  - Example: `https://qline-frontend.onrender.com`
- `FROM_EMAIL`
- Optional mail settings:
  - `SENDGRID_API_KEY`
  - or `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`
- Optional monitoring:
  - `SENTRY_DSN`
- Optional admin restriction:
  - `ADMIN_IP_WHITELIST`

Worker:

- Reuse the same backend secrets and database values.

Free demo setup:

- No separate worker service is created.
- The backend runs embedded workers because `RUN_WORKERS_IN_API=true`.

## Auth and CORS notes

This app uses credentialed requests and refresh cookies, so do not switch CORS to `origin: "*"`.

Relevant code:

- [backend/server.js](/d:/Projects/Qline/backend/server.js)
- [frontend/lib/api.js](/d:/Projects/Qline/frontend/lib/api.js)

Set `FRONTEND_URL` exactly to your frontend URL.

## After deploy

Check:

- Backend health: `https://your-backend.onrender.com/health`
- Frontend home page: `https://your-frontend.onrender.com`

If login works but refresh sessions do not, confirm:

- `FRONTEND_URL` matches the frontend origin exactly
- `NEXT_PUBLIC_API_URL` points to the backend
- frontend and backend are using compatible domains
