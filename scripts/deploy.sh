#!/usr/bin/env bash
# Build the Next.js export, sync to S3, invalidate CloudFront.
#
# Usage:
#   pnpm deploy
#   AWS_PROFILE=dixi ./scripts/deploy.sh
#
# Reads bucket and distribution id from Terraform outputs.

set -euo pipefail
cd "$(dirname "$0")/.."

PROFILE="${AWS_PROFILE:-dixi}"

if [ ! -d infra/.terraform ]; then
  echo "✗ infra/ not initialized. Run: ./scripts/bootstrap-aws.sh stage1"
  exit 1
fi

BUCKET=$(cd infra && terraform output -raw s3_bucket_name 2>/dev/null || echo "")
DIST_ID=$(cd infra && terraform output -raw cloudfront_distribution_id 2>/dev/null || echo "")

if [ -z "$BUCKET" ] || [ -z "$DIST_ID" ]; then
  echo "✗ Could not read terraform outputs. Run stage2 first."
  exit 1
fi

echo "→ Building static export..."
pnpm build

if [ ! -d out ]; then
  echo "✗ out/ not produced. Check next.config.ts has output: 'export'"
  exit 1
fi

echo "→ Syncing assets (long cache) to s3://$BUCKET ..."
aws s3 sync out/ "s3://$BUCKET/" \
  --profile "$PROFILE" \
  --delete \
  --exclude "*.html" \
  --exclude "*.json" \
  --cache-control "public,max-age=31536000,immutable"

echo "→ Syncing HTML (no cache) ..."
aws s3 sync out/ "s3://$BUCKET/" \
  --profile "$PROFILE" \
  --exclude "*" \
  --include "*.html" \
  --content-type "text/html; charset=utf-8" \
  --cache-control "public,max-age=0,s-maxage=300,must-revalidate"

echo "→ Syncing JSON (short cache) ..."
aws s3 sync out/ "s3://$BUCKET/" \
  --profile "$PROFILE" \
  --exclude "*" \
  --include "*.json" \
  --content-type "application/json; charset=utf-8" \
  --cache-control "public,max-age=300,s-maxage=3600"

echo "→ Invalidating CloudFront $DIST_ID ..."
INV_ID=$(aws cloudfront create-invalidation \
  --distribution-id "$DIST_ID" \
  --paths "/*" \
  --profile "$PROFILE" \
  --query "Invalidation.Id" \
  --output text)

echo "✓ Deployed. Invalidation: $INV_ID"
echo "  https://haslife.org/"
