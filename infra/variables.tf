variable "aws_profile" {
  description = "AWS CLI profile to use (e.g. dixi)"
  type        = string
  default     = "dixi"
}

variable "aws_region" {
  description = "Primary AWS region for the bucket. CloudFront/ACM live in us-east-1 regardless."
  type        = string
  default     = "us-east-1"
}

variable "domain" {
  description = "Apex domain for the site"
  type        = string
  default     = "haslife.org"
}

variable "extra_aliases" {
  description = "Additional aliases for the CloudFront distribution. www.<domain> is added by default."
  type        = list(string)
  default     = []
}

variable "bucket_name" {
  description = "Globally unique S3 bucket name. Defaults to <domain>-website."
  type        = string
  default     = ""
}

variable "supported_locales" {
  description = "Locales supported by the site. Order matters for fallback."
  type        = list(string)
  default     = ["es", "en", "pt", "fr", "it", "de", "ru", "ja", "zh", "hi", "ar"]
}

variable "default_locale" {
  description = "Locale to use when Accept-Language has no match."
  type        = string
  default     = "en"
}

variable "tags" {
  description = "Default resource tags."
  type        = map(string)
  default = {
    Project   = "haslife"
    Component = "web"
    ManagedBy = "terraform"
  }
}

variable "billing_alert_email" {
  description = "Email that receives AWS Budgets alerts for haslife.org (warning at $5, critical at $20)."
  type        = string
  default     = "acastillejos@dixi-project.com"
}

variable "billing_alert_warning_usd" {
  description = "USD threshold for the early-warning budget alarm."
  type        = number
  default     = 5
}

variable "billing_alert_critical_usd" {
  description = "USD threshold for the critical budget alarm (panic ceiling)."
  type        = number
  default     = 20
}
