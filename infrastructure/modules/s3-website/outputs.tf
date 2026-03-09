output "bucket_id" {
  value = aws_s3_bucket.main.id
}

output "bucket_arn" {
  value = aws_s3_bucket.main.arn
}

output "website_endpoint" {
  value = aws_s3_bucket_website_configuration.main.website_endpoint
}
