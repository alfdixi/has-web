output "route53_nameservers" {
  description = "NS records to set on your domain registrar so Route53 can serve the zone."
  value       = aws_route53_zone.main.name_servers
}

output "s3_bucket_name" {
  description = "S3 bucket name where the static site lives."
  value       = aws_s3_bucket.web.id
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID — used for cache invalidations."
  value       = aws_cloudfront_distribution.web.id
}

output "cloudfront_domain_name" {
  description = "CloudFront default domain (xxx.cloudfront.net). Useful for testing before DNS propagation."
  value       = aws_cloudfront_distribution.web.domain_name
}

output "acm_certificate_arn" {
  description = "ARN of the ACM certificate covering the apex and aliases."
  value       = aws_acm_certificate.web.arn
}

output "budget_warning" {
  description = "Warning budget name (alerts when monthly spend crosses the warning threshold)."
  value       = aws_budgets_budget.warning.name
}

output "budget_critical" {
  description = "Critical budget name (panic ceiling)."
  value       = aws_budgets_budget.critical.name
}
