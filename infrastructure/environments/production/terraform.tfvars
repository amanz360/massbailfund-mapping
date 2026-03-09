aws_account_id = "672920784568"

vpc_cidr = "172.31.0.0/16"
public_subnets = [
  { cidr = "172.31.1.0/24", availability_zone = "us-east-1a" },
  { cidr = "172.31.2.0/24", availability_zone = "us-east-1b" },
]

rds_instance_class    = "db.t3.micro"
rds_allocated_storage = 20
rds_allowed_cidrs     = [] # Add your IP: ["YOUR_IP/32"]

# From shared environment outputs
ecs_task_execution_role_arn = "arn:aws:iam::672920784568:role/ecsTaskExecutionRole"
ecs_task_role_arn           = "arn:aws:iam::672920784568:role/ecsTaskRole"
