# Qline Links And Deployments

## External Project Links

| Resource | Link | Purpose |
| --- | --- | --- |
| Frontend live app | <https://qline-frontend-pv2l.onrender.com> | Public deployment of the Next.js client |
| Backend API | <https://qline-api.onrender.com/> | Public deployment of the Express API |
| Backend health check | <https://qline-api.onrender.com/health> | Quick status verification for deployment |
| Project presentation | <https://1drv.ms/p/c/54b9ce31ac5c8a9e/IQDOoQ9AEnn8RpqPR4FY1lwZAeJ7igg49jWQ8KS6HAmKVgw?e=BgGhD3> | PPT / presentation link |

## Internal Repository Documents

| Resource | Path | Purpose |
| --- | --- | --- |
| Final report document | [docs/QLINE Final Report.docx](../QLINE%20Final%20Report.docx) | Submitted main report document |
| Main README | [README.md](../../README.md) | Top-level project summary |
| Deployment guide | [docs/DEPLOYMENT.md](../DEPLOYMENT.md) | General deployment instructions |
| Render deployment guide | [docs/RENDER_DEPLOYMENT.md](../RENDER_DEPLOYMENT.md) | Render-specific deployment notes |
| Design document | [docs/qline_design_document.md](../qline_design_document.md) | System design background |
| Product requirements | [docs/qline_product_requirements_document.md](../qline_product_requirements_document.md) | Scope and requirement notes |
| Tech stack document | [docs/qline_tech_stack_document.md](../qline_tech_stack_document.md) | Stack summary |

## Deployment Assets In The Repo

| File | Purpose |
| --- | --- |
| [render.yaml](../../render.yaml) | Render blueprint for deployment |
| [render-paid.yaml](../../render-paid.yaml) | Alternate Render configuration |
| [ecosystem.config.js](../../ecosystem.config.js) | PM2 process definitions |
| [deploy/nginx/qline.conf](../../deploy/nginx/qline.conf) | Nginx reverse-proxy template |
| [.github/workflows/backend.yml](../../.github/workflows/backend.yml) | Backend CI workflow |
| [.github/workflows/frontend.yml](../../.github/workflows/frontend.yml) | Frontend CI workflow |

## Runtime Service Map

| Service | URL / Path | Notes |
| --- | --- | --- |
| Frontend root | <https://qline-frontend-pv2l.onrender.com> | Next.js application |
| Backend root | <https://qline-api.onrender.com/> | API information endpoint |
| Health endpoint | <https://qline-api.onrender.com/health> | MongoDB and service health |
| WebSocket server | Same backend origin | Socket.IO runs on the backend API service |

## Deployment Notes

- Frontend expects `NEXT_PUBLIC_API_URL` to point to the backend service.
- Backend expects `FRONTEND_URL` to allow frontend origin access through CORS.
- The current project runs without Redis.
- Workers can run embedded in the API during development or as a standalone process in production.
