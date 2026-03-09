variable "bucket_name" {
  type = string
}

variable "cors_allowed_origins" {
  description = "Origins allowed to fetch media via CORS"
  type        = list(string)
  default     = ["*"]
}

variable "tags" {
  type    = map(string)
  default = {}
}
