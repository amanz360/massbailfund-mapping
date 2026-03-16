variable "environment" {
  type = string
}

variable "identifier" {
  type = string
}

variable "db_name" {
  type    = string
  default = "massbailfund"
}

variable "engine_version" {
  type    = string
  default = "16.6"
}

variable "instance_class" {
  type    = string
  default = "db.t3.micro"
}

variable "allocated_storage" {
  type    = number
  default = 20
}

variable "max_allocated_storage" {
  type    = number
  default = 40
}

variable "storage_type" {
  type    = string
  default = "gp3"
}

variable "multi_az" {
  type    = bool
  default = false
}

variable "subnet_ids" {
  type = list(string)
}

variable "security_group_ids" {
  type = list(string)
}

variable "publicly_accessible" {
  type    = bool
  default = true
}

variable "force_ssl" {
  type    = bool
  default = true
}

variable "backup_retention_period" {
  type    = number
  default = 7
}

variable "deletion_protection" {
  type    = bool
  default = true
}

variable "password" {
  type      = string
  default   = null
  sensitive = true
}

variable "tags" {
  type    = map(string)
  default = {}
}
