# Networking
output "vpc_id" {
  value = module.networking.vpc_id
}

# Database
output "rds_endpoint" {
  value = module.rds.db_instance_endpoint
}

# API
output "api_gateway_endpoint" {
  value = module.api_gateway.api_endpoint
}

# ECS
output "ecs_cluster_name" {
  value = module.ecs_cluster.cluster_name
}

# Frontend
output "s3_website_endpoint" {
  value = module.s3_website.website_endpoint
}

# ACM Certificate Validation (add these DNS records in Cloudflare)
output "acm_validation_records" {
  value = module.api_gateway.acm_certificate_validation_records
}

# Custom domain CNAME target (use this as the CNAME value for api.massbailfund.org in Cloudflare)
output "api_custom_domain_target" {
  value = module.api_gateway.custom_domain_target
}
