################################################################################
# Networking
################################################################################

module "networking" {
  source = "../../modules/networking"

  environment          = var.environment
  vpc_cidr             = var.vpc_cidr
  public_subnets       = var.public_subnets
  enable_dns_hostnames = true
  enable_dns_support   = true
}

################################################################################
# ECR Repository
################################################################################

module "ecr" {
  source = "../../modules/ecr"

  repositories = [
    "mbf-${var.environment}-web",
  ]
}

################################################################################
# Security Groups
################################################################################

module "security_groups" {
  source = "../../modules/security-groups"

  environment       = var.environment
  vpc_id            = module.networking.vpc_id
  vpc_cidr          = module.networking.vpc_cidr
  rds_allowed_cidrs = var.rds_allowed_cidrs
}

################################################################################
# RDS
################################################################################

module "rds" {
  source = "../../modules/rds"

  environment       = var.environment
  identifier        = "${var.environment}-rds"
  db_name           = "massbailfund"
  engine_version    = "16.13"
  instance_class    = var.rds_instance_class
  allocated_storage = var.rds_allocated_storage

  subnet_ids         = module.networking.public_subnet_ids
  security_group_ids = [module.security_groups.rds_security_group_id]

  publicly_accessible = var.rds_publicly_accessible
  deletion_protection = true
}

################################################################################
# API Gateway
################################################################################

module "api_gateway" {
  source = "../../modules/api-gateway"

  environment        = var.environment
  name               = "mbf-${var.environment}-api"
  vpc_id             = module.networking.vpc_id
  subnet_ids         = module.networking.public_subnet_ids
  security_group_ids = [module.security_groups.ecs_security_group_id]
}

################################################################################
# ECS Cluster
################################################################################

module "ecs_cluster" {
  source = "../../modules/ecs-cluster"

  environment        = var.environment
  name               = "mbf-${var.environment}"
  container_insights = false
}

################################################################################
# ECS Web Service
################################################################################

module "ecs_web" {
  source = "../../modules/ecs-service"

  environment  = var.environment
  service_name = "web"
  cluster_arn  = module.ecs_cluster.cluster_arn

  task_cpu    = 512
  task_memory = 1024

  container_image = "${var.aws_account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/mbf-${var.environment}-web"
  container_port  = 80
  desired_count   = 1

  subnet_ids         = module.networking.public_subnet_ids
  security_group_ids = [module.security_groups.ecs_security_group_id]

  target_group_arn     = null
  service_registry_arn = module.api_gateway.service_discovery_service_arn

  execution_role_arn = var.ecs_task_execution_role_arn
  task_role_arn      = var.ecs_task_role_arn

  environment_variables = {
    RUN_MODE                = "web"
    ENV_CONFIG              = var.environment
    PGSSLMODE               = "require"
    AWS_STORAGE_BUCKET_NAME = module.s3_media.bucket_id
    AWS_S3_REGION_NAME      = var.aws_region
  }

  secrets = {
    DATABASE_URL      = "arn:aws:secretsmanager:us-east-1:672920784568:secret:mbf/production/DATABASE_URL-P8Tuem"
    DJANGO_SECRET_KEY = "arn:aws:secretsmanager:us-east-1:672920784568:secret:mbf/production/DJANGO_SECRET_KEY-cHH3g5"
  }

  aws_region = var.aws_region
}

################################################################################
# S3 Media Bucket (uploaded images)
################################################################################

module "s3_media" {
  source = "../../modules/s3-media"

  bucket_name = "mbf-${var.environment}-media"

  cors_allowed_origins = [
    "http://app.massbailfund.org.s3-website-us-east-1.amazonaws.com",
    "https://app.massbailfund.org",
  ]
}

################################################################################
# S3 Website Bucket
################################################################################

module "s3_website" {
  source = "../../modules/s3-website"

  bucket_name = "app.massbailfund.org"
}
