# Mass Bail Fund - Pretrial System Map

## Project Overview
Interactive map of the Massachusetts pretrial incarceration system for the Mass Bail Fund nonprofit. Visualizes mechanisms, decision makers, and institutions in the pretrial process.

## Architecture
- **Frontend:** React + TypeScript (Vite), deployed to S3 via GitHub Actions
- **Backend:** Django 6.0 + DRF, PostgreSQL 16, uWSGI, deployed to ECS Fargate via GitHub Actions
- **Infrastructure:** Terraform (AWS), managed via GitHub Actions with manual apply approval
- **CDN/SSL:** Cloudflare (Free plan, Full Strict SSL planned)
- **CI/CD:** GitHub Actions with path-filtered workflows

## Key Commands

### Backend (`backend-server/`)
- `make up` — start local dev containers (Django + Postgres + pgAdmin)
- `make down` — stop containers
- `make test` — run pytest
- `make migrations` — create Django migrations
- `make migrate` — apply migrations
- `pytest` — run tests directly (needs DATABASE_URL and ENV_CONFIG=test)

### Frontend (`frontend-client/`)
- `npm run dev` — start Vite dev server
- `npm run dev:local` — dev server pointing at local backend (port 8090)
- `npm run build` — production build (tsc + vite)
- `npm run lint` — ESLint

### Infrastructure (`infrastructure/`)
- `make plan` — terraform plan (production)
- `make apply` — terraform apply (production)
- `make validate` — validate all environments
- `make fmt` — format terraform files

## Environment Configuration
- `ENV_CONFIG` controls Django settings: `dev`, `test`, `production`
- Backend uses `DATABASE_URL` env var for database connection
- Frontend uses `VITE_API_DOMAIN_URL` for API base URL

## AWS Resources
- ECS Fargate (0.5 vCPU, 1GB RAM) with Spot + on-demand fallback
- RDS PostgreSQL db.t3.micro (20GB, max 40GB)
- API Gateway HTTP API with custom domain (api.massbailfund.org)
- S3 static website (app.massbailfund.org)
- ECR for Docker images

## Code Style
- Backend: Django conventions, DRF serializers/viewsets
- Frontend: TypeScript, functional React components
- Terraform: modular structure under `infrastructure/modules/`
- Commits: conventional commit style (feat:, fix:, refactor:)
