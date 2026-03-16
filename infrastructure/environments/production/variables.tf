variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "environment" {
  type    = string
  default = "production"
}

variable "aws_account_id" {
  type = string
}

# Networking
variable "vpc_cidr" {
  type = string
}

variable "public_subnets" {
  type = list(object({
    cidr              = string
    availability_zone = string
  }))
}

# RDS
variable "rds_instance_class" {
  type    = string
  default = "db.t3.micro"
}

variable "rds_allocated_storage" {
  type    = number
  default = 20
}

variable "rds_publicly_accessible" {
  type    = bool
  default = true
}

variable "rds_allowed_cidrs" {
  type    = list(string)
  default = []
}

variable "rds_password" {
  type      = string
  default   = null
  sensitive = true
}

# IAM Roles
variable "ecs_task_execution_role_arn" {
  type = string
}

variable "ecs_task_role_arn" {
  type = string
}
