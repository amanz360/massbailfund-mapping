# Mass Bail Fund - Pretrial System Map

An interactive visualization of the Massachusetts pretrial incarceration system, built for the [Mass Bail Fund](https://www.massbailfund.org/) nonprofit. The app maps the mechanisms, decision makers, and institutions that shape pretrial outcomes — making the system legible to researchers, advocates, and the public.

## Architecture

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────┐
│   React SPA     │──────▶│  Django API     │──────▶│ PostgreSQL  │
│   (S3 + CDN)    │  HTTP │  (ECS Fargate)  │  SQL  │   (RDS)     │
└─────────────────┘       └─────────────────┘       └─────────────┘
     Vite + TS              DRF + uWSGI               PostgreSQL 16
     MUI + Cytoscape        API Gateway
```

- **Frontend:** React 19, TypeScript, Material UI, Cytoscape.js graph visualization
- **Backend:** Django 6.0, Django REST Framework, uWSGI
- **Database:** PostgreSQL 16
- **Infrastructure:** AWS (ECS Fargate, RDS, S3, API Gateway), managed with Terraform
- **CI/CD:** GitHub Actions with path-filtered workflows per component

## Repository Structure

```
massbailfund-map/
├── frontend-client/    # React SPA — interactive system map and browse views
├── backend-server/     # Django API — data models, REST endpoints, admin
├── infrastructure/     # Terraform — AWS resources, networking, IAM
├── docs/               # Architecture docs, design plans, data model
└── .github/workflows/  # CI/CD — separate pipelines for frontend, backend, infra
```

Each component has its own README with setup instructions and development guides:

- [Frontend Development](frontend-client/README.md)
- [Backend Development](backend-server/README.md)
- [Infrastructure](infrastructure/README.md)

## Live Environment

| Service | URL |
|---------|-----|
| Frontend | http://app.massbailfund.org.s3-website-us-east-1.amazonaws.com |
| API | https://3sbjv34ec0.execute-api.us-east-1.amazonaws.com/health |
| API Docs | https://3sbjv34ec0.execute-api.us-east-1.amazonaws.com/api/docs/ |
| Admin Panel | https://3sbjv34ec0.execute-api.us-east-1.amazonaws.com/admin/ |

## Quick Start

**Full local development** (backend + frontend talking to each other):

```bash
# Terminal 1: Start the backend
cd backend-server
make build-environment
make up
# API available at http://localhost:8080

# Terminal 2: Start the frontend
cd frontend-client
npm install
npm run dev:local
# App available at http://localhost:5174
```

## CI/CD

Pushes to `main` trigger deployments automatically via path-filtered GitHub Actions:

| Path changed | Workflow | What happens |
|---|---|---|
| `backend-server/**` | deploy-backend | Test → Build Docker image → Push to ECR → Deploy to ECS |
| `frontend-client/**` | deploy-frontend | Lint → Build → Sync to S3 |
| `infrastructure/**` | deploy-infrastructure | Validate → Plan → Apply (requires approval) |

All three workflows run independently and in parallel when a single commit touches multiple directories.

## Contributing

- **Branch strategy:** Feature branches off `main`, merge via PR
- **Commit style:** Conventional commits — `feat:`, `fix:`, `refactor:`, `docs:`
- **Code review:** All PRs require review before merge
