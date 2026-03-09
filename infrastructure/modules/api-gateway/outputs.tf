output "api_endpoint" {
  value = aws_apigatewayv2_api.main.api_endpoint
}

output "api_id" {
  value = aws_apigatewayv2_api.main.id
}

output "service_discovery_service_arn" {
  value = aws_service_discovery_service.web.arn
}

output "service_discovery_namespace_id" {
  value = aws_service_discovery_private_dns_namespace.main.id
}

output "acm_certificate_validation_records" {
  description = "DNS records to add in Cloudflare for ACM certificate validation"
  value = var.domain_name != null ? [
    for dvo in aws_acm_certificate.api[0].domain_validation_options : {
      name  = dvo.resource_record_name
      type  = dvo.resource_record_type
      value = dvo.resource_record_value
    }
  ] : []
}

output "custom_domain_target" {
  description = "CNAME target for the custom domain in Cloudflare"
  value       = var.domain_name != null ? aws_apigatewayv2_domain_name.api[0].domain_name_configuration[0].target_domain_name : null
}
