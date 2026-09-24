# Qline Deployment Guide

Qline is ready to deploy without Docker. The recommended setup is:

- `frontend`: Next.js process on `127.0.0.1:3000`
- `backend`: Express + Socket.IO process on `127.0.0.1:5000`
- `worker`: background job process on the same server
- `MongoDB`: MongoDB Atlas or a managed/local MongoDB instance
- `Nginx`: reverse proxy and TLS termination
- `PM2`: process manager for restart-on-boot and log handling

## 1. Server prerequisites

- Ubuntu/Debian VPS or similar Linux server
- Node.js 20.x
- npm 10+
- PM2: `npm install -g pm2`
- Nginx
- A MongoDB connection string
- A domain name pointed to the server

## 2. Clone and install

```bash
git clone <your-repo-url> /var/www/qline
cd /var/www/qline

cd backend && npm ci
cd ../frontend && npm ci
```

## 3. Configure environment variables

Backend:

```bash
cp backend/.env.example backend/.env
```

Frontend:

```bash
cp frontend/.env.example frontend/.env.production
```

Update these values before starting production:

- `backend/.env`
  - `NODE_ENV=production`
  - `MONGODB_URI`
  - `FRONTEND_URL=https://qline.yourdomain.com`
  - `JWT_SECRET`
  - `JWT_REFRESH_SECRET`
  - `MEDICAL_RECORD_ENCRYPTION_KEY`
  - `FROM_EMAIL`
  - `SENDGRID_API_KEY` or SMTP values if you want real email delivery
- `frontend/.env.production`
  - `NEXT_PUBLIC_API_URL=https://qline.yourdomain.com`

## 4. Build the frontend

```bash
cd /var/www/qline/frontend
npm run build
```

The backend does not need a separate build step.

## 5. Start all processes with PM2

From the repo root:

```bash
cd /var/www/qline
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

Useful PM2 commands:

```bash
pm2 status
pm2 logs qline-api
pm2 logs qline-worker
pm2 logs qline-frontend
pm2 restart ecosystem.config.js --update-env
```

## 6. Configure Nginx

Copy [`deploy/nginx/qline.conf`](/var/www/qline/deploy/nginx/qline.conf) to your Nginx sites directory and replace `qline.yourdomain.com` with your real domain.

Example:

```bash
sudo cp /var/www/qline/deploy/nginx/qline.conf /etc/nginx/sites-available/qline
sudo ln -s /etc/nginx/sites-available/qline /etc/nginx/sites-enabled/qline
sudo nginx -t
sudo systemctl reload nginx
```

Then add HTTPS:

```bash
sudo certbot --nginx -d qline.yourdomain.com
```

## 7. Health checks after deploy

Verify these URLs:

- `https://qline.yourdomain.com/`
- `https://qline.yourdomain.com/health`

Verify PM2:

```bash
pm2 status
pm2 logs --lines 100
```

## Notes

- Run a single backend instance unless you redesign Socket.IO and in-memory caching for multi-instance coordination.
- Keep `RUN_WORKERS_IN_API=false` in production so the dedicated worker handles jobs.
- If you are using MongoDB Atlas, allow your server IP in Atlas network access.
- If you change `NEXT_PUBLIC_API_URL`, rebuild the frontend with `npm run build`.
