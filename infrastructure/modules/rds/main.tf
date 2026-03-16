################################################################################
# DB Subnet Group
################################################################################

resource "aws_db_subnet_group" "main" {
  name       = "${var.environment}-rds-subnet-group"
  subnet_ids = var.subnet_ids

  tags = merge(var.tags, {
    Name = "${var.environment}-rds-subnet-group"
  })

  lifecycle {
    create_before_destroy = true
  }
}

################################################################################
# Parameter Group
################################################################################

resource "aws_db_parameter_group" "main" {
  name        = "mbf-${var.environment}-parameters"
  family      = "postgres16"
  description = "Parameters for mbf ${var.environment} databases"

  parameter {
    name         = "rds.force_ssl"
    value        = var.force_ssl ? "1" : "0"
    apply_method = "immediate"
  }

  tags = merge(var.tags, {
    Name = "mbf-${var.environment}-parameters"
  })

  lifecycle {
    create_before_destroy = true
  }
}

################################################################################
# RDS Instance
################################################################################

resource "aws_db_instance" "main" {
  identifier = var.identifier

  engine         = "postgres"
  engine_version = var.engine_version
  instance_class = var.instance_class

  allocated_storage     = var.allocated_storage
  max_allocated_storage = var.max_allocated_storage
  storage_type          = var.storage_type
  storage_encrypted     = true

  db_name  = var.db_name
  username = "postgres"
  port     = 5432

  password = var.password

  multi_az               = var.multi_az
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = var.security_group_ids
  publicly_accessible    = var.publicly_accessible

  parameter_group_name = aws_db_parameter_group.main.name

  backup_retention_period = var.backup_retention_period
  copy_tags_to_snapshot   = true

  deletion_protection       = var.deletion_protection
  skip_final_snapshot       = false
  final_snapshot_identifier = "${var.identifier}-final-snapshot"

  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
  auto_minor_version_upgrade      = false

  tags = merge(var.tags, {
    Name = var.identifier
  })

  lifecycle {
    ignore_changes = [
      password,
      db_subnet_group_name,
    ]
  }
}
