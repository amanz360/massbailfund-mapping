variable "environment" {
  type = string
}

variable "name" {
  type = string
}

variable "container_insights" {
  type    = bool
  default = false
}

variable "tags" {
  type    = map(string)
  default = {}
}
