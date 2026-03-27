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

variable "throttling_burst_limit" {
  description = "Maximum concurrent requests API Gateway will serve before returning 429"
  type        = number
  default     = 100
}

variable "throttling_rate_limit" {
  description = "Steady-state requests per second API Gateway will serve before returning 429"
  type        = number
  default     = 50
}

variable "tags" {
  type    = map(string)
  default = {}
}
