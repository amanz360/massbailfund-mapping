################################################################################
# ECS Security Group
################################################################################

resource "aws_security_group" "ecs" {
  name        = "mbf-${var.environment}-ecs-sg"
  description = "Security group for ${var.environment} ECS tasks"
  vpc_id      = var.vpc_id

  tags = merge(var.tags, {
    Name = "mbf-${var.environment}-ecs-sg"
  })

  lifecycle {
    ignore_changes = [name, description]
  }
}

resource "aws_security_group_rule" "ecs_ingress_vpc" {
  type              = "ingress"
  from_port         = 80
  to_port           = 80
  protocol          = "tcp"
  cidr_blocks       = [var.vpc_cidr]
  security_group_id = aws_security_group.ecs.id
  description       = "HTTP from VPC (API Gateway VPC Link)"
}

resource "aws_security_group_rule" "ecs_egress_all" {
  type              = "egress"
  from_port         = 0
  to_port           = 0
  protocol          = "-1"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.ecs.id
  description       = "All outbound traffic"
}

################################################################################
# RDS Security Group
################################################################################

resource "aws_security_group" "rds" {
  name        = "${var.environment}-rds-sg"
  description = "Security group for ${var.environment} RDS"
  vpc_id      = var.vpc_id

  tags = merge(var.tags, {
    Name = "${var.environment}-rds-sg"
  })

  lifecycle {
    ignore_changes = [name, description]
  }
}

resource "aws_security_group_rule" "rds_ingress_ecs" {
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.ecs.id
  security_group_id        = aws_security_group.rds.id
  description              = "PostgreSQL from ECS tasks"
}

resource "aws_security_group_rule" "rds_ingress_allowed_cidrs" {
  count = length(var.rds_allowed_cidrs) > 0 ? 1 : 0

  type              = "ingress"
  from_port         = 5432
  to_port           = 5432
  protocol          = "tcp"
  cidr_blocks       = var.rds_allowed_cidrs
  security_group_id = aws_security_group.rds.id
  description       = "PostgreSQL from allowed IPs (developers)"
}

resource "aws_security_group_rule" "rds_egress_all" {
  type              = "egress"
  from_port         = 0
  to_port           = 0
  protocol          = "-1"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.rds.id
  description       = "All outbound traffic"
}
