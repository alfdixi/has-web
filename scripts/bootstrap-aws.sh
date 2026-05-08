#!/usr/bin/env bash
# Bootstrap AWS infra for haslife.org.
#
# Two-stage flow because the domain is registered outside Route53:
#   Stage 1 — create the hosted zone, get nameservers, point your registrar at them.
#   Stage 2 — apply the rest (ACM, S3, CloudFront). ACM validation needs DNS to be live.
#
# Usage:
#   ./scripts/bootstrap-aws.sh stage1
#   # → copy the NS values into your registrar; wait 5–30 min for propagation
#   ./scripts/bootstrap-aws.sh stage2
#
# Requires: terraform >= 1.6, aws CLI v2, profile 'dixi' configured.

set -euo pipefail
cd "$(dirname "$0")/.."

STAGE="${1:-help}"

case "$STAGE" in
  stage1)
    echo "→ Stage 1: creating Route53 hosted zone for haslife.org"
    cd infra
    if [ ! -f terraform.tfvars ]; then
      echo "  Creating terraform.tfvars from example"
      cp terraform.tfvars.example terraform.tfvars
    fi
    terraform init
    terraform apply -target=aws_route53_zone.main
    echo ""
    echo "▶ Copy these NS values into your domain registrar for haslife.org:"
    terraform output -json route53_nameservers | jq -r '.[]'
    echo ""
    echo "Wait 5–30 min for DNS propagation, then run: $0 stage2"
    ;;
  stage2)
    echo "→ Stage 2: provisioning ACM, S3, CloudFront, DNS records"
    cd infra
    terraform apply
    echo ""
    echo "▶ Distribution domain (works before DNS resolves):"
    terraform output -raw cloudfront_domain_name
    echo ""
    echo "When DNS resolves, deploy with: pnpm deploy"
    ;;
  destroy)
    echo "⚠ Destroying ALL HAS-Life AWS infra. Are you sure? [y/N]"
    read -r confirm
    if [ "$confirm" = "y" ]; then
      cd infra && terraform destroy
    else
      echo "Cancelled"
    fi
    ;;
  *)
    echo "Usage: $0 {stage1|stage2|destroy}"
    echo "  stage1   create hosted zone, output NS"
    echo "  stage2   apply rest (ACM + S3 + CloudFront)"
    echo "  destroy  tear it all down (with confirm)"
    exit 1
    ;;
esac
