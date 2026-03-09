# Mass Bail Fund - Infrastructure

AWS infrastructure managed with Terraform. All resources run in `us-east-1`.

## Architecture

```
                          ┌─────────────────────────────┐
                          │        Cloudflare CDN        │
                          │    (DNS, SSL, Caching)       │
                          └──────┬──────────────┬───────┘
                                 │              │
                    app.massbailfund.org   api.massbailfund.org
                                 │              │
                          ┌──────▼──────┐ ┌─────▼──────────────┐
                          │  S3 Bucket  │ │   API Gateway       │
                          │  (Static    │ │   (HTTP API)        │
                          │   Website)  │ │                     │
                          └─────────────┘ └─────┬──────────────┘
                                                │ VPC Link
                                          ┌─────▼──────────────┐
                                          │   ECS Fargate       │
                                          │   (Django + uWSGI)  │
                                          │   0.5 vCPU / 1 GB   │
                                          └─────┬──────────────┘
                                                │
                                          ┌─────▼──────────────┐
                                          │   RDS PostgreSQL    │
                                          │   16.13 / db.t3.micro │
                                          └────────────────────┘
```

### Components

| Service | Resource | Purpose |
|---------|----------|---------|
| Frontend | S3 + Cloudflare | Static React SPA hosting with CDN |
| API | API Gateway + VPC Link | HTTPS endpoint routing to ECS |
| Backend | ECS Fargate (Spot + On-Demand) | Django application containers |
| Database | RDS PostgreSQL | Primary data store, encrypted, 7-day backups |
| Registry | ECR | Docker image storage with 10-image lifecycle |
| Secrets | Secrets Manager | DATABASE_URL, DJANGO_SECRET_KEY |
| DNS | Cloud Map | Internal service discovery for API Gateway → ECS |
| Logs | CloudWatch | Container logs with 30-day retention |

## Directory Structure

```
infrastructure/
├── Makefile                         # Terraform commands
├── environments/
│   ├── shared/                      # Resources shared across environments
│   │   ├── main.tf                  # IAM roles, S3 state bucket, DynamoDB lock
│   │   ├── backend.tf               # S3 remote state config
│   │   └── terraform.tfvars
│   └── production/                  # Production environment
│       ├── main.tf                  # All module instantiations
│       ├── backend.tf               # S3 remote state config
│       ├── variables.tf
│       ├── outputs.tf
│       └── terraform.tfvars         # Account ID, VPC CIDR, instance sizes
└── modules/                         # Reusable Terraform modules
    ├── networking/                  # VPC, subnets, internet gateway, route tables
    ├── security-groups/             # ECS and RDS security groups
    ├── ecr/                         # Container registry
    ├── ecs-cluster/                 # Fargate cluster with capacity providers
    ├── ecs-service/                 # Task definitions and services
    ├── rds/                         # PostgreSQL instance
    ├── api-gateway/                 # HTTP API, VPC Link, Cloud Map, ACM cert
    └── s3-website/                  # S3 static website bucket
```

## Make Commands

```bash
make plan                  # Terraform plan (production)
make apply                 # Terraform apply (production)
make plan ENV=shared       # Plan for shared environment
make validate              # Validate all environments
make fmt                   # Format all Terraform files
make state                 # List resources in state
make output                # Show outputs
```

## Scaling Operations

### Scaling ECS (CPU, memory, or container count)

Edit `infrastructure/environments/production/main.tf` in the `ecs_web` module:

```hcl
module "ecs_web" {
  # ...
  task_cpu      = 512    # CPU units (256 = 0.25 vCPU, 512 = 0.5, 1024 = 1)
  task_memory   = 1024   # MB (must be compatible with CPU — see AWS docs)
  desired_count = 1      # Number of running containers
}
```

After changing, run `make plan` to preview, then `make apply` (or push to `main` for CI/CD).

**Common Fargate CPU/memory combinations:**

| CPU (units) | Memory (MB) options |
|-------------|-------------------|
| 256 | 512, 1024, 2048 |
| 512 | 1024, 2048, 3072, 4096 |
| 1024 | 2048, 3072, 4096, 5120, 6144, 7168, 8192 |

### Scaling RDS (instance class or storage)

Edit `infrastructure/environments/production/terraform.tfvars`:

```hcl
rds_instance_class    = "db.t3.small"   # Upgrade from db.t3.micro
rds_allocated_storage = 40              # Increase from 20 GB
```

**Note:** Changing instance class causes a few minutes of downtime during the modification window. Storage can only be increased, never decreased.

**Common RDS instance classes:**

| Class | vCPU | RAM | Monthly cost (approx) |
|-------|------|-----|----------------------|
| db.t3.micro | 2 | 1 GB | ~$15 |
| db.t3.small | 2 | 2 GB | ~$30 |
| db.t3.medium | 2 | 4 GB | ~$60 |

### Adding a new secret

1. Create the secret in AWS Secrets Manager:
   ```bash
   aws secretsmanager create-secret \
     --name mbf/production/MY_NEW_SECRET \
     --secret-string "the-value"
   ```

2. Get the full ARN:
   ```bash
   aws secretsmanager describe-secret --secret-id mbf/production/MY_NEW_SECRET --query ARN --output text
   ```

3. Add it to the ECS service in `environments/production/main.tf`:
   ```hcl
   secrets = {
     DATABASE_URL      = "arn:aws:secretsmanager:..."
     DJANGO_SECRET_KEY = "arn:aws:secretsmanager:..."
     MY_NEW_SECRET     = "arn:aws:secretsmanager:...full-arn-here"
   }
   ```

4. Apply the change — this creates a new task definition revision and redeploys.

5. Read it in Django: `os.getenv("MY_NEW_SECRET")`

### Adding a custom domain (Cloudflare + ACM)

When ready to use `api.massbailfund.org` and `app.massbailfund.org`:

1. Add `domain_name = "api.massbailfund.org"` back to the `api_gateway` module in `environments/production/main.tf`
2. Apply — Terraform creates an ACM certificate
3. Add the ACM DNS validation CNAME record in Cloudflare (shown in `terraform output`)
4. Once validated, Terraform creates the API Gateway custom domain and mapping
5. Add DNS records in Cloudflare pointing to the API Gateway and S3 endpoints
6. See `docs/cloudflare-setup.md` for detailed Cloudflare configuration

## Cost Breakdown

Approximate monthly costs at current configuration:

| Resource | Cost |
|----------|------|
| ECS Fargate (0.5 vCPU, 1 GB, Spot-weighted) | ~$10-15 |
| RDS db.t3.micro (20 GB gp3) | ~$15 |
| API Gateway | ~$1 (per million requests) |
| S3 | < $1 |
| Secrets Manager | < $1 |
| CloudWatch Logs | < $1 |
| ECR | < $1 |
| **Total** | **~$25-35** |

## Terraform State

State is stored remotely in S3 with DynamoDB locking:

- **Bucket:** `massbailfund-terraform-state`
- **Lock table:** `tf-remote-state-lock`
- **State files:** `shared/terraform.tfstate`, `production/terraform.tfstate`

Never edit state manually. Use `terraform state` commands if you need to move or remove resources.
