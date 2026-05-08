provider "aws" {
  profile = var.aws_profile
  region  = var.aws_region
  default_tags { tags = var.tags }
}

# CloudFront and ACM certificates for CloudFront distributions MUST live in us-east-1.
provider "aws" {
  alias   = "us_east_1"
  profile = var.aws_profile
  region  = "us-east-1"
  default_tags { tags = var.tags }
}

locals {
  domain      = var.domain
  www_domain  = "www.${var.domain}"
  bucket_name = var.bucket_name != "" ? var.bucket_name : "${replace(var.domain, ".", "-")}-website"
  all_aliases = concat([local.domain, local.www_domain], var.extra_aliases)
}
