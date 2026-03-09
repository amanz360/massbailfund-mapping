variable "environment" {
  type = string
}

variable "name" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "subnet_ids" {
  type = list(string)
}

variable "security_group_ids" {
  type = list(string)
}

variable "domain_name" {
  description = "Custom domain name for the API (e.g., api.massbailfund.org)"
  type        = string
  default     = null
}

variable "tags" {
  type    = map(string)
  default = {}
}
