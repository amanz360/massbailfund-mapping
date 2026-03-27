################################################################################
# API Gateway HTTP API
################################################################################

resource "aws_apigatewayv2_api" "main" {
  name          = var.name
  protocol_type = "HTTP"

  tags = merge(var.tags, {
    Name = var.name
  })
}

################################################################################
# VPC Link (for private integration with ECS)
################################################################################

resource "aws_apigatewayv2_vpc_link" "main" {
  name               = "${var.name}-vpc-link"
  security_group_ids = var.security_group_ids
  subnet_ids         = var.subnet_ids

  tags = merge(var.tags, {
    Name = "${var.name}-vpc-link"
  })
}

################################################################################
# Service Discovery Namespace (Cloud Map)
################################################################################

resource "aws_service_discovery_private_dns_namespace" "main" {
  name = "${var.environment}.local"
  vpc  = var.vpc_id

  tags = merge(var.tags, {
    Name = "${var.environment}.local"
  })
}

resource "aws_service_discovery_service" "web" {
  name = "web"

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.main.id

    dns_records {
      ttl  = 10
      type = "SRV"
    }

    routing_policy = "MULTIVALUE"
  }

  health_check_custom_config {
    failure_threshold = 1
  }
}

################################################################################
# Integration (VPC Link -> Cloud Map)
################################################################################

resource "aws_apigatewayv2_integration" "web" {
  api_id             = aws_apigatewayv2_api.main.id
  integration_type   = "HTTP_PROXY"
  integration_uri    = aws_service_discovery_service.web.arn
  integration_method = "ANY"
  connection_type    = "VPC_LINK"
  connection_id      = aws_apigatewayv2_vpc_link.main.id
}

################################################################################
# Default Route (catch-all)
################################################################################

resource "aws_apigatewayv2_route" "default" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "$default"
  target    = "integrations/${aws_apigatewayv2_integration.web.id}"
}

################################################################################
# Stage (auto-deploy)
################################################################################

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.main.id
  name        = "$default"
  auto_deploy = true

  default_route_settings {
    throttling_burst_limit = var.throttling_burst_limit
    throttling_rate_limit  = var.throttling_rate_limit
  }

  tags = merge(var.tags, {
    Name = "${var.name}-default-stage"
  })
}

################################################################################
# ACM Certificate + Custom Domain (for Cloudflare Full Strict SSL)
################################################################################

resource "aws_acm_certificate" "api" {
  count = var.domain_name != null ? 1 : 0

  domain_name       = var.domain_name
  validation_method = "DNS"

  tags = merge(var.tags, {
    Name = var.domain_name
  })

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_acm_certificate_validation" "api" {
  count = var.domain_name != null ? 1 : 0

  certificate_arn = aws_acm_certificate.api[0].arn

  timeouts {
    create = "10m"
  }
}

resource "aws_apigatewayv2_domain_name" "api" {
  count = var.domain_name != null ? 1 : 0

  domain_name = var.domain_name

  domain_name_configuration {
    certificate_arn = aws_acm_certificate_validation.api[0].certificate_arn
    endpoint_type   = "REGIONAL"
    security_policy = "TLS_1_2"
  }

  tags = merge(var.tags, {
    Name = var.domain_name
  })
}

resource "aws_apigatewayv2_api_mapping" "api" {
  count = var.domain_name != null ? 1 : 0

  api_id      = aws_apigatewayv2_api.main.id
  domain_name = aws_apigatewayv2_domain_name.api[0].domain_name
  stage       = aws_apigatewayv2_stage.default.id
}
