terraform {
  backend "s3" {
    bucket         = "massbailfund-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "tf-remote-state-lock"
  }
}
