# Mass Bail Fund - Backend Server

Django REST API powered by Django 6.0, Django REST Framework, and PostgreSQL.

## Prerequisites

Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes Docker Engine and Docker Compose).

Verify installation:

```bash
docker --version
docker-compose --version
```

You also need `make` installed:

- **macOS:** Comes pre-installed with Xcode Command Line Tools (`xcode-select --install`)
- **Ubuntu/Debian:** `sudo apt-get install build-essential`
- **Windows:** Use WSL2 with Ubuntu, then follow the Ubuntu instructions

## Getting Started

1. **Clone the repo and navigate to the backend:**

   ```bash
   cd backend-server
   ```

2. **Build the Docker image:**

   ```bash
   make build-environment
   ```

3. **Start the services:**

   ```bash
   make up
   ```

   This starts three containers:
   - **mbf-appserver** — Django dev server at [http://localhost:8080](http://localhost:8080)
   - **mbf-appserver-db** — PostgreSQL 16.13 at localhost:5434
   - **mbf-db-admin** — pgAdmin at [http://localhost:8082](http://localhost:8082)

   On first startup, the Django dev server automatically runs migrations.

4. **Create a superuser (for admin access):**

   ```bash
   make shell
   ./manage.py createsuperuser
   ```

   Admin panel is at [http://localhost:8080/admin/](http://localhost:8080/admin/).

5. **Verify it's running:**

   ```bash
   curl http://localhost:8080/health
   # ok
   ```

## Makefile Commands

| Command | Description |
|---------|-------------|
| `make build-environment` | Build the dev Docker image |
| `make up` | Start all containers |
| `make down` | Stop all containers |
| `make bdu` | Build + down + up (full restart) |
| `make restart` | Restart the appserver container |
| `make shell` | Open a shell in the appserver |
| `make shell-root` | Open a root shell in the appserver |
| `make migrations` | Run `makemigrations` |
| `make migrate` | Run `migrate` |
| `make test` | Run tests (use `TEST_PATH=path` to target specific tests) |
| `make superuser` | Create a Django superuser (admin access) |

## Project Structure

```
backend-server/
├── massbailfund/              # Django project settings and root URL config
│   ├── settings/
│   │   ├── __init__.py        # Base settings (shared across all environments)
│   │   ├── dev_settings.py    # Local development overrides
│   │   ├── production_settings.py
│   │   └── test_settings.py
│   ├── middleware.py          # Health check middleware
│   ├── urls.py                # Root URL routing
│   └── wsgi.py
├── accounts/                  # User authentication app
│   ├── models/users.py        # Custom User model
│   └── api/auth.py            # Login/Logout endpoints
├── core/                      # Main data app
│   ├── models/entities.py     # All domain models
│   ├── serializers/entities.py # DRF serializers (list, detail, write, graph)
│   ├── api/views.py           # ViewSets and graph endpoint
│   ├── urls.py                # Router registration
│   ├── admin.py               # Admin panel configuration
│   ├── signals.py             # Cache invalidation signals
│   └── tests/
├── docker/
│   ├── Dockerfile-Environment # Base image with Python dependencies
│   ├── Dockerfile-Deploy      # Production image (collectstatic, whitenoise)
│   └── compose-local.yml      # Local dev: Django + Postgres + pgAdmin
└── uwsgi.ini                 # Production uWSGI config
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check |
| `GET /api/v1/mechanisms/` | List/detail mechanisms with references, quotes, timeline |
| `GET /api/v1/decision-makers/` | List/detail decision makers with roles and aliases |
| `GET /api/v1/institutions/` | List/detail institutions with memberships |
| `GET /api/v1/mechanism-roles/` | Mechanism-to-decision-maker relationships |
| `GET /api/v1/graph/` | Full graph payload (nodes + edges) for the system map |
| `GET /api/v1/glossary/` | Glossary terms linked to mechanisms |
| `GET /api/v1/resources/` | Resources (use `?general=true` for mechanism-independent) |
| `GET /api/docs/` | Swagger UI |
| `GET /api/schema/` | OpenAPI schema |

All read endpoints are public. Write endpoints (POST/PUT/PATCH/DELETE) require admin authentication.

## Common Modifications

### Adding a new model

1. Define the model in `core/models/entities.py`, inheriting from `BaseModel`
2. Add it to `core/models/__init__.py` exports
3. Create serializers in `core/serializers/entities.py` — typically a list, detail, and write serializer
4. Create a ViewSet in `core/api/views.py` inheriting from `PublicReadAdminWriteViewSet`
5. Export the ViewSet from `core/api/__init__.py`
6. Register the route in `core/urls.py` via `router.register()`
7. Register in `core/admin.py` for the admin panel
8. Generate and apply migrations:
   ```bash
   make migrations
   make migrate
   ```

### Adding a field to an existing model

1. Add the field in `core/models/entities.py`
2. Add the field to the relevant serializer(s) in `core/serializers/entities.py`
3. Generate and apply migrations:
   ```bash
   make migrations
   make migrate
   ```

### Adding a new API endpoint (non-CRUD)

1. Write a function-based view in `core/api/views.py` using `@api_view` and `@permission_classes`
2. Add the URL pattern to `core/urls.py` in the `urlpatterns` list
3. Export from `core/api/__init__.py` if needed

### Modifying the graph endpoint

The graph endpoint (`/api/v1/graph/`) is built by `GraphSerializer` in `core/serializers/entities.py`. It constructs nodes from Mechanisms, DecisionMakers, and Institutions, and edges from MechanismRoles. Modify `get_graph_data()` to change what data the system map receives.

### Adding a new admin page

Register the model in `core/admin.py` using `@admin.register(MyModel)` with a `ModelAdmin` class. Django's admin auto-generates CRUD forms.

### Managing secrets in production

Secrets are stored in AWS Secrets Manager and injected into the ECS container as environment variables. To add a new secret:

1. Create the secret in AWS Secrets Manager:
   ```bash
   aws secretsmanager create-secret --name mbf/production/MY_SECRET --secret-string "value"
   ```
2. Add the secret ARN to the ECS service's `secrets` block in `infrastructure/environments/production/main.tf`
3. Apply the Terraform change — this creates a new ECS task definition revision
4. Read the secret in Django via `os.getenv("MY_SECRET")`

## Running Tests

```bash
# Run all tests
make test

# Run a specific test file
make test TEST_PATH=core/tests/test_views.py

# Run a specific test
make test TEST_PATH=core/tests/test_views.py::TestMechanismAPI::test_list
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ENV_CONFIG` | Settings profile: `dev`, `test`, `production` | `dev` |
| `DATABASE_URL` | PostgreSQL connection string | Local defaults |
| `DJANGO_SECRET_KEY` | Django secret key | Insecure default (dev only) |
| `SENTRY_DSN` | Sentry error tracking (optional) | None |
| `CORS_ALLOWED_ORIGINS` | Comma-separated allowed origins | None (dev allows all) |

## pgAdmin

Access pgAdmin at [http://localhost:8082](http://localhost:8082):

- **Email:** `admin@massbailfund.org`
- **Password:** `password`

To connect to the database, add a server with:
- **Host:** `mbf-appserver-db`
- **Port:** `5432`
- **Username:** `massbailfund`
- **Password:** `massbailfund`
- **Database:** `massbailfund`

## Troubleshooting

**Containers won't start or DB connection errors:**

Reset the database volume and restart:

```bash
docker-compose -f docker/compose-local.yml down -v
make up
```

**Dependencies changed (pyproject.toml updated):**

Rebuild the environment image:

```bash
make bdu
```

## Learning Resources

If you're new to the backend stack:

- [Django Tutorial](https://docs.djangoproject.com/en/5.1/intro/tutorial01/) — Start here for Django fundamentals
- [Django REST Framework Tutorial](https://www.django-rest-framework.org/tutorial/quickstart/) — Serializers, ViewSets, routers
- [Django Models](https://docs.djangoproject.com/en/5.1/topics/db/models/) — Fields, relationships, migrations
- [DRF Serializers](https://www.django-rest-framework.org/api-guide/serializers/) — How API responses are shaped
- [drf-spectacular](https://drf-spectacular.readthedocs.io/) — OpenAPI schema generation
